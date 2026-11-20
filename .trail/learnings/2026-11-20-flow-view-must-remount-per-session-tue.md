---
title: "Flow view must remount per session, not just reset a missing turn"
author: Tue
date: 2026-11-20
branch: main
id: l-db5e2f0e
scope: repo
status: active
src: agent
touches:
  - dsh-enhance/src/flow-view.ts
  - dsh-linear/linear.db
---

## Decided
- Key the Flow view (`FlowViewInner`) by `sessionId` so a session switch remounts it. Turn selection, stored flow rows, and the pending write queue are per-session state; reusing the component kept the previous session pinned on turn 1.
## Tried and ruled out
- Resetting `selectedTurn` only when it is missing from the new turn list: a new session that also has turn 1 keeps the old selection, so the view never follows the new session.
## Watch out
- The slot renderer already remounts session-scoped entries on a session-generation change, but the Flow view also carries its own per-session state and a keyed remount makes the reset explicit and independent of that host behavior.
In the code: dsh-enhance/src/flow-view.ts FlowView -> FlowViewInner key={props.sessionId}
