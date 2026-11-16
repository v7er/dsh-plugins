import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { apply } from './index.js'

const dir = await mkdtemp(path.join(tmpdir(), 'pa-'))
const memoryPath = path.join(dir, 'memory.jsonl')
const tools = new Map()
const commands = new Map()
apply({
  tools: { register: tool => tools.set(tool.name, tool) },
  systemPrompt: { section: () => {} },
  commands: { register: command => commands.set(command.name, command) },
}, { memoryPath, deepseekApiKey: '' })

const memory = tools.get('simsa_memory')
const refine = tools.get('simsa_refine')
const costs = tools.get('simsa_costs')
const ai = commands.get('simsa')
assert.ok(commands.get('s'), 'short alias registered')
const exec = { signal: new AbortController().signal }

const saved = await memory.execute({ action: 'save', text: 'Prefers pnpm', kind: 'preference', project: 'dsh', verified: true, importance: 5 }, exec)
assert.equal(saved.updated, false)
const again = await memory.execute({ action: 'save', text: 'prefers pnpm', tags: ['package'] }, exec)
assert.equal(again.updated, true, 'normalized duplicate updates instead of appending')

const found = await memory.execute({ action: 'search', query: 'pnpm', project: 'dsh' }, exec)
assert.equal(found.count, 1)
assert.equal(found.results[0].id, saved.entry.id)

const brief = await refine.execute({ prompt: 'add dark mode', project: 'dsh' }, exec)
assert.match(brief.refinedPrompt, /Prefers pnpm/)
assert.ok(brief.gaps.includes('acceptance criteria not specified'))
assert.ok(brief.estimate.totalCostUsd > 0)
assert.equal(brief.balance.configured, false)

const estimate = await costs.execute({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, exec)
assert.equal(estimate.estimate.totalCostUsd, 0.7)

const shown = await ai.handler({ agent: { followup: () => { throw new Error('show must not submit') } }, rawInput: 'show add dark mode', signal: exec.signal })
assert.equal(shown.kind, 'success')
assert.match(shown.text, /# Task\nadd dark mode/)

let submitted
const run = await ai.handler({ agent: { followup: message => { submitted = message } }, rawInput: 'add dark mode', signal: exec.signal })
assert.equal(run.kind, 'success')
assert.equal(submitted.role, 'user')
assert.match(submitted.content[0].text, /# Task\nadd dark mode/)
assert.ok(Object.isFrozen(submitted))

const compacted = await ai.handler({ agent: {}, rawInput: 'compact', signal: exec.signal })
assert.equal(compacted.kind, 'success')
assert.match(compacted.text, /Memory compacted/)

const removed = await memory.execute({ action: 'forget', id: saved.entry.id }, exec)
assert.equal(removed.removed, saved.entry.id)
const empty = await memory.execute({ action: 'list' }, exec)
assert.equal(empty.count, 0)

await rm(dir, { recursive: true, force: true })
console.log('simsa runtime check ok')
