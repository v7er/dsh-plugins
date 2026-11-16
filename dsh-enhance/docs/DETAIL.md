# dsh-enhance

Three additions to the Web/Desktop client:

1. **Global bar** — a bottom bar with persistent multi-shell terminals and a two-pane split. It stays mounted across sessions.
2. **Workspace browser with icons and badges** — replaces the shipped `sidebar.workspaces` browser with a compact list that reads `badges.json`.
3. **Virtual groups** — group workspaces under named folders from `groups.json`.

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
