/**
 * Host half of the turn-stats bundle.
 *
 * Folds durable Session events into one statistics record per Turn and serves
 * the whole map to the browser as the `turnStats` projection wire view, so the
 * status bar under a finished reply never folds the log itself.
 *
 * Each Step's provider-reported usage is attributed to one phase — think, plan,
 * read, code, test, verify, run, delegate — by the tools that Step called. The
 * attribution is an estimate: a Step that edited a file and then ran a command
 * counts as coding, because the edit is what the tokens were mostly spent on.
 *
 * @module @local/turn-stats
 */

/** Cordis plugin name. */
export const name = 'turn-stats'

/** The projection registry is this plugin's whole purpose; without it the fiber stays pending. */
export const inject = ['sessionProjections']

/**
 * USD per one million tokens, used to price each Turn from provider-reported
 * usage. Edit these four numbers to match your provider's current price list;
 * the status bar reports the result as an estimate.
 */
const PRICE = {
  input: 0.28,
  cacheRead: 0.028,
  cacheWrite: 0.28,
  output: 0.42,
}

/** Turns kept in the wire view; older Turns simply lose their status bar. */
const MAX_TURNS = 200

/** Name of the tool the model calls to load a skill. */
const SKILL_TOOL = 'skill'

/** Name of the tool the model calls to read a file. */
const READ_TOOL = 'read'

/** Name of the tool the model calls to run a command. */
const EXEC_TOOL = 'bash'

/** Files matching this pattern count as markdown delivered to the prompt. */
const MARKDOWN = /\.(md|mdx|markdown)$/i

/** Catalog cap; the badge lists the loaded set, so a Session never needs more. */
const MAX_FILES = 300

/** Per-call rows kept for one Turn; a long Turn still aggregates its tools. */
const MAX_CALLS = 120

/** Turns whose per-call rows stay on the wire; older Turns keep their per-tool totals. */
const CALL_TURN_WINDOW = 10

/** Tools whose call means the Step was planning rather than doing. */
const PLAN_TOOLS = new Set(['todo_write', 'todo_read', 'exit_plan_mode', 'enter_plan_mode'])

/** Tools that change files; the Step's tokens belong to coding. */
const CODE_TOOLS = new Set(['edit', 'write'])

/** Tools that only look at the workspace or the web. */
const INSPECT_TOOLS = new Set(['read', 'grep', 'glob', 'web_search', 'web_fetch'])

/** Delegation tools; their children keep their own usage, which this Session never sees. */
const DELEGATE_TOOLS = new Set(['subagent', 'subagent_fork'])

/** Commands a Step is likely to have run a test suite with. */
const TEST_COMMAND =
  /\b(?:pnpm|npm|yarn|bun)\s+(?:run\s+)?test\b|\b(?:vitest|jest|pytest|mocha|playwright|cypress|rspec|phpunit)\b|\bcargo\s+test\b|\bgo\s+test\b|\bmake\s+test\b|\bswift\s+test\b/i

/**
 * The registry only needs `parse` on a schema; this unit validates its own
 * values and keeps the dependency surface empty.
 */
const openSchema = { parse: (value) => value }

/**
 * One phase's counters before they are priced.
 * @returns {object} a zeroed bucket.
 */
function blankPhase() {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    ms: 0,
    calls: 0,
    tools: {},
    callLog: [],
  }
}

/**
 * One Turn's counters before they are priced.
 * @param {number} turn - Turn number.
 * @returns {object} a zeroed record.
 */
function blankTurn(turn) {
  return {
    turn,
    startedAt: null,
    endedAt: null,
    requests: 0,
    responses: 0,
    retries: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    llmMs: 0,
    reasoningMs: 0,
    toolMs: 0,
    toolCalls: 0,
    contexts: 0,
    steps: 0,
    /** Largest prompt this Turn sent: input + cache read + cache write of its widest request. */
    promptTokens: 0,
    model: null,
    skills: [],
    fileCount: 0,
    phases: {},
    tools: {},
    agents: [],
  }
}

/**
 * Sum the four priced token classes of one counter group.
 * @param {object} usage - a Turn or phase bucket.
 * @returns {number} billable tokens.
 */
function billable(usage) {
  return usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens + usage.outputTokens
}

/**
 * Price one counter group.
 * @param {object} usage - a Turn or phase bucket.
 * @returns {number} USD.
 */
function costOf(usage) {
  return (
    (usage.inputTokens * PRICE.input +
      usage.cacheReadTokens * PRICE.cacheRead +
      usage.cacheWriteTokens * PRICE.cacheWrite +
      usage.outputTokens * PRICE.output) /
    1e6
  )
}

/**
 * Add the derived figures a Turn record publishes.
 * @param {object} turn - counters.
 * @returns {object} the same counters plus cost, wall time, and priced phases.
 */
function priced(turn) {
  const phases = {}
  for (const [phase, bucket] of Object.entries(turn.phases)) {
    const tools = {}
    for (const [name, stat] of Object.entries(bucket.tools ?? {})) {
      tools[name] = { ...stat, tokens: billable(stat), costUsd: costOf(stat) }
    }
    const callLog = (bucket.callLog ?? []).map((call) => ({ ...call, tokens: billable(call), costUsd: costOf(call) }))
    phases[phase] = { ...bucket, tools, callLog, tokens: billable(bucket), costUsd: costOf(bucket) }
  }
  return {
    ...turn,
    phases,
    tokens: billable(turn),
    costUsd: costOf(turn),
    durationMs: turn.startedAt === null || turn.endedAt === null ? null : Math.max(0, turn.endedAt - turn.startedAt),
  }
}

/**
 * Rebuild one Turn record and publish a fresh view object, which is what makes
 * the registry notify carriers.
 * @param {object} state - fold state.
 * @param {number} turn - Turn number.
 * @param {(draft: object) => void} change - in-place edit of the draft.
 * @returns {object} the next state.
 */
function edit(state, turn, change) {
  const draft = { ...(state.turns[turn] ?? blankTurn(turn)) }
  change(draft)
  const turns = { ...state.turns, [turn]: priced(draft) }
  return { ...state, turns, view: { turns, files: state.files } }
}

/**
 * Last path segment, used as the badge's short label.
 * @param {string} path - absolute or workspace-relative path.
 * @returns {string} the file name.
 */
function baseName(path) {
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
}

/**
 * Shared view object for the current Turn map and file catalog.
 * @param {object} turns - next Turn map.
 * @param {object[]} files - next catalog.
 * @returns {object} the wire view.
 */
function publish(turns, files) {
  return { turns, files }
}

/**
 * Append markdown files the prompt received to the Session catalog, then move the
 * open Turn's count to the new total. The catalog is append-only so a Turn's
 * `fileCount` stays a stable prefix index.
 * @param {object} state - fold state.
 * @param {{path: string, kind: string, at?: number, turn?: number}[]} additions - files to register.
 * @returns {object} the next state.
 */
function noteFiles(state, additions) {
  let files = state.files
  let index = state.fileIndex
  for (const addition of additions) {
    if (addition.path === '' || index[addition.path] !== undefined) continue
    if (files.length >= MAX_FILES) break
    files = files.concat({
      path: addition.path,
      name: baseName(addition.path),
      kind: addition.kind,
      at: addition.at ?? null,
      turn: addition.turn ?? null,
    })
    index = { ...index, [addition.path]: files.length - 1 }
  }
  if (files === state.files) return state
  return syncOpenTurn({ ...state, files, fileIndex: index, view: publish(state.turns, files) })
}

/**
 * Mark instruction files the plugin reported as gone; earlier Turns keep their record.
 * @param {object} state - fold state.
 * @param {string[]} paths - removed paths.
 * @returns {object} the next state.
 */
function dropFiles(state, paths) {
  let files = state.files
  let index = state.fileIndex
  for (const path of paths) {
    const at = index[path]
    if (at === undefined) continue
    if (files === state.files) files = files.slice()
    files[at] = { ...files[at], removed: true }
    if (index === state.fileIndex) index = { ...index }
    delete index[path]
  }
  if (files === state.files) return state
  return { ...state, files, fileIndex: index, view: publish(state.turns, files) }
}

/**
 * Keep the open Turn's file count in step with the catalog.
 * @param {object} state - fold state.
 * @returns {object} possibly edited state.
 */
function syncOpenTurn(state) {
  const turn = state.openTurn
  if (turn === null) return state
  const record = state.turns[turn]
  if (record === undefined || record.fileCount === state.files.length) return state
  return edit(state, turn, (draft) => {
    draft.fileCount = state.files.length
  })
}

/**
 * Instruction files an Agent Instructions message delivered to the prompt.
 * @param {unknown} source - user message source.
 * @returns {{add: string[], remove: string[]} | undefined} the reported changes.
 */
function instructionChanges(source) {
  if (typeof source !== 'object' || source === null || source.kind !== 'agent-instructions') return undefined
  if (!Array.isArray(source.changes)) return undefined
  const add = []
  const remove = []
  for (const change of source.changes) {
    if (typeof change !== 'object' || change === null) continue
    if (typeof change.path !== 'string' || change.path === '') continue
    if (change.action === 'remove') remove.push(change.path)
    else if (change.action === 'set' || change.action === 'replace') add.push(change.path)
  }
  return { add, remove }
}

/**
 * Markdown file a `read` call put in front of the model.
 * @param {string} tool - tool name.
 * @param {string} argumentsText - raw JSON arguments.
 * @returns {string | undefined} the file path.
 */
function readPath(tool, argumentsText) {
  if (tool !== READ_TOOL || typeof argumentsText !== 'string') return undefined
  try {
    const parsed = JSON.parse(argumentsText)
    return typeof parsed?.file_path === 'string' && MARKDOWN.test(parsed.file_path) ? parsed.file_path : undefined
  } catch {
    return undefined
  }
}

/**
 * Command a `bash` call asked to run, used only to tell tests from other work.
 * @param {string} tool - tool name.
 * @param {string} argumentsText - raw JSON arguments.
 * @returns {string} the command text, or an empty string.
 */
function commandText(tool, argumentsText) {
  if (tool !== EXEC_TOOL || typeof argumentsText !== 'string') return ''
  try {
    const parsed = JSON.parse(argumentsText)
    return typeof parsed?.command === 'string' ? parsed.command : ''
  } catch {
    return ''
  }
}

/**
 * What a tool call was asked to do, short enough for one row.
 * @param {string} tool - tool name.
 * @param {unknown} argumentsText - raw JSON arguments.
 * @returns {string} the command, path, pattern, or name, else an empty string.
 */
function callLabel(tool, argumentsText) {
  if (typeof argumentsText !== 'string') return ''
  try {
    const parsed = JSON.parse(argumentsText)
    if (typeof parsed?.command === 'string') return parsed.command.replace(/\s+/g, ' ').trim().slice(0, 140)
    if (typeof parsed?.file_path === 'string') return parsed.file_path
    if (typeof parsed?.path === 'string') return parsed.path
    if (typeof parsed?.pattern === 'string') return parsed.pattern
    if (typeof parsed?.url === 'string') return parsed.url
    if (typeof parsed?.name === 'string') return parsed.name
    if (typeof parsed?.description === 'string') return parsed.description
  } catch {
    return ''
  }
  return ''
}

/**
 * Non-negative finite count, or zero.
 * @param {unknown} value - provider figure.
 * @returns {number} a safe count.
 */
function count(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

/**
 * Add one usage report to a Turn.
 * @param {object} draft - Turn record being edited.
 * @param {unknown} usage - provider TokenUsage.
 */
function addUsage(draft, usage) {
  if (typeof usage !== 'object' || usage === null) return
  draft.inputTokens += count(usage.inputTokens)
  draft.outputTokens += count(usage.outputTokens)
  draft.cacheReadTokens += count(usage.cacheReadTokens)
  draft.cacheWriteTokens += count(usage.cacheWriteTokens)
  draft.reasoningTokens += count(usage.reasoningTokens)
}

/**
 * Copy one usage report into a phase bucket.
 * @param {object} bucket - phase counters.
 * @param {unknown} usage - provider TokenUsage.
 */
function addPhaseUsage(bucket, usage) {
  if (typeof usage !== 'object' || usage === null) return
  bucket.inputTokens += count(usage.inputTokens)
  bucket.outputTokens += count(usage.outputTokens)
  bucket.cacheReadTokens += count(usage.cacheReadTokens)
  bucket.cacheWriteTokens += count(usage.cacheWriteTokens)
  bucket.reasoningTokens += count(usage.reasoningTokens)
}

/**
 * The last usage sample a durable stream carries.
 * @param {unknown} stream - compact AssistantStreamRecord list.
 * @returns {object | undefined} the usage record.
 */
function streamUsage(stream) {
  if (!Array.isArray(stream)) return undefined
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index]
    if (record && record.type === 'chunk' && record.chunk && record.chunk.type === 'usage') return record.chunk.usage
  }
  return undefined
}

/**
 * Reconstruct the timestamps of one packed delta run.
 * @param {object} record - a packed AssistantStreamRecord.
 * @returns {number[]} one time per member.
 */
function runTimes(record) {
  const length = record.type === 'tool-call-chunks' ? record.args.length : record.texts.length
  const times = []
  let time = record.time0
  for (let index = 0; index < length; index += 1) {
    if (index > 0) time += record.dt[index - 1] ?? 0
    times.push(time)
  }
  return times
}

/**
 * First and last moment the model spent emitting reasoning tokens.
 * @param {unknown} stream - compact AssistantStreamRecord list.
 * @returns {{first: number, last: number} | undefined} the reasoning window.
 */
function reasoningSpan(stream) {
  if (!Array.isArray(stream)) return undefined
  let first
  let last
  const note = (time) => {
    if (typeof time !== 'number' || !Number.isFinite(time)) return
    if (first === undefined) first = time
    last = time
  }
  for (const record of stream) {
    if (!record) continue
    if (record.type === 'chunk') {
      if (record.chunk && record.chunk.type === 'reasoning-delta' && record.chunk.text !== '') note(record.time)
      continue
    }
    if (record.type === 'reasoning-chunks') for (const time of runTimes(record)) note(time)
  }
  return first === undefined ? undefined : { first, last }
}

/**
 * The skill a `skill` tool call asked to load.
 * @param {string} tool - tool name.
 * @param {string} argumentsText - raw JSON arguments.
 * @returns {string | undefined} the skill name.
 */
function skillName(tool, argumentsText) {
  if (tool !== SKILL_TOOL || typeof argumentsText !== 'string') return undefined
  try {
    const parsed = JSON.parse(argumentsText)
    return typeof parsed?.name === 'string' && parsed.name !== '' ? parsed.name : undefined
  } catch {
    return undefined
  }
}

/**
 * One delegation record. The name is the one the Harness defines — the selected
 * `agent_preset`, or the delegation tool itself — never the caller's task wording.
 * Child usage is not reported to the parent Session, so only the call is measurable.
 * @param {string} tool - delegation tool name.
 * @param {unknown} argumentsText - raw JSON arguments.
 * @param {unknown} callId - the call identity.
 * @param {number} time - start time.
 * @returns {object} the record.
 */
function agentRecord(tool, argumentsText, callId, time) {
  let preset
  let route
  let task
  if (typeof argumentsText === 'string') {
    try {
      const parsed = JSON.parse(argumentsText)
      if (typeof parsed?.agent_preset === 'string' && parsed.agent_preset !== '') preset = parsed.agent_preset
      if (typeof parsed?.provider === 'string' && parsed.provider !== '' && typeof parsed?.model === 'string' && parsed.model !== '') {
        route = parsed.provider + '/' + parsed.model
      }
      if (typeof parsed?.description === 'string' && parsed.description !== '') task = parsed.description
    } catch {
      // keep the tool name
    }
  }
  return {
    id: String(callId),
    name: preset ?? tool,
    tool,
    route: route ?? null,
    task: task === undefined ? null : task.slice(0, 120),
    startedAt: time,
    ms: 0,
  }
}

/**
 * Which phase a Step's usage belongs to, judged by the tools it called.
 * @param {{tools: string[], commands: string[]}} step - the Step about to close.
 * @param {boolean} hasCode - whether this Turn already edited files.
 * @returns {string} the phase key.
 */
function phaseOf(step, hasCode) {
  const tools = step.tools
  if (tools.length === 0) return 'think'
  if (tools.some((tool) => CODE_TOOLS.has(tool))) return 'code'
  if (tools.includes(EXEC_TOOL) && step.commands.some((command) => TEST_COMMAND.test(command))) return 'test'
  if (tools.some((tool) => DELEGATE_TOOLS.has(tool))) return 'delegate'
  if (tools.some((tool) => PLAN_TOOLS.has(tool))) return 'plan'
  if (tools.includes(EXEC_TOOL)) return 'run'
  if (tools.some((tool) => INSPECT_TOOLS.has(tool))) return hasCode ? 'verify' : 'read'
  return 'other'
}

/**
 * Close the open Step: attribute its usage to a phase and count it.
 * @param {object} state - fold state.
 * @returns {object} the next state.
 */
function closeStep(state) {
  const step = state.step
  if (step === null || step.usage === undefined) return state
  const record = state.turns[step.turn]
  if (record === undefined) return state
  const phase = phaseOf(step, record.phases.code !== undefined)
  const calls = Array.isArray(step.calls) ? step.calls : []
  // One Step's usage covers the message that requested its calls, so the per-call figures
  // are an even share of that usage: a partition of real tokens, not a second measurement.
  const share = calls.length > 0 ? 1 / calls.length : 0
  const next = edit(state, step.turn, (draft) => {
    const bucket = { ...blankPhase(), ...(draft.phases[phase] ?? {}) }
    addPhaseUsage(bucket, step.usage)
    bucket.ms += step.llmMs
    bucket.calls += calls.length
    const tools = { ...bucket.tools }
    const callLog = (bucket.callLog ?? []).slice()
    for (const call of calls) {
      const part = {
        inputTokens: count(step.usage?.inputTokens) * share,
        outputTokens: count(step.usage?.outputTokens) * share,
        cacheReadTokens: count(step.usage?.cacheReadTokens) * share,
        cacheWriteTokens: count(step.usage?.cacheWriteTokens) * share,
        reasoningTokens: count(step.usage?.reasoningTokens) * share,
      }
      const tool = tools[call.name] ?? {
        calls: 0,
        ms: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 0,
      }
      tools[call.name] = {
        calls: tool.calls + 1,
        ms: tool.ms + (Number(call.ms) || 0),
        inputTokens: tool.inputTokens + part.inputTokens,
        outputTokens: tool.outputTokens + part.outputTokens,
        cacheReadTokens: tool.cacheReadTokens + part.cacheReadTokens,
        cacheWriteTokens: tool.cacheWriteTokens + part.cacheWriteTokens,
        reasoningTokens: tool.reasoningTokens + part.reasoningTokens,
      }
      if (callLog.length < MAX_CALLS) {
        callLog.push({ id: call.id, name: call.name, label: call.label, ms: Number(call.ms) || 0, ...part })
      }
    }
    bucket.tools = tools
    bucket.callLog = callLog
    draft.phases = { ...draft.phases, [phase]: bucket }
    draft.steps += 1
  })
  return { ...next, step: null }
}

/**
 * Drop per-call rows from Turns older than the window; their per-tool totals stay.
 * @param {object} state - fold state.
 * @param {number} currentTurn - the Turn that just ended.
 * @returns {object} the next state.
 */
function trimCalls(state, currentTurn) {
  const cutoff = currentTurn - CALL_TURN_WINDOW
  let changed = false
  const turns = {}
  for (const [key, turn] of Object.entries(state.turns)) {
    if (Number(key) >= cutoff) {
      turns[key] = turn
      continue
    }
    let touched = false
    const phases = {}
    for (const [name, bucket] of Object.entries(turn.phases)) {
      if (Array.isArray(bucket.callLog) && bucket.callLog.length > 0) {
        phases[name] = { ...bucket, callLog: [] }
        touched = true
      } else {
        phases[name] = bucket
      }
    }
    turns[key] = touched ? { ...turn, phases } : turn
    changed = changed || touched
  }
  return changed ? { ...state, turns, view: publish(turns, state.files) } : state
}

/**
 * Keep only the most recent Turns so a long Session cannot grow without bound.
 * @param {object} state - fold state.
 * @returns {object} possibly pruned state.
 */
function prune(state) {
  const keys = Object.keys(state.turns)
  if (keys.length <= MAX_TURNS) return state
  const keep = keys
    .map(Number)
    .sort((left, right) => left - right)
    .slice(-MAX_TURNS)
  const turns = {}
  for (const turn of keep) turns[turn] = state.turns[turn]
  return { ...state, turns, view: publish(turns, state.files) }
}

/** The `turnStats` unit served to the browser. */
const turnStatsProjection = {
  key: 'turnStats',
  stateVersion: 4,
  stateSchema: openSchema,
  init: () => ({
    turns: {},
    files: [],
    fileIndex: {},
    view: publish({}, []),
    openTurn: null,
    step: null,
    calls: {},
  }),
  apply: (state, event) => {
    switch (event.type) {
      case 'turn/start': {
        const next = edit(state, event.data.turn, (draft) => {
          draft.startedAt = event.time
          draft.fileCount = state.files.length
        })
        return { ...next, openTurn: event.data.turn, step: null, calls: {} }
      }
      case 'step/start': {
        const closed = closeStep(state)
        const next = edit(closed, event.data.turn, (draft) => {
          draft.requests += 1
        })
        return {
          ...next,
          step: {
            turn: event.data.turn,
            number: event.data.step,
            startTime: event.time,
            reasoningFirst: null,
            reasoningLast: null,
            usage: undefined,
            llmMs: 0,
            tools: [],
            commands: [],
            calls: [],
          },
        }
      }
      case 'llm/retry-started': {
        return edit(state, event.data.turn, (draft) => {
          draft.requests += 1
        })
      }
      case 'assistant/attempt': {
        const step = state.step
        if (step === null || step.turn !== event.data.turn || step.number !== event.data.step) return state
        const span = reasoningSpan(event.data.stream)
        if (span === undefined) return state
        const first = step.reasoningFirst === null ? span.first : Math.min(step.reasoningFirst, span.first)
        const last = step.reasoningLast === null ? span.last : Math.max(step.reasoningLast, span.last)
        if (first === step.reasoningFirst && last === step.reasoningLast) return state
        return { ...state, step: { ...step, reasoningFirst: first, reasoningLast: last } }
      }
      case 'assistant/message': {
        const step = state.step
        if (step === null || step.turn !== event.data.turn || step.number !== event.data.step) return state
        const usage = event.data.usage ?? streamUsage(event.data.stream)
        const model = event.data.message?.source?.model
        const span =
          step.reasoningFirst !== null && step.reasoningLast !== null
            ? Math.max(0, step.reasoningLast - step.reasoningFirst)
            : 0
        const llmMs = Math.max(0, event.time - step.startTime)
        const prompt =
          typeof usage === 'object' && usage !== null
            ? count(usage.inputTokens) + count(usage.cacheReadTokens) + count(usage.cacheWriteTokens)
            : 0
        const next = edit(state, event.data.turn, (draft) => {
          draft.responses += 1
          draft.llmMs += llmMs
          draft.reasoningMs += span
          if (typeof model === 'string' && model !== '') draft.model = model
          if (prompt > draft.promptTokens) draft.promptTokens = prompt
          addUsage(draft, usage)
        })
        return { ...next, step: { ...step, usage, llmMs } }
      }
      case 'tool/call': {
        const read = readPath(event.data.name, event.data.arguments)
        const noted =
          read === undefined
            ? state
            : noteFiles(state, [{ path: read, kind: 'read', at: event.time, turn: event.data.turn }])
        const name = String(event.data.name)
        const callId = String(event.data.callId)
        const next = edit(noted, event.data.turn, (draft) => {
          draft.toolCalls += 1
          draft.tools = { ...draft.tools, [name]: (draft.tools[name] ?? 0) + 1 }
          const skill = skillName(name, event.data.arguments)
          // Replace rather than push: `draft` shares this array with the record it was copied from.
          if (skill !== undefined && !draft.skills.includes(skill)) draft.skills = draft.skills.concat(skill)
          if (DELEGATE_TOOLS.has(name)) {
            draft.agents = draft.agents.concat(agentRecord(name, event.data.arguments, callId, event.time))
          }
        })
        const step = next.step
        const command = commandText(name, event.data.arguments)
        const stepNext =
          step === null
            ? next
            : {
                ...next,
                step: {
                  ...step,
                  tools: step.tools.concat(name),
                  commands: command === '' ? step.commands : step.commands.concat(command),
                  calls: (step.calls ?? []).concat({
                    id: callId,
                    name,
                    label: callLabel(name, event.data.arguments),
                    ms: 0,
                  }),
                },
              }
        return { ...stepNext, calls: { ...stepNext.calls, [callId]: event.time } }
      }
      case 'tool/result': {
        const callId = String(event.data.message?.toolCallId ?? event.data.message?.source?.callId ?? '')
        const started = callId === '' ? undefined : state.calls[callId]
        if (started === undefined) return state
        const calls = { ...state.calls }
        delete calls[callId]
        const elapsed = Math.max(0, event.time - started)
        const edited = edit(state, event.data.turn, (draft) => {
          draft.toolMs += elapsed
          const agents = draft.agents ?? []
          const index = agents.findIndex((agent) => agent.id === callId)
          if (index !== -1) {
            const nextAgents = agents.slice()
            nextAgents[index] = { ...nextAgents[index], ms: elapsed }
            draft.agents = nextAgents
          }
        })
        const step = edited.step
        return {
          ...edited,
          step:
            step === null
              ? null
              : {
                  ...step,
                  calls: (step.calls ?? []).map((call) => (call.id === callId ? { ...call, ms: elapsed } : call)),
                },
          calls,
        }
      }
      case 'user/message': {
        const changes = instructionChanges(event.data?.source)
        if (changes === undefined) return state
        const added = noteFiles(
          state,
          changes.add.map((path) => ({ path, kind: 'instructions', at: event.time, turn: state.openTurn })),
        )
        return syncOpenTurn(dropFiles(added, changes.remove))
      }
      case 'system/message':
      case 'developer/message': {
        return edit(state, event.data.turn, (draft) => {
          draft.contexts += 1
        })
      }
      case 'request/context': {
        if (typeof event.data?.model !== 'string' || event.data.model === '') return state
        const model = event.data.model
        if (state.openTurn === null) return state
        const turn = state.turns[state.openTurn]
        if (turn !== undefined && turn.model === model) return state
        return edit(state, state.openTurn, (draft) => {
          draft.model = model
        })
      }
      case 'turn/end': {
        const closed = closeStep(state)
        const next = edit(closed, event.data.turn, (draft) => {
          draft.endedAt = event.time
        })
        return { ...trimCalls(prune(next), event.data.turn), openTurn: null, step: null, calls: {} }
      }
      default:
        return state
    }
  },
  wire: {
    viewSchema: openSchema,
    view: (state) => state.view,
  },
}

/**
 * Register the unit; the registration is an effect on this fiber.
 * @param {object} ctx - host context carrying the projection registry.
 */
export function apply(ctx) {
  ctx.sessionProjections.register(turnStatsProjection)
}
