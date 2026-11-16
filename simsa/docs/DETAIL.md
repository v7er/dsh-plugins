# Simsa

Three tools and one slash command that keep a short request cheap and grounded in what the user already told the harness.

## What it does

- **`simsa_memory`** — save, search, list, or forget durable knowledge. Entries live in one JSONL file (`~/.dsh/simsa/memory.jsonl` by default). Search is lexical: query terms, tags, project, verification, importance, and recency rank the entries, and only the top few come back. No embeddings, no API key, no full-file prompt.
- **`simsa_refine`** — the gate. Takes the user's short prompt, pulls the matching memories, and returns a structured brief (`Task`, `Project`, `Context from memory`, `Acceptance`) plus the gaps it could not fill. The same call estimates input and output tokens and their USD cost.
- **`simsa_costs`** — estimates a run from token counts and reports the DeepSeek account balance when a key is configured.
- **`/simsa`** and **`/s`** — the same gate as a slash command. `/simsa <prompt>` refines and submits the brief as the next user turn; `/simsa show <prompt>` prints it without submitting; `/simsa compact` dedupes and prunes the file now.

A short system-prompt section tells the agent to call `simsa_refine` before an underspecified request and to save durable facts with `simsa_memory`.

## Usage

```
/simsa add dark mode
/s add dark mode
/simsa show add dark mode
/simsa compact
```

```
simsa_memory  action=save  text="Prefers pnpm, never npm"  kind=preference  verified=true
simsa_memory  action=search  query="package manager"  project="dsh"
simsa_refine  prompt="add dark mode"  project="dsh"  acceptance="toggle persists"
simsa_costs   inputTokens=40000  outputTokens=3000
```

## Growth and compaction

Prompt cost stays bounded: search returns at most `maxMemories` entries, so a large file never enters the prompt whole.

The file itself is capped at `maxEntries` (default 1000). When a save pushes it past the cap, the plugin rewrites the file and keeps the most valuable entries first: verified, then higher importance, then newer. The save result reports `pruned`. `/simsa compact` does the same on demand and also merges entries whose normalized text is identical.

## Configuration

| Field | Default | Meaning |
|---|---|---|
| `memoryPath` | `~/.dsh/simsa/memory.jsonl` | Where entries are stored. |
| `maxMemories` | `6` | Memories included by `simsa_refine`. |
| `maxSnippetChars` | `400` | Per-entry cap in results and the refined prompt. |
| `maxEntries` | `1000` | File cap; older low-value entries are pruned past it. |
| `baseContextTokens` | `12000` | Rough harness + system + tool overhead added to the estimate. |
| `defaultOutputTokens` | `2000` | Output size when the caller does not pass one. |
| `deepseekApiKey` | `''` | Falls back to `DEEPSEEK_API_KEY`, then the harness credential store. |
| `prices` | `{ input: 0.28, cacheRead: 0.028, output: 0.42 }` | USD per 1M tokens. |

## Limitations

- Search is lexical, not semantic. A paraphrase with no shared word will not match; add tags or a `verified` entry with the words the user actually uses.
- The refined prompt is assembled from a template plus stored memory. It does not invent requirements; missing information appears in `gaps`.
- Only DeepSeek exposes a balance endpoint here. Other providers need their own adapter.
- The memory file is read in full on each search. That is fine for thousands of entries; add an index above roughly 10k.
- Compaction drops entries. Keep important facts `verified` or at importance 4-5 so they survive.
- No Linear or mobile notification yet. Those are the next slice.
