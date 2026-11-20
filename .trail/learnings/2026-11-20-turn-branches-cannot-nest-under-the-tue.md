---
title: Turn branches cannot nest under the cycle branch in git
author: Tue
date: 2026-11-20
branch: main
id: l-88f85b4d
scope: repo
status: active
src: agent
touches:
  - AGENTS.md
  - DESIGN.md
  - dsh-enhance/.gitignore
  - dsh-enhance/badges.json
  - dsh-enhance/config.json
  - dsh-enhance/docs/DETAIL.md
  - dsh-enhance/groups.json
  - dsh-enhance/package-lock.json
  - dsh-enhance/package.json
  - dsh-enhance/src/client.ts
---

## Decided
- Use `cycles-<number>` for the real integration branch and `cycles-<number>-turn-<turn>` for each turn worktree branch.

## Tried and ruled out
- `cycles-<number>/<turn>`: git refuses to create `refs/heads/cycles-12` while `refs/heads/cycles-12/3` exists, because a ref cannot also be a directory. `git update-ref` fails with "cannot lock ref ... exists; cannot create".

## Watch out
- Any future branch naming that puts turn refs under the cycle ref will break the turn finish step.

In the code: `dsh-linear/index.ts` `turnBranchName`.
