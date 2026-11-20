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
  | 'close'

export interface FlowCheck {
  id: string
  phase: FlowPhase
  title: string
  meta?: string
  status: FlowStatus
  icon: FlowIcon
  /** Wire tool name, when the check is a tool call. */
  tool?: string
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
  turn?: number
  /** Wire tool name, when the detail belongs to a tool call. */
  tool?: string
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
  tool?: string
}

export interface FlowNodeData {
  kind: 'turn' | 'verify' | 'planning' | 'task' | 'response'
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
  turn?: number
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

/** Per-tool row icon; the phase icon is the fallback for unknown tools. */
const TOOL_ICON: Record<string, FlowIcon> = {
  bash: 'terminal',
  pwsh: 'terminal',
  terminal_open: 'terminal',
  terminal_send: 'terminal',
  terminal_read: 'terminal',
  terminal_signal: 'terminal',
  terminal_close: 'terminal',
  terminal_list: 'terminal',
  read: 'info',
  read_image: 'info',
  write: 'code',
  edit: 'code',
  apply_patch: 'code',
  str_replace_editor: 'code',
  grep: 'search',
  glob: 'search',
  web_search: 'search',
  web_fetch: 'search',
  subagent: 'tool',
  subagent_fork: 'tool',
  todo_write: 'list',
  skill: 'brain',
  present: 'archive',
  ask_user_question: 'user',
  workflow: 'route',
  schedule_create: 'refresh',
  schedule_edit: 'refresh',
  schedule_list: 'list',
  schedule_view: 'info',
  job_output: 'terminal',
  job_list: 'list',
  job_kill: 'close',
  create_goal: 'route',
  get_goal: 'info',
  update_goal: 'route',
  office_render: 'archive',
  office_convert: 'archive',
  office_recalculate: 'refresh',
  working_directory: 'terminal',
  load_workspace_dependencies: 'tool',
}

function toolIcon(name: string | undefined, phase: FlowPhase): FlowIcon {
  return TOOL_ICON[(name ?? '').toLowerCase()] ?? PHASE_ICON[phase]
}

/** Task header icon: the strongest action the task actually performed. */
const TASK_ICON_ORDER: readonly FlowIcon[] = ['code', 'test', 'search', 'user', 'message', 'brain', 'tool', 'list', 'info']

function taskIcon(checks: readonly FlowCheck[]): FlowIcon {
  const running = checks.find((check) => check.status === 'running')
  if (running !== undefined) return running.icon
  for (const icon of TASK_ICON_ORDER) {
    if (checks.some((check) => PHASE_ICON[check.phase] === icon)) return icon
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

/** Parse tool args, accepting either the decoded object or the raw JSON string. */
function argsRecord(args: unknown): Record<string, unknown> | undefined {
  if (args === null || args === undefined) return undefined
  if (typeof args === 'string') {
    try {
      const parsed: unknown = JSON.parse(args)
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : undefined
    } catch {
      return undefined
    }
  }
  return typeof args === 'object' && !Array.isArray(args) ? args as Record<string, unknown> : undefined
}

function stringField(record: Record<string, unknown> | undefined, keys: readonly string[]): string {
  if (record === undefined) return ''
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  return ''
}

/** First short string value in the args, for tools without a known field. */
function firstStringValue(record: Record<string, unknown> | undefined): string {
  if (record === undefined) return ''
  for (const value of Object.values(record)) {
    if (typeof value === 'string' && value.trim() !== '' && value.length <= 120) return value.trim()
  }
  return ''
}

function firstQuestion(record: Record<string, unknown> | undefined): string {
  const questions = record?.questions
  if (!Array.isArray(questions)) return ''
  for (const item of questions) {
    if (item !== null && typeof item === 'object') {
      const text = stringField(item as Record<string, unknown>, ['question', 'header'])
      if (text !== '') return text
    }
  }
  return ''
}

/**
 * One-line readable decorator for a tool call, built from its JSON args.
 * Bash shows `> command`; edit/write/read show the path; search shows the
 * pattern; every other tool falls back to its first meaningful string field.
 */
function decoratorOf(name: string | undefined, args: unknown, max = MAX_TITLE): string {
  const tool = (name ?? '').toLowerCase()
  const record = argsRecord(args)
  const raw = typeof args === 'string' && record === undefined ? args.trim() : ''
  const path = stringField(record, ['file_path', 'path', 'filePath', 'target', 'notebook_path'])
  const command = stringField(record, ['command', 'cmd'])
  const pattern = stringField(record, ['pattern', 'query', 'glob'])
  const url = stringField(record, ['url'])
  const description = stringField(record, ['description', 'title', 'name', 'objective', 'prompt'])
  const question = firstQuestion(record)
  const queries = record?.queries
  const query = Array.isArray(queries) ? queries.filter((value): value is string => typeof value === 'string').join(', ') : ''
  const todos = record?.todos
  const todoCount = Array.isArray(todos) ? todos.length : 0
  const files = record?.files
  const fileCount = Array.isArray(files) ? files.length : 0
  const meta = record?.meta
  const metaName = meta !== null && typeof meta === 'object'
    ? stringField(meta as Record<string, unknown>, ['name', 'description'])
    : ''
  const jobId = stringField(record, ['job_id', 'jobId'])
  const terminalId = stringField(record, ['terminal_id', 'terminalId'])
  const cd = stringField(record, ['cd'])

  if (/bash|shell|exec|run|command|terminal|pwsh/u.test(tool)) {
    return preview(
      command !== '' ? `> ${command}`
        : description !== '' ? `> ${description}`
          : terminalId !== '' ? terminalId
            : raw !== '' ? `> ${raw}` : tool,
      max,
    )
  }
  if (/web_search/u.test(tool)) return preview(query !== '' ? query : description !== '' ? description : tool, max)
  if (/web_fetch/u.test(tool)) return preview(url !== '' ? url : description !== '' ? description : tool, max)
  if (/ask_user|question|clarify/u.test(tool)) return preview(question !== '' ? question : description !== '' ? description : tool, max)
  if (/todo/u.test(tool)) return preview(todoCount > 0 ? `${todoCount} tasks` : description !== '' ? description : tool, max)
  if (/present/u.test(tool)) return preview(fileCount > 0 ? `${fileCount} files` : description !== '' ? description : tool, max)
  if (/workflow/u.test(tool)) return preview(metaName !== '' ? metaName : description !== '' ? description : tool, max)
  if (/job/u.test(tool)) return preview(jobId !== '' ? jobId : description !== '' ? description : tool, max)
  if (/working_directory/u.test(tool)) return preview(cd !== '' ? cd : description !== '' ? description : tool, max)
  if (/apply_patch/u.test(tool)) {
    const input = stringField(record, ['input'])
    const file = /\*\*\* (?:Update|Add|Delete) File: (.+)/u.exec(input)?.[1]?.trim() ?? ''
    return preview(file !== '' ? file : input !== '' ? 'patch' : tool, max)
  }
  if (/edit|write|patch|create|delete|move|rename|apply|str_replace/u.test(tool)) {
    return preview(path !== '' ? path : description !== '' ? description : firstStringValue(record) || tool, max)
  }
  if (/read|inspect|cat|view/u.test(tool)) {
    return preview(path !== '' ? path : description !== '' ? description : firstStringValue(record) || tool, max)
  }
  if (/grep|glob|search|find|list/u.test(tool)) {
    const scope = path !== '' ? ` in ${path}` : ''
    return preview(pattern !== '' ? `${pattern}${scope}` : description !== '' ? description : firstStringValue(record) || tool, max)
  }
  if (/subagent|task|agent/u.test(tool)) return preview(description !== '' ? description : tool, max)
  if (/skill/u.test(tool)) return preview(description !== '' ? description : tool, max)
  const fallback = command || path || pattern || url || query || question || description || metaName || jobId || cd
    || firstStringValue(record) || raw
  return preview(fallback !== '' ? fallback : tool, max)
}

/** Readable detail body: the decorator line, then the result. No raw JSON. */
function toolBody(name: string | undefined, args: unknown, result: string, t: (key: string) => string): string {
  const tool = (name ?? '').toLowerCase()
  const command = stringField(argsRecord(args), ['command', 'cmd'])
  // The detail keeps a multi-line shell command intact; the row stays one line.
  const decorator = /bash|shell|exec|run|command|terminal|pwsh/u.test(tool) && command !== ''
    ? `> ${command}`
    : decoratorOf(name, args, 4000)
  const parts: string[] = []
  if (decorator !== '') parts.push(decorator)
  if (result !== '') parts.push(`${t('flow.result')}\n${result}`)
  return parts.join('\n\n')
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

/** Last assistant text block of the turn: the final response shown to the user. */
function finalResponse(events: readonly FlowEventNode[]): string {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const node = events[index]
    if (node.kind !== 'assistant') continue
    const blocks = Array.isArray(node.blocks) ? node.blocks : []
    for (let blockIndex = blocks.length - 1; blockIndex >= 0; blockIndex -= 1) {
      const block = blocks[blockIndex]
      if (block?.kind !== 'text') continue
      const text = stripFlowMeta(block.text ?? '')
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
  // The turn node shows the user's original prompt; the flow-meta summary is
  // only a fallback when the prompt is outside the loaded window.
  const userPrompt = firstPrompt(events)
  const metaTurn = typeof meta?.turn === 'string' && meta.turn.trim() !== '' ? meta.turn.trim() : ''
  let turnPrompt = userPrompt !== '' ? userPrompt : metaTurn
  const verifyText = typeof meta?.verify === 'string' && meta.verify.trim() !== '' && meta.verify.trim() !== 'clear'
    ? meta.verify.trim()
    : metaTurn !== '' ? metaTurn : turnPrompt
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
    tool?: string,
  ): void => {
    const index = taskIndexForStep(step, taskCount)
    const safeTitle = title.trim() === '' ? input.t('flow.task') : title
    const toolName = tool === undefined || tool === '' ? undefined : tool
    checksByTask[index].push({
      id,
      phase,
      title: preview(safeTitle, MAX_TITLE),
      ...(meta === undefined || meta === '' ? {} : { meta }),
      status: checkStatus,
      icon: icon ?? toolIcon(toolName, phase),
      ...(toolName === undefined ? {} : { tool: toolName }),
      ...(seq === undefined ? {} : { seq }),
      ...(time === undefined ? {} : { time }),
    })
    detailById[id] = {
      id,
      title: preview(safeTitle, MAX_TITLE),
      subtitle: toolName === undefined
        ? input.t(PHASE_TITLE[phase])
        : `${toolName} · ${input.t(PHASE_TITLE[phase])}`,
      body: detail === '' ? input.t('flow.noDetail') : detail,
      ...(meta === undefined || meta === '' ? {} : { meta }),
      status: checkStatus,
      ...(toolName === undefined ? {} : { tool: toolName }),
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
      const args = node.call?.argsRaw ?? node.args
      const result = rawTextOf(node.content) || safeStringify(node.content)
      const phase = phaseOfTool(node.name, args)
      const meta = [
        duration(node.callTime, node.time),
        Array.isArray(node.subCalls) && node.subCalls.length > 0 ? `+${node.subCalls.length}` : undefined,
      ].filter((part): part is string => part !== undefined).join(' · ')
      addCheck(
        step,
        `task-call-${node.callId === undefined || node.callId === '' ? node.seq : node.callId}`,
        phase,
        decoratorOf(node.name, args),
        toolBody(node.name, args, result, input.t),
        node.isError === true ? 'error' : 'done',
        meta,
        toolIcon(node.name, phase),
        node.seq,
        node.time,
        true,
        node.name,
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
    const args = call.argsRaw ?? call.args
    const phase = phaseOfTool(call.name, args)
    addCheck(
      step,
      `task-call-${call.callId === undefined || call.callId === '' ? `running-${index}` : call.callId}`,
      phase,
      decoratorOf(call.name, args),
      toolBody(call.name, args, '', input.t),
      'running',
      input.t('flow.running'),
      toolIcon(call.name, phase),
      undefined,
      undefined,
      true,
      call.name,
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
      event.tool,
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
        ...(check.tool === undefined ? {} : { tool: check.tool }),
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
  const planHeight = PLAN_HEADER_HEIGHT + planItems.length * PLAN_ROW_HEIGHT
  // Top-down: turn -> verify -> planning stack in one centered column, then
  // the task branches fan out side by side under the planning node.
  const columnWidth = Math.max(TURN_WIDTH, VERIFY_WIDTH, PLAN_WIDTH)
  const centeredX = (width: number): number => (columnWidth - width) / 2
  const turnY = 0
  const verifyY = turnY + TURN_HEIGHT + COLUMN_GAP
  const planningY = verifyY + VERIFY_HEIGHT + COLUMN_GAP
  const taskY = planningY + planHeight + COLUMN_GAP
  const taskRowWidth = groups.length === 0
    ? 0
    : groups.length * TASK_WIDTH + (groups.length - 1) * COLUMN_GAP
  const taskStartX = columnWidth / 2 - taskRowWidth / 2

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
      position: { x: centeredX(TURN_WIDTH), y: turnY },
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
      position: { x: centeredX(VERIFY_WIDTH), y: verifyY },
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
      position: { x: centeredX(PLAN_WIDTH), y: planningY },
      width: PLAN_WIDTH,
      height: planHeight,
    },
  ]

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
      position: { x: taskStartX + index * (TASK_WIDTH + COLUMN_GAP), y: taskY },
      width: TASK_WIDTH,
      height,
    })
  }

  const responseText = status === 'running' ? '' : finalResponse(events)
  const responseId = 'response'
  const responseHeight = 220
  if (responseText !== '') {
    const taskRowHeight = taskHeights.length === 0 ? 0 : Math.max(...taskHeights)
    nodes.push({
      id: responseId,
      kind: 'response',
      title: input.t('flow.response'),
      detail: responseText,
      status: finalStatus,
      icon: 'message',
      turn,
      detailId: 'response-detail',
      position: { x: columnWidth / 2 - TASK_WIDTH / 2, y: taskY + taskRowHeight + COLUMN_GAP },
      width: TASK_WIDTH,
      height: responseHeight,
    })
    detailById['response-detail'] = {
      id: 'response-detail',
      title: input.t('flow.response'),
      subtitle: input.t('flow.done'),
      body: responseText,
      status: finalStatus,
      turn,
    }
  }

  const edges: FlowEdge[] = [
    { id: 'edge-turn-verify', source: turnId, target: 'verify', animated: finalStatus === 'running' },
    { id: 'edge-verify-plan', source: 'verify', target: 'planning', animated: planStatus === 'running' },
  ]
  for (const group of groups) {
    edges.push({ id: `edge-plan-${group.id}`, source: 'planning', target: group.id, animated: group.status === 'running' })
  }
  if (responseText !== '') {
    for (const group of groups) {
      edges.push({ id: `edge-${group.id}-response`, source: group.id, target: responseId, animated: false })
    }
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
