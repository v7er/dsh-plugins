# dsh-enhance

Four additions to the Web/Desktop client:

1. **Global bar** — a bottom bar with persistent multi-shell terminals and a two-pane split. It stays mounted across sessions.
2. **Workspace browser with icons and badges** — replaces the shipped `sidebar.workspaces` browser with a compact list that reads `badges.json`.
3. **Virtual groups** — group workspaces under named folders from `groups.json`.
4. **Editor tab** — a right-sidebar tab that runs Neovim through `ttyd`, or embeds any noVNC desktop.

## Feature toggles

Open **Settings → dsh-enhance** and use the switches. They write `config.json` in the plugin directory:

```json
{
  "customLeftbar": true,
  "globalBar": true,
  "virtualGroups": true,
  "splitPanes": true
}
```

- `customLeftbar: false` → shipped workspace browser returns.
- `globalBar: false` → no bottom global bar.
- `virtualGroups: false` → flat workspace list.
- `splitPanes: false` → no split button.

Reload the page after changing a switch.

## Global bar

- Always mounted at the bottom (`shell.bottom`), across every session.
- `▾` / `▸` expands or collapses the bar; `×` collapses it.
- `◫` splits the bar into two panes, each with its own tab selector.
- `+` creates a new terminal tab.
- `⌘T` / `Ctrl+T` adds a tab from anywhere and expands the global bar.
- `⌘W` / `Ctrl+W` closes the active tab when focus is in the global bar.
- A terminal tab is an independent `ttyd` process. The font defaults to `'Hack Nerd Font Mono', 'JetBrains Mono', 'Fira Code', monospace`; override it with `fontFamily` in the plugin config.
- Tabs close with their `×`.
- When more than one tab exists, a small `⌄` button at the bottom-right of the pane switches tabs.
- Requires `ttyd` on `PATH` or at `/opt/homebrew/bin/ttyd`. Install with `brew install ttyd`.
- The terminal runs with your user permissions, not the Agent sandbox. It is bound to `127.0.0.1` and has no authentication; any local process can connect.

## Virtual groups

Edit `groups.json`:

```json
{
  "groups": [
    {
      "id": "work",
      "title": "Work",
      "icon": "briefcase",
      "workspaces": ["/Users/you/project-a", "/Users/you/project-b"]
    }
  ]
}
```

Group rows render above ungrouped workspaces, with a title and member count. Members indent under the group and are always visible.

## Workspace icons and badges

Edit `badges.json` in the plugin directory:

```json
{
  "shadowBrowser": true,
  "workspaces": {
    "/Users/you/project": { "icon": "rocket", "badge": "prod", "color": "#f07178" },
    "Design system": { "icon": "palette", "badge": "wip", "color": "#ffd479" }
  }
}
```

- Keys match a workspace by canonical path first, then by title.
- `icon` is a Lucide icon name (`folder`, `rocket`, `code`, `terminal`, `database`, `globe`, `package`, `palette`, `wrench`, `bug`, `zap`, `star`, `heart`, `home`, `layers`, `box`, `cpu`, `cloud`, `git-branch`, `file-code`, `flask-conical`, `shield`, `sparkles`, `target`, `trophy`, `coffee`, `music`, `camera`, `image`, `map`, `compass`, `key`, `lock`, `bell`, `calendar`, `clock`, `mail`, `message-square`, `users`, `user`, `settings`, `hammer`, `pen-tool`, `brush`, `graduation-cap`, `lightbulb`, `puzzle`, `gamepad-2`, `car`, `plane`, `leaf`, `sun`, `moon`). Any other string renders as text, so an emoji still works.
- `badge` is the pill text; `color` is any CSS color.
- `shadowBrowser: false` disables the replacement and restores the shipped browser without uninstalling.

## Tool decorators

Edit `decorators.json` to prefix Chat tool rows with a per-tool mark:

```json
{
  "tools": { "bash": ">", "read": "▤", "grep": "⌕" },
  "variants": { "bash": ">", "search": "⌕", "others": "•" }
}
```

- `tools` matches the wire tool name (`data-tool`).
- `variants` matches the classified row type (`data-variant`): `search`, `read`, `bash`, `write`, `edit`, `code`, `others`.
- A tool entry wins over its variant entry.
- Add a new tool by adding one key. No code change.

The decorator is a CSS `::before` on the Chat tool row. The Trajectory tab has no per-tool DOM attribute, so it cannot be decorated without forking the trajectory view.

## Shadow browser caveats

The replacement keeps workspace rows, new session, rename, delete, add by folder picker, search, and session rows. Click a workspace's folder icon or name to expand or collapse its sessions; an expanded folder is green. The header's `⊟` collapses every workspace except those with a running session. The header's `+` opens the native folder picker and adds the chosen directory. Each workspace row shows only `+` (new session) and `⋯` (more). More opens Change icon, Rename, and Delete. Each session row shows a trash icon on hover: it archives the session, which is DSH's only removal (the log is kept). A session with running work asks before stopping it. Change icon opens a Lucide icon grid and saves the choice to `badges.json`. It does **not** keep drag reordering, fork, pin, content search, or the session context menu. Those remain in the shipped browser, which returns when `shadowBrowser` is false or when the replacement throws.

A plugin cannot rewrite itself after a DSH upgrade. The replacement has an error boundary that disposes it and restores the shipped browser on a render failure; it does not auto-update its own code.

## Editor tab (right sidebar)

An **Editor** tab type in the right sidebar, next to Files, Terminal and Browser. The guide card opens a picker. Nothing starts on its own: the tab shows the picker until you click an editor, and only then does a process start.

### Discovery

At load the Host scans for these and lists every one it finds:

| Editor | How it runs | Needs |
|---|---|---|
| Neovim | `ttyd` running `nvim` | `ttyd`, `nvim` |
| VS Code | `code serve-web` behind a loopback proxy | VS Code CLI |
| Cursor | native app, opened on the desktop | Cursor.app |
| Sublime Text | native app, opened on the desktop | Sublime Text.app |
| Zed | native app, opened on the desktop | Zed.app |

Neovim loads your normal config: it runs with your `HOME`, `PATH` (Homebrew included), `TERM=xterm-256color` and `COLORTERM=truecolor`, so `~/.config/nvim`, plugins, LSP and clipboard behave as in a local terminal.

VS Code's web server sends `X-Frame-Options` and `frame-ancestors`, so the tab reaches it through a loopback proxy that strips those headers and carries the WebSocket. The first start downloads the VS Code web server once.

Cursor, Sublime Text and Zed have no web UI. They open on the desktop at the workspace folder. To embed them in the tab, point a `novnc` entry at a VNC desktop that serves noVNC.

### Configuration

```json
{
  "editors": [
    { "id": "nvim", "type": "ttyd", "label": "Neovim", "command": "/opt/homebrew/bin/nvim" },
    { "id": "sublime", "type": "novnc", "label": "Sublime Text", "url": "http://127.0.0.1:6080/vnc.html?autoconnect=1&resize=scale" },
    { "id": "zed", "type": "novnc", "label": "Zed", "url": "http://127.0.0.1:6081/vnc.html?autoconnect=1&resize=scale" }
  ],
  "editorCwd": "/Users/you/project"
}
```

- Entries merge with the discovered defaults by `id`; a new `id` adds an editor.
- `type`: `ttyd`, `web`, `novnc`, or `native`.
- `editorCwd` is the fallback folder when the Session has no Workspace.

### Behaviour

- **Workspace folder.** The tab resolves the Session's Workspace path and starts the editor there. Neovim gets it as its working directory, VS Code as `--default-folder`, native apps as their open path.
- **Focus ring.** The right sidebar draws a green inset border while it contains keyboard focus.
- **Key pass-through.** While the IDE iframe owns focus, the plugin puts DSH's shortcut layer into recording mode, so every key reaches the editor instead of being intercepted. Leaving the iframe restores shortcuts.
- **On demand.** Opening the tab, reloading the page, or restoring the tab starts nothing. A process starts only when you click an editor card.
- **Kept on close.** Closing the tab leaves the editor running. Reopening the tab shows the picker with that card marked **Running**; clicking it re-attaches to the same process instead of starting another.
- **Shut down.** A running card shows a power button on hover (or keyboard focus) that stops that editor and its process group. The embedded view also carries **Switch editor** and **Shut down** in its header, so you can leave the iframe without killing it.
- **One process per editor id**, at most five, reused when the tab reopens, killed with its process group when the plugin unloads.

### About noVNC on macOS

noVNC is a VNC client, not a window server: it shows whatever a VNC server streams.

- Neovim needs no VNC.
- Sublime Text, Zed and Cursor are native macOS apps. macOS Screen Sharing streams the whole desktop, not one window. A VNC server alone does not isolate an app.
- For an isolated GUI editor, run it in a Linux desktop container that serves noVNC, then point a `novnc` entry at it:

```sh
docker run -d -p 6080:6080 \
  -v "$HOME/Projects:/workspace" \
  -e AUTOCONNECT=true \
  --name dsh-ide \
  theasp/novnc:latest
```

That image serves noVNC at `http://127.0.0.1:6080/vnc.html?autoconnect=1&resize=scale` with a minimal Xfce desktop. Install Sublime Text or Zed inside it (`docker exec`), then open the URL from the picker.

## Slash command

`/enhance` is a Host command with a client-side subcommand picker.

- Bare `/enhance` (menu pick or Enter) opens a popup with **New terminal**, **Editor**, **Status**, and **Config**. New terminal opens a shell tab in the global bar; Editor opens the right-sidebar editor tab; Status and Config run on the Host.
- Typed `/enhance <sub>` skips the popup and goes straight to the Host handler:

| Subcommand | Effect |
|---|---|
| `status` | ttyd path, terminal count, available editors |
| `terminal [shell]` | starts a terminal, returns its URL |
| `editor [id]` | starts an editor, returns its URL or desktop-open note |
| `stop <terminal\|editor> <id>` | stops that process |
| `config` | prints the plugin configuration |

The Host half registers the command only when a command registry is mounted, so a headless composition still loads the plugin. The client half decorates the Host row; it never manufactures one.

## Development

Source is TypeScript in `src/`. Build both halves with Vite:

```sh
npm install
npm run build
```

Outputs: `dist/client.js` (browser module) and `dist/index.js` (Host half). `npm run typecheck` checks types.
