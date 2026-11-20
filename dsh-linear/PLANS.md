# dsh-linear — review-first workflow plan

Status: **implemented** (approved as written). See `docs/DETAIL.md` for the shipped behavior.

## Goal

Turn dsh-linear from a kanban mirror into a **review-first work queue** for AI agents:

- Linear stays the upstream source of truth for issues, cycles, and milestones.
- The plugin owns the local execution loop: pick a task, create a git branch/worktree, run an agent session, commit, submit for review, and let a human approve or reject.
- The human's main screen is **In review**, not a kanban board.
- Git conflicts are prevented by serializing work per cycle and isolating it in a worktree.

## What changes from today

| Today | Proposed |
|---|---|
| Kanban columns Todo / Doing / Done | Review queue + Queue + Done lists, no kanban |
| Sync creates tasks and auto-starts sessions | Sync only mirrors; a cycle must be started before work begins |
| Session works in the linked workspace | Session works in a per-cycle git worktree |
| No commit tracking | Every task stores branch, base SHA, commit SHA, diff stat |
| Done is a local status | Done means approved; review is a separate gate |
| Close cycle deletes tasks | Close cycle keeps history; **Archive done** moves approved tasks to Archive |
| No diff view | Every submitted task has a **View diff** button |
| No review actions | Approve, Reject with reason, Mark reviewed |

## Workflow

### Human

1. **Sync** — pull open issues, cycles, and milestones from Linear.
2. **Start cycle** — choose a cycle and press Start. The host:
   - creates branch `cycles/<number>` from the workspace base branch;
   - creates a git worktree for that cycle;
   - registers the worktree as a DSH workspace so sessions appear there;
   - marks the cycle active.
3. **Watch the queue** — the agent picks tasks in sequence. The human can open the session, see status, and read the task.
4. **Review** — the default tab lists tasks in `in_review`. Each row shows the commit, diff stat, and session. The human can:
   - **View diff** — file list + unified diff;
   - **Mark reviewed** — a lightweight check that the human looked, without deciding;
   - **Approve** — task becomes `done`, next task starts;
   - **Reject** — enter a reason; the task returns to `doing` and the same session gets a fix prompt.
5. **Archive done** — one button moves all approved tasks from Done to the Archive tab.
6. **Close cycle** — only when no task is `doing` or `in_review`. Keeps history and the branch. A separate **Merge cycle** action merges `cycles/<n>` into the base branch.

### AI

1. Host picks the next `todo` task in the active cycle, in sequence.
2. Host creates a session in the cycle worktree with the task, branch, and commit instructions.
3. Agent works, commits with `FAN-123: title`, and calls the `linear_task` tool with `action: submit`.
4. Host validates the worktree is clean, records `HEAD`, computes the diff, and moves the task to `in_review`.
5. If the human rejects, the host sends a follow-up to the same session:
   - fetch the latest base;
   - merge/rebase the cycle branch;
   - fix the reason;
   - commit and submit again.
6. If the session is gone, the host creates a new session in the same worktree with the rejection reason and the latest code.

## Git strategy (conflict avoidance)

- **One active cycle per workspace.** Starting a second cycle asks to close the first.
- **One task in flight per cycle.** The next task starts only after the current task is approved. This is the main conflict guard.
- **Per-cycle worktree.** The agent never edits the human's working tree. Worktree path: `~/.dsh/linear-worktrees/<workspaceId>/cycles-<number>`.
- **Per-cycle branch.** `cycles/<number>` (example `cycles/12`). Base branch is configurable per workspace, default `main` or `origin/HEAD`.
- **Base refresh before each task.** If the base branch advanced, the host merges it into the cycle branch before starting. A conflict marks the cycle `blocked` and notifies the human; no agent starts.
- **No force-push.** Rejections add commits on the same branch. The review diff is always `base_sha..HEAD`.
- **Merge on close.** Closing does not merge automatically. **Merge cycle** runs `git merge --no-ff cycles/<n>` into the base branch and reports conflicts.

## Data model

### New `cycles` table

```sql
CREATE TABLE cycles (
  id TEXT PRIMARY KEY,              -- Linear cycle id
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  number TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL DEFAULT '',
  ends_at TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'idle', -- idle | active | closed | blocked
  branch TEXT NOT NULL DEFAULT '',
  worktree_path TEXT NOT NULL DEFAULT '',
  dsh_workspace_id TEXT NOT NULL DEFAULT '',
  base_branch TEXT NOT NULL DEFAULT '',
  base_sha TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL DEFAULT '',
  closed_at TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT ''
);
```

### New task columns

```sql
ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN sequence INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN branch TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN base_sha TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN commit_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN diff_stat TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN review_state TEXT NOT NULL DEFAULT 'none'; -- none | pending | approved | rejected
ALTER TABLE tasks ADD COLUMN review_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN reviewed_at TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN submitted_at TEXT NOT NULL DEFAULT '';
```

Status values: `backlog`, `todo`, `doing`, `in_review`, `done`, `blocked`, `unassigned`.

## Host API

### Routes

| Route | Method | Purpose |
|---|---|---|
| `/dsh-linear/board` | GET | Tasks, cycles with state, workspaces, config, last sync |
| `/dsh-linear/diff?taskId=` | GET | `{ stat, files, diff }`, bounded and truncated with a marker |
| `/dsh-linear/act` | POST | Existing ops plus the new ops below |

New `act` ops:

- `startCycle { cycleId }`
- `closeCycle { cycleId }`
- `mergeCycle { cycleId }`
- `clearDone`
- `approve { id }`
- `reject { id, reason }`
- `markReviewed { id, reviewed }`
- `openWorktree { cycleId }`

### Agent tool

Register `linear_task` on `ctx.tools`:

- `action: submit` — validate clean worktree, record `HEAD`, compute diff, set `in_review`.
- `action: status` — return the current task, cycle, branch, and last commit.
- `action: blocked` — record a blocker and notify the human.

The tool resolves the task from `exec.agent.session.id` through `tasks.session_id`.

### Session completion fallback

On `turn/end` for a task session:

- if the worktree has a new commit, auto-submit it;
- if not, mark the task `blocked` and notify the human.

This covers agents that forget to call `linear_task submit`.

## UI/UX

No kanban. Compact, review-first.

### Header

- Cycle selector with state badge (`idle`, `active`, `closed`, `blocked`).
- **Sync**, **Start cycle**, **Archive done**, settings.
- Active cycle shows branch and worktree path.

### Tabs

1. **Review** (default) — `in_review` tasks, count badge.
2. **Queue** — `todo` / `doing` / `blocked` in sequence.
3. **Done** — approved tasks with commit and diff.

### Review row

Compact 36px row:

`[Reviewed] FAN-123  Title  ·  cycle  ·  commit abc1234  ·  +42 −7  ·  session  [View diff] [Approve] [Reject]`

- Clicking the row opens the detail panel.
- **View diff** opens the diff viewer.
- **Approve** moves to Done and starts the next task.
- **Reject** opens a reason field; confirm sends the fix prompt.
- **Mark reviewed** toggles `reviewed_at` without changing status.

### Detail panel

- Task description and comments.
- Cycle, branch, base SHA, commit SHA, diff stat.
- Diff viewer: file list with additions/deletions, unified diff, line numbers, colored `+`/`-` using status tokens, max height with its own scroll.
- Review actions and rejection reason history.
- **Open session**.

### Diff viewer

- `git diff --stat base..commit` for the file list.
- `git diff --unified=3 base..commit` for the body.
- Cap at ~1 MB; show “diff truncated” with a link to the full file list.
- No new dependency; render as text with token colors.

### Density

- 36px rows, 12px metadata, 13px titles, 4px grid.
- Host tokens only, light/dark parity, keyboard reachable, focus ring, reduced motion.

## Migration

- Add the `cycles` table and task columns in place.
- Existing `closedCycles` meta becomes `cycles.state = 'closed'`.
- Existing tasks keep `source`, `source_id`, cycle, and milestone.
- Existing done tasks can be moved to Archive with **Archive done**.
- The old kanban view is removed; the list view becomes the base for the new tabs.

## Implementation phases

1. **Git core** — cycles table, git helpers, start cycle, worktree, branch, base merge, merge cycle.
2. **Task lifecycle** — sequence, session start, `linear_task` tool, submit, approve, reject, clear done, turn/end fallback.
3. **UI** — review-first tabs, compact rows, detail panel, diff viewer, cycle controls.
4. **Migration and verification** — schema migration, docs, self-checks, mocked git/sync tests.

## Decisions to confirm

1. **Serialized tasks** — one task in flight per cycle, next starts after approval. Recommended for conflict-free git. Alternative: parallel tasks with per-task branches and a merge queue.
2. **Close cycle keeps tasks** — history stays; **Archive done** moves approved tasks to Archive. Alternative: close deletes tasks as today.
3. **Per-cycle worktree** — agent works outside the human's checkout. Alternative: agent works on the main workspace branch.
4. **Rejection resumes the same session** — keeps context; fallback to a new session if it is gone.
5. **Base branch** — default `main` / `origin/HEAD`, configurable per workspace link.

## Risks

- Git operations are destructive if the worktree or branch is wrong. Every command will be scoped to the recorded worktree and branch, with `--` paths and no force flags.
- A rejected task can still conflict if the base moved. The host merges the base before the fix and marks the cycle `blocked` on conflict.
- Agent compliance is not guaranteed. The `turn/end` fallback covers a missing submit, but a missing commit becomes `blocked`.
- Diff size can be large. The viewer caps output and shows a truncation marker.
- Linear has no default “in review” state. The local `in_review` status stays local unless a Linear state id is configured later.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.


## Follow-up: multi-connection and multi-board (implemented)

- `config.json` now holds `connections` and `boards` instead of one `apiKeyEnv` and one `workspaces` list.
- A connection is one Linear API key. A board uses one connection and one or many workspace links.
- Tasks and cycles carry `board_id`; the board selector switches the queue, review list, cycles, and git worktrees.
- The settings modal has Connections, Boards, and General tabs. It replaces the old Settings page.
- A Linear project belongs to one board so task ids stay unique.
- Older configs migrate to one default connection and one default board on load.
