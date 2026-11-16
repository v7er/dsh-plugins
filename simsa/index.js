/**
 * Simsa Host half: local memory, prompt refinement gate, and cost estimate.
 *
 * Memory is a JSONL file the user owns. Search is lexical (no embeddings, no API key), so a
 * short prompt can be expanded with the few stored facts that matter instead of the whole file.
 *
 * @module @local/simsa
 */
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export const name = 'simsa'

/** Both services are required: tools to register, systemPrompt to place the gate instruction. */
export const inject = ['tools', 'systemPrompt', 'commands']

const KINDS = ['profile', 'preference', 'fact', 'decision', 'project']

const USAGE = 'Usage: /simsa (or /s) <prompt> | show <prompt> | compact'

const DEFAULTS = {
  memoryPath: path.join(homedir(), '.dsh', 'simsa', 'memory.jsonl'),
  maxMemories: 6,
  maxSnippetChars: 400,
  maxEntries: 1000,
  baseContextTokens: 12000,
  defaultOutputTokens: 2000,
  deepseekApiKey: '',
  prices: { input: 0.28, cacheRead: 0.028, output: 0.42 },
}

const segmenter = new Intl.Segmenter('und', { granularity: 'word' })

/** Lowercase word tokens; CJK runs segment into words instead of one long token. */
function terms(text) {
  const out = []
  for (const part of segmenter.segment(String(text).toLowerCase())) {
    if (part.isWordLike) out.push(part.segment)
  }
  return out
}

function normalize(text) {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim()
}

function clip(text, max) {
  const value = String(text)
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

function round6(value) {
  return Math.round(value * 1e6) / 1e6
}

/** The enforced JSON Schema subset has no numeric bounds, so clamp here. */
function clampInt(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(number)))
}

/** Rough token count for a prompt; 4 characters per token is close enough for a pre-run estimate. */
function estimateTokens(text) {
  return Math.ceil(String(text).length / 4)
}

async function readEntries(file) {
  let raw
  try {
    raw = await readFile(file, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const entries = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try {
      const entry = JSON.parse(line)
      if (entry && typeof entry.text === 'string') entries.push(entry)
    } catch {
      // A torn line from a crashed write must not hide the rest of the file.
    }
  }
  return entries
}

async function appendEntry(file, entry) {
  await mkdir(path.dirname(file), { recursive: true })
  await appendFile(file, `${JSON.stringify(entry)}\n`, 'utf8')
}

async function rewriteEntries(file, entries) {
  await mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.${process.pid}.tmp`
  const body = entries.length === 0 ? '' : `${entries.map(entry => JSON.stringify(entry)).join('\n')}\n`
  await writeFile(tmp, body, 'utf8')
  await rename(tmp, file)
}

function scoreEntry(entry, queryTerms, project) {
  const haystack = `${entry.text} ${(entry.tags ?? []).join(' ')}`.toLowerCase()
  let score = 0
  let matched = false
  for (const term of queryTerms) {
    if (haystack.includes(term)) {
      score += 1
      matched = true
    }
  }
  // Importance and recency only break ties between entries that share a query term.
  if (!matched) return 0
  if (project && entry.project === project) score += 3
  if (entry.verified) score += 0.5
  score += (entry.importance ?? 3) * 0.2
  const days = (Date.now() - Date.parse(entry.updatedAt ?? entry.createdAt ?? 0)) / 86400000
  if (Number.isFinite(days)) score += 1 / (1 + Math.max(0, days) / 30)
  return score
}

/** Top matching entries; lexical overlap plus project, verification, importance, and recency. */
export function searchEntries(entries, query, { project, limit }) {
  const queryTerms = terms(query)
  if (queryTerms.length === 0) return []
  return entries
    .map(entry => ({ entry, score: scoreEntry(entry, queryTerms, project) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(result => result.entry)
}

/** Project context for a short prompt that shares no word with stored entries. */
function projectContext(entries, project, limit) {
  return entries
    .filter(entry => entry.project === project)
    .sort((a, b) => (b.importance ?? 3) - (a.importance ?? 3)
      || String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
    .slice(0, limit)
}

/** Merge entries whose normalized text is identical; the newest timestamp wins. */
export function dedupeEntries(entries) {
  const byText = new Map()
  for (const entry of entries) {
    const key = normalize(entry.text)
    const existing = byText.get(key)
    if (!existing) {
      byText.set(key, { ...entry })
      continue
    }
    existing.tags = [...new Set([...(existing.tags ?? []), ...(entry.tags ?? [])])]
    existing.importance = Math.max(existing.importance ?? 3, entry.importance ?? 3)
    existing.verified = Boolean(existing.verified || entry.verified)
    if (String(entry.updatedAt ?? '') > String(existing.updatedAt ?? '')) existing.updatedAt = entry.updatedAt
  }
  return [...byText.values()]
}

/** Keep the most valuable entries when the file exceeds its cap: verified, important, recent. */
export function compactEntries(entries, maxEntries) {
  if (entries.length <= maxEntries) return { entries, pruned: 0 }
  const rank = entry => (entry.verified ? 2 : 0) + (entry.importance ?? 3) / 10
  const kept = [...entries]
    .sort((a, b) => rank(b) - rank(a) || String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
    .slice(0, maxEntries)
  return { entries: kept, pruned: entries.length - kept.length }
}

function trimEntry(entry, maxSnippetChars) {
  return {
    id: entry.id,
    kind: entry.kind ?? 'fact',
    text: clip(entry.text, maxSnippetChars),
    project: entry.project ?? null,
    verified: Boolean(entry.verified),
    importance: entry.importance ?? 3,
    updatedAt: entry.updatedAt ?? entry.createdAt ?? null,
  }
}

/** Structured brief: the short prompt plus only the stored context that matched. */
export function buildPrompt({ prompt, project, acceptance, memories, maxSnippetChars }) {
  const lines = ['# Task', prompt, '', '# Project', project ?? 'unspecified', '', '# Context from memory']
  if (memories.length === 0) {
    lines.push('No stored context matched.')
  } else {
    for (const memory of memories) {
      const suffix = memory.project ? ` (project: ${memory.project})` : ''
      lines.push(`- [${memory.kind ?? 'fact'}] ${clip(memory.text, maxSnippetChars)}${suffix}`)
    }
  }
  lines.push('', '# Acceptance', acceptance ?? 'Not specified. Confirm the expected result before large changes.')
  return lines.join('\n')
}

export function costEstimate(inputTokens, outputTokens, prices, model) {
  const inputCostUsd = (inputTokens / 1e6) * prices.input
  const outputCostUsd = (outputTokens / 1e6) * prices.output
  return {
    model: model ?? 'deepseek',
    inputTokens,
    outputTokens,
    inputCostUsd: round6(inputCostUsd),
    outputCostUsd: round6(outputCostUsd),
    totalCostUsd: round6(inputCostUsd + outputCostUsd),
    prices,
  }
}

/** Config first, then the environment, then the harness credential store. */
async function resolveDeepSeekKey(ctx, configured) {
  if (configured) return configured
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY
  try {
    const credentials = ctx.get('credentials')
    const resolved = await credentials?.resolve('DEEPSEEK_API_KEY')
    if (resolved?.value) return resolved.value
  } catch {
    // A missing or unreadable credential store just means no balance line.
  }
  return ''
}

/** DeepSeek is the only provider with a balance endpoint wired in v1. */
async function deepseekBalance(apiKey, signal) {
  if (!apiKey) return { provider: 'deepseek', configured: false }
  try {
    const timeout = AbortSignal.timeout(8000)
    const response = await fetch('https://api.deepseek.com/user/balance', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
    if (!response.ok) return { provider: 'deepseek', configured: true, error: `HTTP ${response.status}` }
    const data = await response.json()
    return {
      provider: 'deepseek',
      configured: true,
      available: Boolean(data.is_available),
      balances: Array.isArray(data.balance_infos) ? data.balance_infos : [],
    }
  } catch (error) {
    return { provider: 'deepseek', configured: true, error: error.message }
  }
}

function balanceLine(balance) {
  if (!balance.configured) return 'DeepSeek balance: not configured (set deepseekApiKey or DEEPSEEK_API_KEY).'
  if (balance.error) return `DeepSeek balance: unavailable (${balance.error}).`
  const parts = (balance.balances ?? []).map(item => `${item.total_balance} ${item.currency}`)
  return `DeepSeek balance: ${parts.length > 0 ? parts.join(', ') : 'no balance reported'}${balance.available ? '' : ' (not available)'}.`
}

/** Shared by the `simsa_refine` tool and the `/simsa` command. */
async function refinePrompt(ctx, cfg, args, signal) {
  const prompt = String(args.prompt ?? '').trim()
  if (!prompt) throw new Error('simsa_refine requires prompt')
  const entries = await readEntries(cfg.memoryPath)
  const limit = clampInt(args.maxMemories, 0, 20, cfg.maxMemories)
  let memories = searchEntries(entries, `${prompt} ${args.project ?? ''}`, {
    project: args.project,
    limit,
  })
  const gaps = []
  if (memories.length === 0 && args.project && limit > 0) {
    memories = projectContext(entries, args.project, Math.min(3, limit))
    if (memories.length > 0) gaps.push('no prompt term matched; used project context')
  }
  if (!args.project) gaps.push('project not specified')
  if (!args.acceptance) gaps.push('acceptance criteria not specified')
  if (memories.length === 0) gaps.push('no stored memory matched')
  const refinedPrompt = buildPrompt({
    prompt,
    project: args.project,
    acceptance: args.acceptance,
    memories,
    maxSnippetChars: cfg.maxSnippetChars,
  })
  const inputTokens = estimateTokens(refinedPrompt) + cfg.baseContextTokens
  const outputTokens = clampInt(args.expectedOutputTokens, 1, 1e9, cfg.defaultOutputTokens)
  return {
    refinedPrompt,
    memories: memories.map(entry => trimEntry(entry, cfg.maxSnippetChars)),
    gaps,
    estimate: costEstimate(inputTokens, outputTokens, cfg.prices, args.model),
    balance: await deepseekBalance(await resolveDeepSeekKey(ctx, cfg.deepseekApiKey), signal),
  }
}

function memoryLine(entry, maxSnippetChars) {
  return `- [${entry.kind ?? 'fact'}] ${clip(entry.text, maxSnippetChars)} (id: ${entry.id})`
}

/** Tool output schemas are plain JSON Schema; the executor validates every returned value. */
const MEMORY_OUTPUT = {
  type: 'object',
  additionalProperties: true,
  properties: {
    action: { type: 'string' },
    updated: { type: 'boolean' },
    entry: { type: 'object', additionalProperties: true },
    count: { type: 'integer' },
    pruned: { type: 'integer' },
    results: { type: 'array', items: { type: 'object', additionalProperties: true } },
    removed: { type: 'string' },
  },
}

const ESTIMATE_OUTPUT = {
  type: 'object',
  additionalProperties: true,
  properties: {
    model: { type: 'string' },
    inputTokens: { type: 'integer' },
    outputTokens: { type: 'integer' },
    inputCostUsd: { type: 'number' },
    outputCostUsd: { type: 'number' },
    totalCostUsd: { type: 'number' },
    prices: { type: 'object', additionalProperties: true },
  },
}

const BALANCE_OUTPUT = { type: 'object', additionalProperties: true }

/**
 * Register the three tools and the gate instruction.
 * @param ctx - registrant context carrying the tool and prompt registries.
 * @param config - bundle row configuration; every field is optional.
 */
export function apply(ctx, config) {
  const cfg = {
    ...DEFAULTS,
    ...(config ?? {}),
    prices: { ...DEFAULTS.prices, ...(config?.prices ?? {}) },
  }
  // Config is user-edited YAML; clamp the numbers the code relies on.
  cfg.maxMemories = clampInt(cfg.maxMemories, 0, 20, DEFAULTS.maxMemories)
  cfg.maxSnippetChars = clampInt(cfg.maxSnippetChars, 50, 4000, DEFAULTS.maxSnippetChars)
  cfg.maxEntries = clampInt(cfg.maxEntries, 1, 1e6, DEFAULTS.maxEntries)
  cfg.baseContextTokens = clampInt(cfg.baseContextTokens, 0, 1e9, DEFAULTS.baseContextTokens)
  cfg.defaultOutputTokens = clampInt(cfg.defaultOutputTokens, 1, 1e9, DEFAULTS.defaultOutputTokens)

  ctx.systemPrompt.section({
    name: 'simsa',
    order: 4000,
    text: '## Simsa\n'
      + 'For a short or underspecified request, call `simsa_refine` first and work from its `refinedPrompt`. '
      + 'Save durable facts and preferences with `simsa_memory` (action `save`). '
      + 'Check `simsa_costs` before an expensive run.',
  })

  ctx.tools.register({
    name: 'simsa_memory',
    description: 'Save, search, list, or forget durable knowledge about the user. Search returns only the few matching entries, so it is cheaper than loading the whole memory file.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['action'],
      properties: {
        action: { type: 'string', enum: ['save', 'search', 'list', 'forget'], description: 'save (add or update), search (ranked match), list (recent), forget (delete by id).' },
        text: { type: 'string', description: 'The fact to remember. Required for save.' },
        kind: { type: 'string', enum: KINDS, description: 'profile, preference, fact, decision, or project. Defaults to fact.' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Extra search terms.' },
        project: { type: 'string', description: 'Project this knowledge belongs to.' },
        verified: { type: 'boolean', description: 'True only for knowledge the user confirmed.' },
        importance: { type: 'integer', description: '1-5; higher ranks earlier. Defaults to 3.' },
        query: { type: 'string', description: 'Search terms. Required for search.' },
        id: { type: 'string', description: 'Entry id. Required for forget.' },
        limit: { type: 'integer', description: 'Maximum results. Defaults to the configured maxMemories.' },
      },
    },
    output: {
      schema: MEMORY_OUTPUT,
      render(_args, value) {
        if (value.action === 'save') {
          const verb = value.updated ? 'Updated' : 'Saved'
          const pruned = value.pruned ? ` Pruned ${value.pruned} older entries.` : ''
          return [{ type: 'text', text: `${verb} memory ${value.entry.id} [${value.entry.kind}]: ${clip(value.entry.text, 200)}${pruned}` }]
        }
        if (value.action === 'forget') return [{ type: 'text', text: `Removed memory ${value.removed}.` }]
        if (value.count === 0) {
          return [{ type: 'text', text: value.action === 'search' ? 'No matching memories.' : 'No stored memories.' }]
        }
        const lines = value.results.map(entry => memoryLine(entry, cfg.maxSnippetChars))
        return [{ type: 'text', text: `${value.count} ${value.action === 'search' ? 'matching' : 'stored'} memories:\n${lines.join('\n')}` }]
      },
    },
    async execute(args) {
      const file = cfg.memoryPath
      if (args.action === 'save') {
        const text = String(args.text ?? '').trim()
        if (!text) throw new Error('simsa_memory save requires text')
        const entries = await readEntries(file)
        const existing = entries.find(entry => normalize(entry.text) === normalize(text))
        const now = new Date().toISOString()
        if (existing) {
          existing.tags = [...new Set([...(existing.tags ?? []), ...(args.tags ?? [])])]
          existing.importance = Math.max(existing.importance ?? 3, clampInt(args.importance, 1, 5, 3))
          existing.verified = Boolean(existing.verified || args.verified)
          existing.updatedAt = now
          if (args.project) existing.project = args.project
          await rewriteEntries(file, entries)
          return { action: 'save', updated: true, entry: existing }
        }
        const entry = {
          id: `m_${Date.now().toString(36)}_${randomUUID().slice(0, 6)}`,
          text,
          kind: args.kind ?? 'fact',
          tags: args.tags ?? [],
          project: args.project ?? null,
          verified: Boolean(args.verified),
          importance: clampInt(args.importance, 1, 5, 3),
          createdAt: now,
          updatedAt: now,
        }
        await appendEntry(file, entry)
        entries.push(entry)
        if (entries.length > cfg.maxEntries) {
          const compacted = compactEntries(entries, cfg.maxEntries)
          await rewriteEntries(file, compacted.entries)
          return { action: 'save', updated: false, entry, pruned: compacted.pruned }
        }
        return { action: 'save', updated: false, entry }
      }
      if (args.action === 'search') {
        const entries = await readEntries(file)
        const results = searchEntries(entries, args.query ?? '', {
          project: args.project,
          limit: clampInt(args.limit, 1, 50, cfg.maxMemories),
        })
        return { action: 'search', count: results.length, results: results.map(entry => trimEntry(entry, cfg.maxSnippetChars)) }
      }
      if (args.action === 'list') {
        const entries = await readEntries(file)
        const filtered = args.project ? entries.filter(entry => entry.project === args.project) : entries
        const sorted = filtered.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
        const results = sorted.slice(0, clampInt(args.limit, 1, 50, 50)).map(entry => trimEntry(entry, cfg.maxSnippetChars))
        return { action: 'list', count: filtered.length, results }
      }
      if (args.action === 'forget') {
        if (!args.id) throw new Error('simsa_memory forget requires id')
        const entries = await readEntries(file)
        const next = entries.filter(entry => entry.id !== args.id)
        if (next.length === entries.length) throw new Error(`no memory with id ${args.id}`)
        await rewriteEntries(file, next)
        return { action: 'forget', removed: args.id }
      }
      throw new Error(`unknown action ${args.action}`)
    },
  })

  ctx.tools.register({
    name: 'simsa_refine',
    description: 'Expand a short prompt into a working brief using stored memory, then estimate its token cost. Call this before starting an underspecified request.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['prompt'],
      properties: {
        prompt: { type: 'string', description: 'The user request, verbatim.' },
        project: { type: 'string', description: 'Project name; boosts matching memories.' },
        acceptance: { type: 'string', description: 'What done looks like, when the user stated it.' },
        maxMemories: { type: 'integer', description: 'Memories to include. Defaults to the configured maxMemories.' },
        expectedOutputTokens: { type: 'integer', description: 'Expected reply size. Defaults to the configured defaultOutputTokens.' },
        model: { type: 'string', description: 'Label for the estimate. Defaults to deepseek.' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['refinedPrompt', 'memories', 'gaps', 'estimate', 'balance'],
        properties: {
          refinedPrompt: { type: 'string' },
          memories: { type: 'array', items: { type: 'object', additionalProperties: true } },
          gaps: { type: 'array', items: { type: 'string' } },
          estimate: ESTIMATE_OUTPUT,
          balance: BALANCE_OUTPUT,
        },
      },
      render(_args, value) {
        const estimate = value.estimate
        return [{
          type: 'text',
          text: `${value.refinedPrompt}\n\n---\nEstimated ${estimate.inputTokens} input + ${estimate.outputTokens} output tokens ≈ $${estimate.totalCostUsd} (${estimate.model}). ${balanceLine(value.balance)}`,
        }]
      },
    },
    async execute(args, exec) {
      return refinePrompt(ctx, cfg, args, exec.signal)
    },
  })

  ctx.tools.register({
    name: 'simsa_costs',
    description: 'Estimate the USD cost of a run from token counts and report the DeepSeek account balance.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        inputTokens: { type: 'integer', description: 'Input tokens. Defaults to the configured baseContextTokens.' },
        outputTokens: { type: 'integer', description: 'Output tokens. Defaults to the configured defaultOutputTokens.' },
        model: { type: 'string', description: 'Label for the estimate. Defaults to deepseek.' },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['estimate', 'balance'],
        properties: { estimate: ESTIMATE_OUTPUT, balance: BALANCE_OUTPUT },
      },
      render(_args, value) {
        const estimate = value.estimate
        return [{
          type: 'text',
          text: `${estimate.inputTokens} input + ${estimate.outputTokens} output tokens ≈ $${estimate.totalCostUsd} (${estimate.model}). ${balanceLine(value.balance)}`,
        }]
      },
    },
    async execute(args, exec) {
      const inputTokens = clampInt(args.inputTokens, 0, 1e9, cfg.baseContextTokens)
      const outputTokens = clampInt(args.outputTokens, 0, 1e9, cfg.defaultOutputTokens)
      return {
        estimate: costEstimate(inputTokens, outputTokens, cfg.prices, args.model),
        balance: await deepseekBalance(await resolveDeepSeekKey(ctx, cfg.deepseekApiKey), exec.signal),
      }
    },
  })

  const aiHandler = async ({ agent, rawInput, signal }) => {
    const input = rawInput.trim()
    if (!input) return { kind: 'error', text: USAGE }
    if (input === 'compact') {
      const entries = await readEntries(cfg.memoryPath)
      const deduped = dedupeEntries(entries)
      const compacted = compactEntries(deduped, cfg.maxEntries)
      await rewriteEntries(cfg.memoryPath, compacted.entries)
      return {
        kind: 'success',
        text: `Memory compacted: ${entries.length} → ${compacted.entries.length} entries `
          + `(${entries.length - deduped.length} duplicates merged, ${compacted.pruned} pruned).`,
      }
    }
    const showOnly = /^show\s+/u.test(input)
    const prompt = showOnly ? input.replace(/^show\s+/u, '') : input
    if (!prompt) return { kind: 'error', text: USAGE }
    const result = await refinePrompt(ctx, cfg, { prompt }, signal)
    const estimate = result.estimate
    const summary = `Estimated ${estimate.inputTokens} input + ${estimate.outputTokens} output tokens ≈ $${estimate.totalCostUsd} (${estimate.model}). ${balanceLine(result.balance)}`
    if (showOnly) return { kind: 'success', text: `${result.refinedPrompt}\n\n---\n${summary}` }
    agent.followup(Object.freeze({
      id: randomUUID(),
      role: 'user',
      content: Object.freeze([Object.freeze({ type: 'text', text: result.refinedPrompt })]),
      source: Object.freeze({ kind: 'user' }),
    }))
    const gaps = result.gaps.length > 0 ? `\nGaps: ${result.gaps.join('; ')}.` : ''
    return { kind: 'success', text: `Refined and submitted. ${summary}${gaps}` }
  }

  for (const name of ['simsa', 's']) {
    ctx.commands.register({
      name,
      description: 'Refine a short prompt with stored memory, then submit it to the agent.',
      input: { hint: '<prompt> | show <prompt> | compact' },
      handler: aiHandler,
    })
  }
}
