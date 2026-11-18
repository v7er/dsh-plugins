# Linear board

Link one or more workspaces to Linear projects, keep their issues in a local SQLite board, and let the harness start an agent session per task.

## What it does

- **Workspace links** — each link names a directory, a display name, and a Linear project id. One project may be linked from several workspaces; that is what makes an issue ambiguous.
- **Sync** — every `pollIntervalMs` the Host reads the issues of each linked project, including the full description and up to 250 comments per issue, and upserts them into `linear.db`. A Linear state of type `completed` marks the local task done.
- **First read** — the first sync of a project imports its existing issues as `backlog`: they appear in Todo but start nothing and announce nothing. Only issues that appear after that first read are treated as new work.
- **Routing** — a new issue whose project matches exactly one workspace is assigned there and announced in the notification bell. When it matches several, the task stays `unassigned` and the bell offers a workspace choice.
- **Auto-start** — with `autoStart` on, a task that enters Todo starts its own agent session in the linked directory, with the issue title, full description, comments, and URL in the prompt. Each tick starts at most `maxParallel` sessions, so a large project cannot spawn every session at once; a task that already has a session is never started twice.
- **Board** — the Linear panel shows Todo (including backlog and unassigned), In progress, and Done. Click a card to open a modal with the full description and every synced comment. Start, Done, and Reopen move a task and push the matching Linear state (`started` / `completed`). Start also creates the session when auto-start is off. A task with a session offers **Open session**.

## Connect

Open the Linear panel (or Settings › Linear) and press **Connect**. The panel asks for a Linear personal API key, links to `linear.app/settings/api` where you create one, and stores it in the credential store. Nothing is hand-edited.

Once connected, the panel lists your Linear projects. Pick a project, then choose one of two ways to link it:

- **New workspace** — pick a directory with **Browse…**, optionally name it, and press **Create new workspace**. The directory is registered as a Harness workspace and the project is linked to it.
- **Existing workspace** — pick one of your registered Harness workspaces and press **Link project**.

Remove a link from the same list.

The key is never written to `config.json`; it lives in the credential store under `apiKeyEnv`, with the process environment as fallback.

## Settings

Settings › Linear edits `config.json` beside the plugin:

| Field | Default | Meaning |
|---|---|---|
| `apiKeyEnv` | `LINEAR_API_KEY` | Credential-store key that holds the Linear API key. Set by **Connect**, not by hand. |
| `pollIntervalMs` | `60000` | Sync interval, at least 15000. |
| `autoStart` | `true` | Start a session when a task enters Todo. |
| `maxParallel` | `3` | Sessions started per tick, 1–20. |
| `promptTemplate` | built in | Placeholders: `{identifier}`, `{title}`, `{description}`, `{comments}`, `{url}`, `{path}`. |
| `workspaces` | `[]` | `{ id, name, path, projectId }` links. |

## HTTP routes

| Route | Method | Body |
|---|---|---|
| `/dsh-linear/board` | GET | — |
| `/dsh-linear/connect` | GET | — (viewer and project list for the connected key) |
| `/dsh-linear/act` | POST | `{ op: 'sync' }`, `{ op: 'move', id, status }`, `{ op: 'start', id }`, `{ op: 'assign', id, workspaceId }`, `{ op: 'connect', key }`, `{ op: 'disconnect' }`, `{ op: 'addWorkspace', workspace }`, `{ op: 'removeWorkspace', id }`, `{ op: 'saveConfig', config }`, `{ op: 'setKey', value }` |

## Limitations

- New issues are found by polling, not by a Linear webhook: no public URL is needed, but a new issue appears after up to one poll interval.
- The board reads the first 100 issues per project, newest update first, and the first 250 comments per issue.
- A session that finishes does not move its task to Done by itself; move the card, or let the Linear state sync do it.
- The local status is the board's own. Moving a card pushes a Linear state, but a Linear state change made elsewhere only marks the task done, not in progress.
- One SQLite file per plugin directory. The `comments` column is added in place on first load of an older board.
