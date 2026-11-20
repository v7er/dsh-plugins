---
title: "dsh-linear realtime uses SSE, not SQLSync"
author: Tue
date: 2026-11-19
branch: main
id: l-25f98d9a
scope: repo
status: active
src: agent
touches:
  - AGENTS.md
  - dsh-enhance/badges.json
  - dsh-enhance/groups.json
  - dsh-enhance/package-lock.json
  - dsh-enhance/package.json
  - dsh-enhance/src/client.ts
  - dsh-linear/client-check.mjs
  - dsh-linear/client.js
  - dsh-linear/config.json
  - dsh-linear/docs/DETAIL.md
---

## Decided
- dsh-linear realtime updates use a Server-Sent Events route (`/dsh-linear/events`) plus a debounced `notifyBoard()` on every SQLite write, not SQLSync.
- The client subscribes with `EventSource` and keeps a 30s fallback poll.
## Tried and ruled out
- SQLSync (`@orbitinghail/sqlsync-react` / `-worker` 0.3.2): needs a Rust reducer compiled to WASM, a coordinator server that is still build-from-source, and a browser WASM client. Its guide says not for production. The host is Node/Electron with `node:sqlite`, so adopting it is a data-layer rewrite, not a library setup.
- `node:sqlite` and `better-sqlite3` expose no update hook, so there is no drop-in change-notification library.
## Watch out
- The write hook wraps `database.prepare().run()`; a runtime `database.exec()` write would not notify. Add `notifyBoard()` there if one appears.
- A Host change needs an app restart; the client half needs a page refresh.
