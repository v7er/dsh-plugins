import assert from 'node:assert/strict'
import { buildPrompt, compactEntries, costEstimate, dedupeEntries, searchEntries } from './index.js'

const entries = [
  { id: 'a', text: 'Prefers pnpm over npm', kind: 'preference', tags: ['package'], project: 'dsh', verified: true, importance: 5, updatedAt: new Date().toISOString() },
  { id: 'b', text: 'Deploys on Fridays', kind: 'fact', tags: [], project: 'other', verified: false, importance: 2, updatedAt: new Date().toISOString() },
  { id: 'c', text: 'Uses DeepSeek for coding', kind: 'fact', tags: ['model'], project: 'dsh', verified: true, importance: 4, updatedAt: new Date().toISOString() },
]

const hits = searchEntries(entries, 'pnpm package manager', { project: 'dsh', limit: 2 })
assert.equal(hits[0].id, 'a', 'project + tag + verified entry ranks first')
assert.ok(hits.length <= 2)

const none = searchEntries(entries, 'kubernetes', { project: 'dsh', limit: 5 })
assert.equal(none.length, 0, 'unrelated query returns nothing')

const prompt = buildPrompt({ prompt: 'add dark mode', project: 'dsh', acceptance: 'toggle persists', memories: hits, maxSnippetChars: 400 })
assert.match(prompt, /# Task\nadd dark mode/)
assert.match(prompt, /\[preference\] Prefers pnpm over npm/)
assert.match(prompt, /# Acceptance\ntoggle persists/)

const estimate = costEstimate(1_000_000, 1_000_000, { input: 0.28, cacheRead: 0.028, output: 0.42 }, 'deepseek')
assert.equal(estimate.inputCostUsd, 0.28)
assert.equal(estimate.outputCostUsd, 0.42)
assert.equal(estimate.totalCostUsd, 0.7)

const merged = dedupeEntries([
  { id: '1', text: 'Prefers pnpm', tags: ['a'], importance: 2, verified: false, updatedAt: '2026-01-01' },
  { id: '2', text: 'prefers  pnpm', tags: ['b'], importance: 4, verified: true, updatedAt: '2026-02-01' },
])
assert.equal(merged.length, 1, 'normalized duplicates merge')
assert.equal(merged[0].importance, 4)
assert.equal(merged[0].verified, true)
assert.deepEqual(merged[0].tags.sort(), ['a', 'b'])

const many = Array.from({ length: 10 }, (_, i) => ({
  id: String(i),
  text: `t${i}`,
  importance: (i % 5) + 1,
  verified: i === 3,
  updatedAt: `2026-01-0${(i % 9) + 1}`,
}))
const compacted = compactEntries(many, 3)
assert.equal(compacted.entries.length, 3)
assert.equal(compacted.pruned, 7)
assert.ok(compacted.entries.some(entry => entry.id === '3'), 'verified entry survives pruning')

console.log('simsa selftest ok')
