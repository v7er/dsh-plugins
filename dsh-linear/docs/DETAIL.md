# Linear board

Link one or more workspaces to Linear projects, keep their issues in a local SQLite board, and let the harness start an agent session per task.

## What it does

- **Connections** — one or more Linear API keys. Each connection has a name and its own credential-store key. A board uses exactly one connection.
- **Boards** — one or more boards. Each board has a name, a connection, and one or many workspace links. A workspace link names a directory, a Linear project id, and an optional base branch; its display name is derived from the Harness workspace title or the folder name. A Linear project belongs to one board.
- **Sync** — every `pollIntervalMs` the Host reads the issues of each board's linked projects, including the full description, cycle, milestone, priority, and up to 250 comments per issue, and upserts them into `linear.db`. Each board/project pair stores its own `lastSync` and only issues updated after it are fetched. Completed and canceled issues are not synced; a Linear task that finishes is removed from the board.
- **Force sync** — the header button re-reads every issue from the beginning, updates existing tasks by `source_id`, and never creates duplicates. It also moves legacy `backlog` rows to `pending_approval`.
- **First read** — the first sync of a project imports its existing open issues as `backlog`: they appear in Queue but start nothing and announce nothing. Only issues that appear after that first read are treated as new work.
- **Source** — a synced task has `source = linear` and keeps the Linear issue id in `source_id`. A task created in the plugin has `source = local`; the board shows a different icon for each.
- **Board scope** — tasks and cycles carry `board_id`. The board selector switches between boards; each board has its own queue, review list, cycles, and git worktrees.
- **Cycles** — synced cycles live in the `cycles` table. A cycle starts automatically when the first turn starts: the Host records the real branch `cycles-<number>` from the workspace base branch and marks the cycle active. The branch itself is created when the turn finishes. **Edit cycle** changes its name and start/end dates locally and pushes them to Linear with `cycleUpdate`; ad-hoc cycles created by the plugin have no Linear counterpart and stay local.
- **Milestones and cycles** — each sync reads every project milestone and every team cycle, not only the ones already used by an issue, and stores them in `milestones` and `cycles`. The board offers the full lists in its pickers. The cycle filter shows only the cycle in progress and the one after it; later cycles stay out of the board.
- **Inline edit** — in the task detail panel, click the cycle, points, or milestone value to edit it in place: a select for cycle and milestone, a number field for points. The change is saved locally and pushed to the Linear issue with `issueUpdate`; a local task keeps it locally.
- **Approval gate** — every new task, synced or created locally, enters `pending_approval`. It appears in Review › **Approve to work**. Approval moves it to Queue; it does not start work.
- **Queue** — approved tasks wait in sequence. **Start working** at the top of Queue starts every queued task as one turn. A turn runs in its own worktree and branch `cycles-<number>-turn-<turn>`, and the next task starts when the previous one is submitted. **Pause turn** stops the turn from starting its next queued task; the running task still finishes, and **Resume turn** continues the queue. **Back to review** returns an unstarted queued task to `pending_approval`; a blocked task can also go back to review or be archived.
- **Review** — a finished task is committed on the turn branch and submitted with `linear_task submit`. The task moves to `in_review` with its commit hash and diff stat. Review has two sections: **Approve to work** for new tasks, and **Review AI work** for submitted commits. The human can view the diff, mark it reviewed, approve, or reject with a reason.
- **Turn note** — each turn has a note for post-merge steps such as migrations or version bumps. The human can edit it in Queue while the turn is working or blocked; the agent updates it with `linear_task action: note`. A finished turn's note is shown read-only, and the next turn starts with an empty note.
- **Turn finish** — when every task in the turn is submitted, the Host points the real branch `cycles-<number>` at the turn HEAD and notifies the human to review, merge, or open a pull request.
- **Session status** — a task shows **Working** only while its agent session is running. When the session has finished but the task is still `doing`, the row shows **Session finished** and a **Mark done** button. A small colored dot marks a session that is running or waiting for human approval.
- **Session preview** — **Open session** shows a read-only transcript in the board's right panel, so the board stays visible. The transcript footer has **Open session** to switch to the real conversation.
- **Reject** — the task returns to `doing` and the same session gets a fix prompt: fetch the latest base, merge it into the cycle branch, fix the reason, commit, and submit again. If the session is gone, a new session starts in the same worktree.
- **Approve** — the task becomes `done`, the Linear state is pushed to completed, and the next task starts.
- **Archive done** — moves all approved tasks from Done to the Archive tab; the rows stay local so the next sync does not import them again.
- **Close cycle** — allowed only when no task is `doing` or `in_review`. Keeps history and the branch. **Merge cycle** merges `cycles-<n>` into the base branch when the base checkout is clean and on the base branch.
- **Auto-start** — removed. Work starts only from **Start working**.
- **Session fallback** — when a task session ends a turn without a submit, the Host auto-submits a clean new commit or marks the task `blocked` with the reason.

## Git workflow

- Integration branch: `cycles-<number>` (for example `cycles-12`).
- Turn branch: `cycles-<number>-turn-<turn>` (for example `cycles-12-turn-3`). Git cannot hold both `cycles-12` and `cycles-12/3`, so turns are suffixed.
- Worktree: `~/.dsh/linear-worktrees/<workspaceId>/cycles-<number>-turn-<turn>`.
- Base branch: the workspace link's `baseBranch`, else `origin/HEAD`, then `main`/`master`, then the current branch.
- Before a turn the Host fetches the repo and branches from the latest `origin/<base>` or the existing integration branch. A new turn branch is rebased onto the latest `origin/<base>` so the cycle's commits replay on top; a conflict blocks the turn. A stale turn branch is rebased too.
- The agent commits with a message starting `<identifier>: ` and never pushes.
- The review diff is always `base_sha..commit`.
- Rejections add commits on the same turn branch; no force-push.
- When the turn finishes, the Host points `cycles-<number>` at the turn HEAD. **Merge cycle** runs `git merge --no-ff cycles-<n>` into the base branch.

## Settings modal

Open the Linear panel and press **Settings** in the header. The modal has two tabs:

- **Connections & boards** — connections sit above boards. Connections are a row of circle avatars, each with two initials and a stable tint derived from its name; the gray `+` avatar at the end adds a connection. Click an avatar to open its editor and rename, set or replace the key, disconnect, or remove it. Removing a connection is refused while a board uses it. The board list follows, with **New board** in the section header. A board row shows its name, its connection as a small avatar, and its workspace count; expand it to rename, change connection, remove it, or manage its workspaces. A workspace is added from a new directory or an existing Harness workspace, with a Linear project and optional base branch. Its display name is derived from the Harness workspace title or the folder name, so there is no name field. The directory must be inside a git repository; a plain folder is refused. Removing a board deletes its local tasks and cycles.
- **General** — poll interval and the prompt template.

A board may link many workspaces. A task still runs in exactly one: when a board has more than two, **New task** shows a searchable workspace picker instead of a short select.

The API key is never written to `config.json`; each connection stores it in the credential store under its own `apiKeyEnv`, with the process environment as fallback.

## Settings

Settings › Linear edits `config.json` beside the plugin:

| Field | Default | Meaning |
|---|---|---|
| `connections` | `[]` | `{ id, name, apiKeyEnv }` Linear connections. |
| `boards` | `[]` | `{ id, name, connectionId, workspaces }` boards. |
| `boards[].workspaces` | `[]` | `{ id, name, path, projectId, baseBranch }` links. `baseBranch` is optional. |
| `pollIntervalMs` | `60000` | Sync interval, at least 15000. |
| `promptTemplate` | built in | Placeholders: `{identifier}`, `{title}`, `{description}`, `{comments}`, `{url}`, `{path}`. |

An older `config.json` with `apiKeyEnv` and `workspaces` is migrated on load to one default connection and one default board.

## HTTP routes

| Route | Method | Body |
|---|---|---|
| `/dsh-linear/board` | GET | — |
| `/dsh-linear/diff?taskId=` | GET | `{ stat, diff, truncated }` for one task |
| `/dsh-linear/connect` | GET | — (viewer and project list for the connected key) |
| `/dsh-linear/act` | POST | `{ op: 'sync' }`, `{ op: 'move', id, status }`, `{ op: 'start', id }`, `{ op: 'startWorking', cycleId, note }`, `{ op: 'saveTurnNote', turnId, note }`, `{ op: 'pauseTurn', turnId }`, `{ op: 'resumeTurn', turnId }`, `{ op: 'unapprove', id }`, `{ op: 'assign', id, workspaceId }`, `{ op: 'createTask', task }`, `{ op: 'closeCycle', cycleId }`, `{ op: 'mergeCycle', cycleId }`, `{ op: 'updateCycle', cycle }`, `{ op: 'updateTaskFields', task }`, `{ op: 'clearDone', boardId }`, `{ op: 'approve', id }`, `{ op: 'reject', id, reason }`, `{ op: 'markReviewed', id, reviewed }`, `{ op: 'close', id }`, `{ op: 'archive', id }`, `{ op: 'cancel', id }`, `{ op: 'connect', connectionId, key }`, `{ op: 'disconnect', connectionId }`, `{ op: 'addConnection', connection }`, `{ op: 'removeConnection', id }`, `{ op: 'addBoard', board }`, `{ op: 'saveBoard', board }`, `{ op: 'removeBoard', id }`, `{ op: 'addWorkspace', boardId, workspace }`, `{ op: 'removeWorkspace', boardId, id }`, `{ op: 'saveConfig', config }`, `{ op: 'setKey', value }` |

## Agent tool

`linear_task` is registered on the Host tool registry:

- `action: submit` — validate a clean worktree, record `HEAD`, compute the diff, move to `in_review`, then start the next queued task or publish the turn branch.
- `action: status` — return the current task, cycle, branch, and commit.
- `action: blocked` — record a blocker and notify the human.
- `action: note` — update the turn note with post-merge steps.

The tool resolves the task from the calling session id through `tasks.session_id`.

## Limitations

- New issues are found by polling, not by a Linear webhook: no public URL is needed, but a new issue appears after up to one poll interval.
- The board reads up to 100 updated issues per project per sync and the first 250 comments per issue.
- One turn is in flight per cycle. Tasks inside a turn run in sequence; parallel turns need a merge queue, which this version does not implement.
- A Linear project belongs to one board. Linking the same project to two boards is rejected so task ids stay unique.
- Removing a board deletes its local tasks and cycles; the git branch and worktree are left on disk.
- The agent must commit before submitting. A turn that ends with uncommitted changes marks the task `blocked`.
- Merge cycle requires the base checkout to be on the base branch and clean; it does not switch branches for you.
- Linear has no default “in review” state. `in_review` stays local; approve pushes `completed`.
- One SQLite file per plugin directory. New columns and the `cycles` table are added in place on first load of an older board.

## Slash command

`/linear` reports and drives the board without a model message:

| Subcommand | Effect |
|---|---|
| `status` | boards, key state, last sync, task counts, last error |
| `sync` | runs one Linear sync now |
| `tasks [status]` | lists up to 15 tasks, optionally filtered by `todo`, `doing`, `in_review`, `blocked`, or `done` |
| `start <id>` | moves a task to `doing` and starts its agent session |
| `done <id>` | marks a task `done` |

The Host registers it only when a command registry is mounted.
