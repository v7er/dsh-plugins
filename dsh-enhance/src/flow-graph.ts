/**
 * Pure turn-to-graph projection for the Flow view.
 *
 * The view is a task map, not a chronological transcript: Turn -> Verify ->
 * Planning -> one task group per planned todo. Each task group owns the
 * thinking/code/test/verify checks that resolve it. A SQLite-backed event log
 * fills gaps left by the live Trajectory window.
 */

export type FlowPhase =
  | 'clarify'
  | 'thinking'
  | 'verify'
  | 'planning'
  | 'coding'
  | 'testing'
  | 'response'
  | 'tools'
  | 'other'

export type FlowStatus = 'running' | 'done' | 'error' | 'idle'

export type FlowIcon =
  | 'route'
  | 'brain'
  | 'search'
  | 'list'
  | 'code'
  | 'test'
  | 'message'
  | 'tool'
  | 'user'
  | 'info'
  | 'alert'
  | 'archive'
  | 'terminal'
  | 'refresh'

export interface FlowCheck {
  id: string
  phase: FlowPhase
  title: string
  meta?: string
  status: FlowStatus
  icon: FlowIcon
  seq?: number
  time?: number
}

export interface FlowTaskGroup {
  id: string
  index: number
  title: string
  status: FlowStatus
  checks: FlowCheck[]
  done: number
  total: number
  detailId: string
}

export interface FlowPlanItem {
  title: string
  status: FlowStatus
}

export interface FlowTurn {
  id: string
  turn: number
  prompt: string
  meta?: string
  status: FlowStatus
}

export interface FlowDetail {
  id: string
  title: string
  subtitle?: string
  body: string
  meta?: string
  status: FlowStatus
}

export interface FlowPersistEvent {
  id: string
  turn: number
  step: number
  phase: FlowPhase
  title: string
  detail: string
  status: FlowStatus
  meta?: string
  time?: number
  seq?: number
}

export interface FlowNodeData {
  kind: 'turn' | 'verify' | 'planning' | 'task'
  title: string
  detail?: string
  meta?: string
  status: FlowStatus
  icon: FlowIcon
  progress?: { done: number; total: number }
  checks?: FlowCheck[]
  plan?: FlowPlanItem[]
  detailId?: string
  taskIndex?: number
}

export interface FlowNode extends FlowNodeData {
  id: string
  position: { x: number; y: number }
  width: number
  height: number
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  animated: boolean
}

export interface FlowGraph {
  turn: FlowTurn | null
  turns: number[]
  groups: FlowTaskGroup[]
  nodes: FlowNode[]
  edges: FlowEdge[]
  detailById: Record<string, FlowDetail>
  persistEvents: FlowPersistEvent[]
}

export interface FlowTodo {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

interface FlowBlock {
  kind?: string
  text?: string
}

interface FlowEventNode {
  kind?: string
  seq?: number
  turn?: number
  step?: number
  blocks?: readonly FlowBlock[]
  content?: unknown
  name?: string
  callId?: string
  args?: unknown
  call?: { argsRaw?: string } | null
  callTime?: number | null
  time?: number
  isError?: boolean
  subCalls?: readonly unknown[]
  message?: string
  code?: string
  summary?: string | null
  producer?: { name?: string }
  outcome?: { kind?: string } | null
  retryState?: string
  interrupted?: boolean
}

interface FlowRequest {
  turn?: number | null
  step?: number
  status?: string
  requestConfig?: { model?: string }
  providerMetadata?: { model?: string }
}

interface FlowRunningCall {
  turn?: number
  step?: number
  name?: string
  callId?: string
  args?: unknown
  argsRaw?: string
}

interface FlowPartial {
  turn?: number
  step?: number
  blocks?: readonly FlowBlock[]
}

interface FlowLocation {
  kind?: string
  turn?: { turn?: number }
  step?: { step?: number }
}

export interface FlowSnapshot {
  eventNodes?: readonly FlowEventNode[]
  eventLocations?: ReadonlyMap<number, FlowLocation>
  requests?: readonly FlowRequest[]
  partial?: FlowPartial | null
  runningCalls?: readonly FlowRunningCall[]
}

export interface FlowInput {
  snapshot: FlowSnapshot | undefined
  todos: readonly FlowTodo[] | null | undefined
  running: boolean
  turn?: number | null
  storedEvents?: readonly FlowPersistEvent[]
  storedTurns?: readonly number[]
  t: (key: string, params?: Record<string, string | number>) => string
}

const TURN_WIDTH = 320
const VERIFY_WIDTH = 320
const PLAN_WIDTH = 340
const TASK_WIDTH = 400
const COLUMN_GAP = 60
const TURN_HEIGHT = 160
const VERIFY_HEIGHT = 160
const PLAN_HEADER_HEIGHT = 98
const PLAN_ROW_HEIGHT = 34
const TASK_HEADER_HEIGHT = 72
const CHECK_ROW_HEIGHT = 34
const MAX_TITLE = 120
const MAX_DETAIL = 180
const MAX_TASKS = 6
const MAX_CHECKS = 6

const FLOW_PHASES = new Set<FlowPhase>(['clarify', 'thinking', 'verify', 'planning', 'coding', 'testing', 'response', 'tools', 'other'])
const FLOW_STATUSES = new Set<FlowStatus>(['running', 'done', 'error', 'idle'])

function isFlowPhase(value: unknown): value is FlowPhase {
  return typeof value === 'string' && FLOW_PHASES.has(value as FlowPhase)
}

function isFlowStatus(value: unknown): value is FlowStatus {
  return typeof value === 'string' && FLOW_STATUSES.has(value as FlowStatus)
}

const PHASE_ICON: Record<FlowPhase, FlowIcon> = {
  clarify: 'user',
  thinking: 'brain',
  verify: 'search',
  planning: 'list',
  coding: 'code',
  testing: 'test',
  response: 'message',
  tools: 'tool',
  other: 'info',
}

/** Task header icon: the strongest action the task actually performed. */
const TASK_ICON_ORDER: readonly FlowIcon[] = ['code', 'test', 'search', 'user', 'message', 'brain', 'tool', 'list', 'info']

function taskIcon(checks: readonly FlowCheck[]): FlowIcon {
  const running = checks.find((check) => check.status === 'running')
  if (running !== undefined) return running.icon
  for (const icon of TASK_ICON_ORDER) {
    if (checks.some((check) => check.icon === icon)) return icon
  }
  return 'list'
}

const PHASE_TITLE: Record<FlowPhase, string> = {
  clarify: 'flow.clarify',
  thinking: 'flow.phase.thinking',
  verify: 'flow.phase.verify',
  planning: 'flow.phase.planning',
  coding: 'flow.phase.coding',
  testing: 'flow.phase.testing',
  response: 'flow.phase.response',
  tools: 'flow.phase.tools',
  other: 'flow.phase.other',
}

function rawTextOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => block !== null && typeof block === 'object' && typeof block.text === 'string' ? block.text : '')
    .join('\n')
    .trim()
}

function preview(text: string, max = MAX_DETAIL): string {
  const clean = text.replace(/\s+/gu, ' ').trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max) + '…'
}

function safeStringify(value: unknown): string {
  try {
    const text = JSON.stringify(value)
    return typeof text === 'string' ? text : ''
  } catch {
    return ''
  }
}

function rawArgsOf(args: unknown): string {
  if (args === null || args === undefined) return ''
  if (typeof args === 'string') return args
  return safeStringify(args)
}

function duration(callTime: unknown, time: unknown): string | undefined {
  if (typeof callTime !== 'number' || typeof time !== 'number' || time < callTime) return undefined
  const ms = time - callTime
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function turnOfLocation(location: FlowLocation | undefined): number | null {
  if (location === null || location === undefined) return null
  if (location.kind === 'turn' || location.kind === 'step') {
    return typeof location.turn?.turn === 'number' ? location.turn.turn : null
  }
  return null
}

function stepOfLocation(location: FlowLocation | undefined): number | null {
  if (location?.kind === 'step' && typeof location.step?.step === 'number') return location.step.step
  return null
}

function turnOfNode(node: FlowEventNode, locations: ReadonlyMap<number, FlowLocation> | undefined): number | null {
  return turnOfLocation(locations?.get(node.seq)) ?? (typeof node.turn === 'number' ? node.turn : null)
}

function stepOfNode(node: FlowEventNode, locations: ReadonlyMap<number, FlowLocation> | undefined): number | null {
  return stepOfLocation(locations?.get(node.seq)) ?? (typeof node.step === 'number' ? node.step : null)
}

function listTurns(snapshot: FlowSnapshot): number[] {
  const turns = new Set<number>()
  const consider = (value: unknown): void => {
    if (typeof value === 'number' && Number.isFinite(value)) turns.add(value)
  }
  for (const node of snapshot.eventNodes ?? []) consider(turnOfNode(node, snapshot.eventLocations))
  for (const request of snapshot.requests ?? []) consider(request.turn)
  for (const call of snapshot.runningCalls ?? []) consider(call.turn)
  if (snapshot.partial !== null && snapshot.partial !== undefined) consider(snapshot.partial.turn)
  return [...turns].sort((left, right) => left - right)
}

function mergeTurns(live: readonly number[], stored: readonly number[] | undefined): number[] {
  const turns = new Set(live)
  for (const turn of stored ?? []) {
    if (typeof turn === 'number' && Number.isFinite(turn)) turns.add(turn)
  }
  return [...turns].sort((left, right) => left - right)
}

function selectTurn(requested: number | null | undefined, turns: readonly number[]): number | null {
  if (requested !== undefined && requested !== null && turns.includes(requested)) return requested
  return turns.length === 0 ? null : turns[turns.length - 1]
}

function turnStatus(snapshot: FlowSnapshot, turn: number, running: boolean): FlowStatus {
  if (running) return 'running'
  if (snapshot.partial !== null && snapshot.partial !== undefined && snapshot.partial.turn === turn) return 'running'
  if ((snapshot.runningCalls ?? []).some((call) => call.turn === turn)) return 'running'
  const requests = (snapshot.requests ?? []).filter((request) => request.turn === turn)
  if (requests.some((request) => request.status === 'error')) return 'error'
  if (requests.some((request) => request.status === 'running')) return 'running'
  const failed = (snapshot.eventNodes ?? []).some((node) => node.kind === 'turn-error'
    && turnOfNode(node, snapshot.eventLocations) === turn)
  return failed ? 'error' : 'done'
}

function phaseOfTool(name: string | undefined, args: unknown): FlowPhase {
  const tool = (name ?? '').toLowerCase()
  if (/ask_user|question|clarify/u.test(tool)) return 'clarify'
  if (/todo|plan|task/u.test(tool)) return 'planning'
  if (/edit|write|patch|create|delete|move|rename|apply/u.test(tool)) return 'coding'
  if (/read|grep|glob|search|find|list|fetch|inspect|web_search|web_fetch/u.test(tool)) return 'verify'
  if (/test|spec|lint|typecheck/u.test(tool)) return 'testing'
  const text = typeof args === 'string' ? args : safeStringify(args)
  if (/test|vitest|jest|pytest|spec|lint|typecheck|tsc|build/u.test(text)) return 'testing'
  if (/\b(git (status|diff|log|show)|ls|cat|find|grep|rg|head|tail|wc|pwd|which|curl|wget)\b|sed -n/u.test(text)) return 'verify'
  if (/\b(mkdir|touch|rm|mv|cp|chmod|git add|git commit|git push|npm install|pnpm install|yarn add)\b/u.test(text)) return 'coding'
  if (/run_code|execute|eval/u.test(tool)) return 'coding'
  if (/bash|shell|exec|run|command|terminal/u.test(tool)) return 'coding'
  return 'tools'
}

function toolTitle(name: string | undefined, args: unknown, fallback: string): string {
  const tool = name === undefined || name === '' ? fallback : name
  const record = args !== null && typeof args === 'object' ? args as Record<string, unknown> : undefined
  const path = record?.path ?? record?.file_path ?? record?.filePath ?? record?.target
  if (typeof path === 'string' && path !== '') return `${tool} · ${path}`
  const command = record?.command ?? record?.cmd
  if (typeof command === 'string' && command !== '') return `${tool} · ${command}`
  const pattern = record?.pattern ?? record?.query
  if (typeof pattern === 'string' && pattern !== '') return `${tool} · ${pattern}`
  const url = record?.url
  if (typeof url === 'string' && url !== '') return `${tool} · ${url}`
  const raw = rawArgsOf(args)
  return raw === '' ? tool : `${tool} · ${preview(raw)}`
}

function firstPrompt(events: readonly FlowEventNode[]): string {
  for (const node of events) {
    if (node.kind === 'user' || node.kind === 'steering') {
      const text = rawTextOf(node.content)
      if (text !== '') return text
    }
  }
  return ''
}

/** Hidden map line the response skill appends: turn, verify, plan. */
interface FlowMeta {
  turn?: unknown
  verify?: unknown
  plan?: unknown
}

const FLOW_META_RE = /<!--\s*flow-meta\s+(\{[\s\S]*?\})\s*-->/u

function parseFlowMeta(events: readonly FlowEventNode[]): FlowMeta | null {
  let meta: FlowMeta | null = null
  for (const node of events) {
    if (node.kind !== 'assistant') continue
    for (const block of node.blocks ?? []) {
      if (block.kind !== 'text' || typeof block.text !== 'string') continue
      const match = FLOW_META_RE.exec(block.text)
      if (match === null) continue
      try {
        const parsed: unknown = JSON.parse(match[1])
        if (parsed !== null && typeof parsed === 'object') meta = parsed as FlowMeta
      } catch {
        // Malformed map line is ignored; the turn still renders from events.
      }
    }
  }
  return meta
}

function stripFlowMeta(text: string): string {
  return text.replace(FLOW_META_RE, '').trim()
}

function todoStatus(status: FlowTodo['status']): FlowStatus {
  if (status === 'completed') return 'done'
  if (status === 'in_progress') return 'running'
  return 'idle'
}

function taskIndexForStep(step: number, taskCount: number): number {
  if (taskCount <= 1) return 0
  return Math.min(Math.max(step - 1, 0), taskCount - 1)
}

function planGlyph(status: FlowStatus): string {
  if (status === 'done') return '✓'
  if (status === 'running') return '▸'
  return '○'
}

/**
 * Build the current turn's task map.
 * @param input - Trajectory snapshot, todo list, stored events, session running flag, and translator.
 * @returns positioned turn/verify/planning/task nodes, edges, detail records, and durable event rows.
 */
export function buildFlowGraph(input: FlowInput): FlowGraph {
  const snapshot = input.snapshot ?? {}
  const turns = mergeTurns(listTurns(snapshot), input.storedTurns)
  const turn = selectTurn(input.turn, turns)
  if (turn === null) {
    return { turn: null, turns, groups: [], nodes: [], edges: [], detailById: {}, persistEvents: [] }
  }

  const events = [...(snapshot.eventNodes ?? [])]
    .filter((node) => turnOfNode(node, snapshot.eventLocations) === turn)
    .sort((left, right) => (left.seq ?? 0) - (right.seq ?? 0))
  const requests = (snapshot.requests ?? []).filter((request) => request.turn === turn)
  const model = requests
    .map((request) => request.requestConfig?.model ?? request.providerMetadata?.model)
    .filter((value): value is string => typeof value === 'string' && value !== '')
    .pop()
  const status = turnStatus(snapshot, turn, input.running)
  const meta = parseFlowMeta(events)
  let turnPrompt = firstPrompt(events)
  if (typeof meta?.turn === 'string' && meta.turn.trim() !== '') turnPrompt = meta.turn.trim()
  const verifyText = typeof meta?.verify === 'string' && meta.verify.trim() !== '' && meta.verify.trim() !== 'clear'
    ? meta.verify.trim()
    : turnPrompt
  const turnId = `turn-${turn}`
  const detailById: Record<string, FlowDetail> = {}

  const todos = Array.isArray(input.todos)
    ? input.todos.filter((todo) => todo !== null && typeof todo === 'object')
    : []

  const storedTaskDetails = new Map<number, { title: string; status: FlowStatus }>()
  let storedPrompt = ''
  let storedPlan = ''
  for (const event of input.storedEvents ?? []) {
    if (event.turn !== turn) continue
    if (event.id === 'verify-detail') {
      if (storedPrompt === '') storedPrompt = event.detail
      continue
    }
    if (event.id === 'plan-detail') {
      if (storedPlan === '') storedPlan = event.detail
      continue
    }
    const match = /^task-(\d+)-detail$/u.exec(event.id)
    if (match !== null) {
      const index = Number(match[1])
      if (Number.isFinite(index) && index >= 0) {
        storedTaskDetails.set(index, {
          title: event.title,
          status: isFlowStatus(event.status) ? event.status : 'idle',
        })
      }
    }
  }

  const metaPlan = Array.isArray(meta?.plan)
    ? meta.plan
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item !== '')
    : []
  const taskTitles: string[] = metaPlan.length > 0
    ? metaPlan
    : todos.length > 0
      ? todos.map((todo) => todo.content)
      : [...storedTaskDetails.entries()].sort((left, right) => left[0] - right[0]).map(([, value]) => value.title)
  const taskStatuses: FlowStatus[] = metaPlan.length > 0
    ? metaPlan.map(() => 'idle')
    : todos.length > 0
      ? todos.map((todo) => todoStatus(todo.status))
      : [...storedTaskDetails.entries()].sort((left, right) => left[0] - right[0]).map(([, value]) => value.status)
  if (taskTitles.length === 0) {
    taskTitles.push(input.t('flow.work'))
    taskStatuses.push(status)
  }
  if (taskTitles.length > MAX_TASKS) {
    const hidden = taskTitles.length - (MAX_TASKS - 1)
    taskTitles.length = MAX_TASKS - 1
    taskStatuses.length = MAX_TASKS - 1
    taskTitles.push(`+${hidden} more`)
    taskStatuses.push('idle')
  }
  const taskCount = taskTitles.length
  const checksByTask: FlowCheck[][] = Array.from({ length: taskCount }, () => [])
  const liveIds = new Set<string>()

  const addCheck = (
    step: number,
    id: string,
    phase: FlowPhase,
    title: string,
    detail: string,
    checkStatus: FlowStatus,
    meta?: string,
    icon?: FlowIcon,
    seq?: number,
    time?: number,
    live = true,
  ): void => {
    const index = taskIndexForStep(step, taskCount)
    const safeTitle = title.trim() === '' ? input.t('flow.task') : title
    checksByTask[index].push({
      id,
      phase,
      title: preview(safeTitle, MAX_TITLE),
      ...(meta === undefined || meta === '' ? {} : { meta }),
      status: checkStatus,
      icon: icon ?? PHASE_ICON[phase],
      ...(seq === undefined ? {} : { seq }),
      ...(time === undefined ? {} : { time }),
    })
    detailById[id] = {
      id,
      title: preview(safeTitle, MAX_TITLE),
      subtitle: input.t(PHASE_TITLE[phase]),
      body: detail === '' ? input.t('flow.noDetail') : detail,
      ...(meta === undefined || meta === '' ? {} : { meta }),
      status: checkStatus,
    }
    if (live) liveIds.add(id)
  }

  for (const node of events) {
    const step = stepOfNode(node, snapshot.eventLocations) ?? 1

    if (node.kind === 'context') {
      const text = rawTextOf(node.content)
      addCheck(step, `task-${node.seq}-context`, 'other', node.producer?.name ?? input.t('flow.context'), text, 'done', undefined, 'info', node.seq, node.time)
      continue
    }

    if (node.kind === 'assistant') {
      for (const [index, block] of (Array.isArray(node.blocks) ? node.blocks : []).entries()) {
        if (block === null || typeof block !== 'object') continue
        if (block.kind === 'reasoning') {
          addCheck(step, `task-${node.seq}-reasoning-${index}`, 'thinking', block.text ?? '', block.text ?? '', node.interrupted === true ? 'error' : 'done', undefined, 'brain', node.seq, node.time)
        } else if (block.kind === 'text') {
          const text = stripFlowMeta(block.text ?? '')
          if (text !== '') {
            addCheck(step, `task-${node.seq}-text-${index}`, 'response', text, text, node.interrupted === true ? 'error' : 'done', undefined, 'message', node.seq, node.time)
          }
        }
      }
      continue
    }

    if (node.kind === 'tool-result') {
      const rawArgs = rawArgsOf(node.call?.argsRaw ?? node.args)
      const result = rawTextOf(node.content) || safeStringify(node.content)
      const phase = phaseOfTool(node.name, node.call?.argsRaw ?? node.args)
      const meta = [
        duration(node.callTime, node.time),
        Array.isArray(node.subCalls) && node.subCalls.length > 0 ? `+${node.subCalls.length}` : undefined,
      ].filter((part): part is string => part !== undefined).join(' · ')
      addCheck(
        step,
        `task-call-${node.callId === undefined || node.callId === '' ? node.seq : node.callId}`,
        phase,
        toolTitle(node.name, node.call?.argsRaw ?? node.args, input.t('flow.tool')),
        [
          rawArgs === '' ? '' : `${input.t('flow.args')}\n${rawArgs}`,
          result === '' ? '' : `${input.t('flow.result')}\n${result}`,
        ].filter((part) => part !== '').join('\n\n'),
        node.isError === true ? 'error' : 'done',
        meta,
        PHASE_ICON[phase],
        node.seq,
        node.time,
      )
      continue
    }

    if (node.kind === 'turn-error') {
      const text = node.message ?? node.code ?? ''
      addCheck(step, `task-${node.seq}-error`, 'other', `${input.t('flow.error')}${text === '' ? '' : ` · ${text}`}`, text, 'error', undefined, 'alert', node.seq, node.time)
      continue
    }

    if (node.kind === 'compaction') {
      addCheck(step, `task-${node.seq}-compaction`, 'other', input.t('flow.compaction'), node.summary ?? '', 'done', undefined, 'archive', node.seq, node.time)
      continue
    }

    if (node.kind === 'command') {
      const text = [node.name ?? input.t('flow.command'), node.args ?? ''].filter((part) => part !== '').join(' ')
      addCheck(
        step,
        `task-${node.seq}-command`,
        'other',
        text,
        [node.args ?? '', node.outcome?.kind ?? ''].filter((part) => part !== '').join('\n'),
        node.outcome === null ? 'running' : node.outcome?.kind === 'error' ? 'error' : 'done',
        undefined,
        'terminal',
        node.seq,
        node.time,
      )
      continue
    }

    if (node.kind === 'model-retry') {
      addCheck(step, `task-${node.seq}-retry`, 'other', input.t('flow.retry'), node.retryState ?? '', node.retryState === 'cancelled' ? 'error' : 'running', undefined, 'refresh', node.seq, node.time)
    }
  }

  for (const [index, call] of (snapshot.runningCalls ?? []).entries()) {
    if (call.turn !== turn) continue
    const step = typeof call.step === 'number' ? call.step : 1
    const rawArgs = rawArgsOf(call.argsRaw ?? call.args)
    const phase = phaseOfTool(call.name, call.argsRaw ?? call.args)
    addCheck(
      step,
      `task-call-${call.callId === undefined || call.callId === '' ? `running-${index}` : call.callId}`,
      phase,
      toolTitle(call.name, call.argsRaw ?? call.args, input.t('flow.tool')),
      rawArgs === '' ? '' : `${input.t('flow.args')}\n${rawArgs}`,
      'running',
      input.t('flow.running'),
      PHASE_ICON[phase],
    )
  }

  const partial = snapshot.partial
  if (partial !== null && partial !== undefined && partial.turn === turn) {
    const step = typeof partial.step === 'number' ? partial.step : 1
    for (const [index, block] of (Array.isArray(partial.blocks) ? partial.blocks : []).entries()) {
      if (block === null || typeof block !== 'object') continue
      if (block.kind === 'reasoning') {
        addCheck(step, `task-partial-reasoning-${index}`, 'thinking', block.text ?? '', block.text ?? '', 'running', input.t('flow.streaming'), 'brain')
      } else if (block.kind === 'text') {
        addCheck(step, `task-partial-text-${index}`, 'response', block.text ?? '', block.text ?? '', 'running', input.t('flow.streaming'), 'message')
      }
    }
  }

  for (const event of input.storedEvents ?? []) {
    if (event.turn !== turn) continue
    if (event.id === 'verify-detail' || event.id === 'plan-detail' || /^task-\d+-detail$/u.test(event.id)) continue
    if (liveIds.has(event.id) || event.id.startsWith('task-partial-')) continue
    addCheck(
      event.step,
      event.id,
      isFlowPhase(event.phase) ? event.phase : 'other',
      event.title,
      event.detail,
      isFlowStatus(event.status) ? event.status : 'idle',
      event.meta,
      undefined,
      event.seq,
      event.time,
      false,
    )
  }

  if (turnPrompt === '' && storedPrompt !== '') turnPrompt = storedPrompt
  if (turnPrompt === '') turnPrompt = input.t('flow.noPrompt')
  detailById[turnId] = {
    id: turnId,
    title: input.t('flow.turn', { turn }),
    subtitle: input.t('flow.prompt'),
    body: turnPrompt,
    ...(model === undefined ? {} : { meta: model }),
    status,
  }

  const groups: FlowTaskGroup[] = []
  const persistEvents: FlowPersistEvent[] = []
  for (let index = 0; index < taskCount; index += 1) {
    const checks = checksByTask[index].sort((left, right) => (left.seq ?? 0) - (right.seq ?? 0) || (left.time ?? 0) - (right.time ?? 0) || left.id.localeCompare(right.id))
    if (status !== 'running') {
      for (const check of checks) {
        if (check.status === 'running') {
          check.status = 'error'
          check.meta = input.t('flow.interrupted')
        }
      }
    }
    const total = checks.length
    const done = checks.filter((check) => check.status === 'done').length
    if (checks.length > MAX_CHECKS) {
      const hidden = checks.length - (MAX_CHECKS - 1)
      checks.length = MAX_CHECKS - 1
      checks.push({ id: `task-${index}-more`, phase: 'other', title: `+${hidden} more`, status: 'done', icon: 'info' })
    }
    const planStatus = taskStatuses[index] ?? 'idle'
    const groupStatus: FlowStatus = checks.some((check) => check.status === 'running')
      ? 'running'
      : checks.some((check) => check.status === 'error')
        ? 'error'
        : planStatus === 'done' ? 'done' : planStatus === 'running' ? 'running' : total > 0 && done === total ? 'done' : 'idle'
    const title = taskTitles[index] ?? input.t('flow.work')
    const detailId = `task-${index}-detail`
    detailById[detailId] = {
      id: detailId,
      title,
      subtitle: input.t('flow.task'),
      body: title,
      status: groupStatus,
    }
    groups.push({ id: `task-${index}`, index, title, status: groupStatus, checks, done, total, detailId })
    persistEvents.push({ id: detailId, turn, step: index + 1, phase: 'planning', title, detail: title, status: groupStatus })
    for (const check of checks) {
      if (check.id.startsWith('task-partial-')) continue
      persistEvents.push({
        id: check.id,
        turn,
        step: index + 1,
        phase: check.phase,
        title: check.title,
        detail: detailById[check.id]?.body ?? '',
        status: check.status,
        ...(check.meta === undefined ? {} : { meta: check.meta }),
        ...(check.time === undefined ? {} : { time: check.time }),
        ...(check.seq === undefined ? {} : { seq: check.seq }),
      })
    }
  }

  const hasPlan = metaPlan.length > 0 || todos.length > 0 || storedTaskDetails.size > 0
  const planItems: FlowPlanItem[] = hasPlan
    ? taskTitles.map((title, index) => ({
        title,
        status: metaPlan.length > 0 ? (groups[index]?.status ?? 'idle') : (taskStatuses[index] ?? 'idle'),
      }))
    : []
  const planDone = planItems.filter((item) => item.status === 'done').length
  const planStatus: FlowStatus = planItems.some((item) => item.status === 'running')
    ? 'running'
    : planItems.length > 0 && planDone === planItems.length ? 'done' : 'idle'
  const planText = planItems.length === 0
    ? storedPlan !== '' ? storedPlan : input.t('flow.noPlan')
    : planItems.map((item) => `${planGlyph(item.status)} ${item.title}`).join('\n')
  const planDetailId = 'plan-detail'
  detailById[planDetailId] = {
    id: planDetailId,
    title: input.t('flow.planning'),
    subtitle: input.t('flow.plan'),
    body: planText,
    status: planStatus,
  }
  persistEvents.push({ id: planDetailId, turn, step: 1, phase: 'planning', title: input.t('flow.planning'), detail: planText, status: planStatus })

  const verifyDetailId = 'verify-detail'
  detailById[verifyDetailId] = {
    id: verifyDetailId,
    title: input.t('flow.verify'),
    subtitle: input.t('flow.prompt'),
    body: verifyText,
    status: verifyText === input.t('flow.noPrompt') ? 'idle' : 'done',
  }
  persistEvents.push({ id: verifyDetailId, turn, step: 1, phase: 'clarify', title: input.t('flow.verify'), detail: turnPrompt, status: detailById[verifyDetailId].status })

  const finalStatus: FlowStatus = status === 'running'
    ? 'running'
    : status === 'error'
      ? 'error'
      : groups.some((group) => group.status === 'running') ? 'running' : status
  detailById[turnId] = { ...detailById[turnId], status: finalStatus }

  const taskHeights = groups.map((group) => TASK_HEADER_HEIGHT + group.checks.length * CHECK_ROW_HEIGHT)
  const taskColumnHeight = taskHeights.reduce((sum, height) => sum + height, 0) + Math.max(0, groups.length - 1) * COLUMN_GAP
  const baseY = Math.max(0, (taskColumnHeight - TURN_HEIGHT) / 2)
  const planHeight = PLAN_HEADER_HEIGHT + planItems.length * PLAN_ROW_HEIGHT
  const planY = Math.max(0, (taskColumnHeight - planHeight) / 2)

  const nodes: FlowNode[] = [
    {
      id: turnId,
      kind: 'turn',
      title: input.t('flow.turn', { turn }),
      detail: preview(turnPrompt),
      ...(model === undefined ? {} : { meta: model }),
      status: finalStatus,
      icon: 'route',
      detailId: turnId,
      position: { x: 0, y: baseY },
      width: TURN_WIDTH,
      height: TURN_HEIGHT,
    },
    {
      id: 'verify',
      kind: 'verify',
      title: input.t('flow.verify'),
      detail: preview(verifyText),
      status: detailById[verifyDetailId].status,
      icon: 'search',
      detailId: verifyDetailId,
      position: { x: TURN_WIDTH + COLUMN_GAP, y: baseY },
      width: VERIFY_WIDTH,
      height: VERIFY_HEIGHT,
    },
    {
      id: 'planning',
      kind: 'planning',
      title: input.t('flow.planning'),
      detail: preview(planText),
      status: planStatus,
      icon: 'list',
      progress: { done: planDone, total: planItems.length },
      plan: planItems,
      detailId: planDetailId,
      position: { x: TURN_WIDTH + VERIFY_WIDTH + COLUMN_GAP * 2, y: planY },
      width: PLAN_WIDTH,
      height: planHeight,
    },
  ]

  let taskY = 0
  for (const [index, group] of groups.entries()) {
    const height = taskHeights[index]
    nodes.push({
      id: group.id,
      kind: 'task',
      title: group.title,
      status: group.status,
      icon: taskIcon(group.checks),
      progress: { done: group.done, total: group.total },
      checks: group.checks,
      detailId: group.detailId,
      taskIndex: group.index,
      position: { x: TURN_WIDTH + VERIFY_WIDTH + PLAN_WIDTH + COLUMN_GAP * 3, y: taskY },
      width: TASK_WIDTH,
      height,
    })
    taskY += height + COLUMN_GAP
  }

  const edges: FlowEdge[] = [
    { id: 'edge-turn-verify', source: turnId, target: 'verify', animated: finalStatus === 'running' },
    { id: 'edge-verify-plan', source: 'verify', target: 'planning', animated: planStatus === 'running' },
  ]
  for (const group of groups) {
    edges.push({ id: `edge-plan-${group.id}`, source: 'planning', target: group.id, animated: group.status === 'running' })
  }

  return {
    turn: { id: turnId, turn, prompt: turnPrompt, ...(model === undefined ? {} : { meta: model }), status: finalStatus },
    turns,
    groups,
    nodes,
    edges,
    detailById,
    persistEvents,
  }
}
