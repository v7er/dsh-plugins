# AGENTS.md — DSH plugins workspace

Workspace root: `/Users/tuevo/.dsh/plugins`. One git repo, five independent plugin packages, no root `package.json`.

| Package | Entry | Language today |
| --- | --- | --- |
| `dsh-enhance` | `src/index.ts`, `src/client.ts` | TypeScript, built by Vite |
| `dsh-linear` | `index.ts`, `client.js` | TypeScript host, JS client |
| `dsh-notification` | `index.ts`, `client.js` | TypeScript host, JS client |
| `simsa` | `index.js` | JavaScript (legacy) |
| `turn-stats` | `index.ts`, `client.js` | TypeScript host, JS client |

## Design system

Read `DESIGN.md` before any change that renders UI. It is the standard for every plugin
with a client half: host `--dsw-*` tokens only, 4px spacing, the host type scale, one
elevation per surface, keyboard and dark-mode parity, locale-routed strings. The
workspace accent is the notification green (`--dsw-alias-state-success-primary`); see
`DESIGN.md` § Accent.

The reference model is [Astryx](https://astryx.atmeta.com/). Use it for component
semantics and states, never as a dependency: `@astryxdesign/*` is not whitelisted and
would duplicate the host theme.

## TypeScript only

- All new source files are `.ts` or `.tsx`. Never add `.js`, `.mjs`, or `.cjs` source.
- Legacy `.js` packages convert to TypeScript when you touch them. Do not rewrite a whole package unasked; convert the files the task already changes.
- New packages ship a `tsconfig.json` with `"strict": true`. `dsh-enhance` keeps its current `strict: false` until it is migrated.
- Every change must pass `tsc --noEmit` in the package it touches.
- No `@ts-ignore` / `@ts-expect-error` without a one-line reason on the same line.
- Types come from the code, not from `any`. If a DSH host type is missing, declare the narrow shape you use.
- Host halves ship `.ts` and point `exports["."]` at `./index.ts`: Node 24 strips types, so no build step. Client halves stay `.js` because the browser cannot strip types; only `dsh-enhance` builds its client with Vite.

## Package whitelist

Install only from this list. Node built-ins (`node:*`) are always allowed and are not packages.

| Package | Kind | Why |
| --- | --- | --- |
| `typescript` | dev | compiler |
| `vite` | dev | client/host bundling |
| `@types/node` | dev | Node types |
| `@types/react` | dev | React types |
| `@xyflow/react` | dev | 2026-11-19: realtime turn graph canvas in the Flow view; MIT, bundled into the client |
| `react` | host-provided | DSH client runtime; never install |
| `@deepseek-ai/dsh-*` | host-provided | DSH plugin API; never install |

Anything else is not whitelisted.

## Approval protocol for a new package

1. Stop before installing. Do not run `npm install`, `pnpm add`, or edit a lockfile.
2. Ask the user in one message: exact `name@version`, what it does, why the whitelisted options cannot do it, install size, and maintenance risk.
3. Only an explicit yes counts ("yes", "approve", "install it"). Silence, a question, or a maybe is a no.
4. On approval: install it, then append a row to the whitelist table above in the same turn, with the date and the reason. That edit is part of the change.
5. On refusal: do not install. Name the whitelisted alternative or the smaller hand-written version.
6. Never add a package to the whitelist without the user's approval for that exact package.

## Trail

`trail` 0.28.0 is installed at `/Users/tuevo/.volta/bin/trail`. It writes global state to `~/.trail`, so it needs write access outside this workspace.

Setup, once per clone:

```bash
trail init . --no-build     # wires AGENTS.md, .trail/, .claude/, .cursor/
trail build .               # builds the code map, no API key, $0
```

`trail init` appends a `<!-- trail:start -->` block to this file. Keep the block; merge it with the sections above instead of deleting it.

Use before grepping or opening files:

```bash
trail map .                          # orientation: clusters, hubs, hotspots
trail ask "<question>" --source      # ranked nodes with code spans
trail grep "<literal>"               # exhaustive occurrences
trail skeleton <file>                # API surface, ~200 tokens
trail callers <symbol>               # who calls it; --direction out for callees
```

After large code changes: `trail build .`. Save a hard-won fact: `trail note "<learning>"`.

## Slash commands

Every plugin exposes its actions as one Host slash command with subcommands. The Web GUI's `/` menu lists it automatically; the menu itself needs no client code.

- Register through `ctx.inject(['commands'], ...)`, never a hard `inject` entry. A headless composition has no registry and must still load.
- One command per plugin, named after the plugin: `/enhance`, `/linear`, `/notify`, `/stats`, `/simsa`.
- `input.hint` lists the subcommands: `'<status|sync|tasks>'`.
- The registry has no subcommand concept. Everything after the name arrives as `rawInput`; parse it yourself.
- Return `{ kind: 'success' | 'error', text }`. Never throw for user input.
- An empty or unknown subcommand returns an error that lists the valid ones.

```ts
/** The narrow `ctx.commands` face this plugin registers into. */
interface CommandScope {
  effect(fn: () => () => void, label?: string): () => void
  commands: {
    register(definition: {
      name: string
      description: string
      input?: { hint: string }
      handler(invocation: { rawInput: string }): { kind: 'success' | 'error'; text: string }
    }): () => void
  }
}

ctx.inject(['commands'], (scope: CommandScope) => {
  scope.effect(() => scope.commands.register({
    name: 'notify',
    description: 'List, read, or dismiss notifications',
    input: { hint: '<list|read|dismiss>' },
    handler: ({ rawInput }) => {
      const parts = rawInput.trim().split(/\s+/).filter((part) => part !== '')
      const sub = parts[0] ?? 'list'
      // ...
      return { kind: 'error', text: 'Subcommands: list, read <id|all>, dismiss <id>' }
    },
  }), 'dsh-notification: /notify command')
})
```

Client popup, only when the plugin has a client half:

- `ctx.commandUi.decorate({ name, available, ui: { kind: 'popupSelect', options, onSelect } })` hangs a picker on the Host row's bare invocation.
- A decoration never creates a row: the Host command must exist first.
- Typed `/cmd <sub>` skips the decoration and goes to the Host handler.
- `ctx.commandUi.register` makes a client-only command, but an argued line then falls through to the model as a prompt. Prefer a Host row.
- `dsh-enhance` is the reference: Host command in `src/index.ts`, decoration in `src/client.ts`.

## Verify before done

```bash
cd /Users/tuevo/.dsh/plugins
(cd dsh-enhance && npx tsc --noEmit && npm run build)
for p in dsh-linear dsh-notification turn-stats; do (cd $p && npx tsc --noEmit); done
```

Every converted package carries `"typecheck": "tsc --noEmit"`. A `.ts` entry also needs a load check from the profile directory, which exercises exports resolution, the symlink, and Node type stripping:

```bash
cd /Users/tuevo/.dsh/profiles/desktop
ELECTRON_RUN_AS_NODE=1 "$DSH_NODE_EXECUTABLE" -e "import('@local/dsh-linear').then(m => console.log(Object.keys(m)))"
```

A Host change needs an app restart: HMR runs with `root: []`, so plugin modules are not watched.

## Rules that override defaults

- Ask before adding any dependency, even a dev one.
- Keep diffs small. Do not reformat files you did not change.
- Do not commit `node_modules/`, `dist/`, or `.trail/cache/`.

<!-- trail:start -->
## Trail — repo context graph

This repo is indexed in `.trail/cache/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `trail map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `trail ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `trail grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `trail skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `trail callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `.trail/cache/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `trail ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `trail build` (deterministic,
no API key, $0).
<!-- trail:end -->
