import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFlowGraph, type FlowInput } from './flow-graph.ts'
import { MOCK_FLOW_SNAPSHOT, MOCK_FLOW_TODOS } from './flow-mock.ts'
import { CONVERSATION_STORE_KEY, FLOW_VIEW_ID, preferFlowView } from './flow-preference.ts'

const t = (key: string, params?: Record<string, string | number>): string =>
  params === undefined ? key : `${key}:${JSON.stringify(params)}`

function input(overrides: Partial<FlowInput> = {}): FlowInput {
  return { snapshot: undefined, todos: null, running: false, t, ...overrides }
}

function location(turn: number, step: number) {
  return { kind: 'step', turn: { turn }, step: { step } }
}

test('no loaded turn produces an empty graph', () => {
  const graph = buildFlowGraph(input())
  assert.equal(graph.turn, null)
  assert.deepEqual(graph.turns, [])
  assert.deepEqual(graph.groups, [])
  assert.deepEqual(graph.nodes, [])
  assert.deepEqual(graph.edges, [])
  assert.deepEqual(graph.detailById, {})
  assert.deepEqual(graph.persistEvents, [])
})

test('planning creates one task group per todo and links them from planning', () => {
  const graph = buildFlowGraph(input({
    todos: [
      { content: 'build parser', status: 'completed' },
      { content: 'add tests', status: 'in_progress' },
    ],
    snapshot: {
      eventNodes: [
        { kind: 'user', seq: 1, content: [{ type: 'text', text: 'fix it' }] },
        { kind: 'assistant', seq: 2, turn: 1, step: 1, blocks: [{ kind: 'reasoning', text: 'parser plan' }] },
        { kind: 'tool-result', seq: 3, callId: 'a', name: 'edit', args: { path: 'parser.ts' }, content: [], isError: false, subCalls: [] },
        { kind: 'assistant', seq: 4, turn: 1, step: 2, blocks: [{ kind: 'reasoning', text: 'test plan' }] },
        { kind: 'tool-result', seq: 5, callId: 'b', name: 'bash', args: { command: 'npm test' }, content: [], isError: false, subCalls: [] },
      ],
      eventLocations: new Map([
        [1, location(1, 1)],
        [2, location(1, 1)],
        [3, location(1, 1)],
        [4, location(1, 2)],
        [5, location(1, 2)],
      ]),
      requests: [{ turn: 1, status: 'complete', requestConfig: { model: 'deepseek' } }],
      partial: null,
      runningCalls: [],
    },
  }))

  assert.equal(graph.turn?.turn, 1)
  assert.equal(graph.turn?.prompt, 'fix it')
  assert.deepEqual(graph.turns, [1])
  assert.equal(graph.groups.length, 2)
  assert.deepEqual(graph.groups.map((group) => group.title), ['build parser', 'add tests'])
  assert.deepEqual(graph.groups[0].checks.map((check) => check.phase), ['thinking', 'coding'])
  assert.deepEqual(graph.groups[1].checks.map((check) => check.phase), ['thinking', 'testing'])
  assert.deepEqual(graph.nodes.map((node) => node.kind), ['turn', 'verify', 'planning', 'task', 'task'])
  assert.equal(graph.nodes[2].plan?.length, 2)
  assert.equal(graph.edges.length, 4)
  assert.equal(graph.edges[0].source, 'turn-1')
  assert.equal(graph.edges[0].target, 'verify')
  assert.equal(graph.edges[1].target, 'planning')
  assert.equal(graph.edges[2].target, 'task-0')
  assert.equal(graph.edges[3].target, 'task-1')
  assert.equal(graph.detailById['verify-detail'].body, 'fix it')
  assert.equal(graph.detailById['plan-detail'].body, '✓ build parser\n▸ add tests')
  assert.equal(graph.detailById['task-0-detail'].title, 'build parser')
  assert.ok(graph.persistEvents.some((event) => event.id === 'plan-detail'))
  assert.ok(graph.persistEvents.some((event) => event.id === 'task-0-detail'))
  assert.ok(graph.persistEvents.some((event) => event.id === 'task-call-a'))
})

test('without a plan all checks land in one work group', () => {
  const graph = buildFlowGraph(input({
    snapshot: {
      eventNodes: [
        { kind: 'assistant', seq: 1, turn: 1, step: 1, blocks: [{ kind: 'reasoning', text: 'think' }] },
        { kind: 'tool-result', seq: 2, callId: 'a', name: 'edit', args: { path: 'x' }, content: [], isError: false, subCalls: [] },
      ],
      eventLocations: new Map([
        [1, location(1, 1)],
        [2, location(1, 1)],
      ]),
      requests: [{ turn: 1, status: 'complete' }],
      partial: null,
      runningCalls: [],
    },
  }))

  assert.equal(graph.groups.length, 1)
  assert.equal(graph.groups[0].title, 'flow.work')
  assert.deepEqual(graph.groups[0].checks.map((check) => check.phase), ['thinking', 'coding'])
  assert.equal(graph.nodes[2].plan?.length, 0)
})

test('task status follows the todo list', () => {
  const graph = buildFlowGraph(input({
    todos: [
      { content: 'done task', status: 'completed' },
      { content: 'active task', status: 'in_progress' },
      { content: 'pending task', status: 'pending' },
    ],
    snapshot: {
      eventNodes: [],
      eventLocations: new Map(),
      requests: [{ turn: 1, status: 'running' }],
      partial: null,
      runningCalls: [],
    },
  }))

  assert.deepEqual(graph.groups.map((group) => group.status), ['done', 'running', 'idle'])
  assert.deepEqual(graph.nodes[2].plan?.map((item) => item.status), ['done', 'running', 'idle'])
})

test('stored events fill gaps left by the live trajectory window', () => {
  const graph = buildFlowGraph(input({
    todos: [{ content: 'task A', status: 'in_progress' }],
    snapshot: {
      eventNodes: [
        { kind: 'assistant', seq: 1, turn: 1, step: 1, blocks: [{ kind: 'reasoning', text: 'think' }] },
      ],
      eventLocations: new Map([[1, location(1, 1)]]),
      requests: [{ turn: 1, status: 'complete' }],
      partial: null,
      runningCalls: [],
    },
    storedEvents: [
      { id: 'verify-detail', turn: 1, step: 1, phase: 'clarify', title: 'Verify', detail: 'fix it', status: 'done' },
      { id: 'task-call-old', turn: 1, step: 1, phase: 'coding', title: 'edit · old.ts', detail: 'old detail', status: 'done', seq: 2 },
    ],
  }))

  assert.equal(graph.turn?.prompt, 'fix it')
  assert.deepEqual(graph.groups[0].checks.map((check) => check.phase), ['thinking', 'coding'])
  assert.equal(graph.groups[0].checks[1].title, 'edit · old.ts')
  assert.ok(graph.persistEvents.some((event) => event.id === 'task-call-old'))
})

test('turn selection picks an older turn and lists every turn', () => {
  const snapshot = {
    eventNodes: [
      { kind: 'assistant', seq: 1, turn: 1, step: 1, blocks: [{ kind: 'text', text: 'first' }] },
      { kind: 'assistant', seq: 2, turn: 2, step: 1, blocks: [{ kind: 'text', text: 'second' }] },
    ],
    eventLocations: new Map([
      [1, location(1, 1)],
      [2, location(2, 1)],
    ]),
    requests: [{ turn: 1, status: 'complete' }, { turn: 2, status: 'complete' }],
    partial: null,
    runningCalls: [],
  }
  const latest = buildFlowGraph(input({ snapshot }))
  assert.deepEqual(latest.turns, [1, 2])
  assert.equal(latest.turn?.turn, 2)
  const older = buildFlowGraph(input({ snapshot, turn: 1 }))
  assert.equal(older.turn?.turn, 1)
  assert.equal(older.groups[0].checks[0].title, 'first')
})

test('steps map to tasks in plan order and clamp to the last task', () => {
  const graph = buildFlowGraph(input({
    todos: [
      { content: 'task A', status: 'completed' },
      { content: 'task B', status: 'in_progress' },
    ],
    snapshot: {
      eventNodes: [
        { kind: 'assistant', seq: 1, turn: 1, step: 1, blocks: [{ kind: 'reasoning', text: 'A' }] },
        { kind: 'assistant', seq: 2, turn: 1, step: 2, blocks: [{ kind: 'reasoning', text: 'B' }] },
        { kind: 'assistant', seq: 3, turn: 1, step: 3, blocks: [{ kind: 'reasoning', text: 'C' }] },
      ],
      eventLocations: new Map([
        [1, location(1, 1)],
        [2, location(1, 2)],
        [3, location(1, 3)],
      ]),
      requests: [{ turn: 1, status: 'complete' }],
      partial: null,
      runningCalls: [],
    },
  }))

  assert.deepEqual(graph.groups[0].checks.map((check) => check.title), ['A'])
  assert.deepEqual(graph.groups[1].checks.map((check) => check.title), ['B', 'C'])
})

test('mock snapshot renders one prompt broken into three tasks', () => {
  const graph = buildFlowGraph(input({ snapshot: MOCK_FLOW_SNAPSHOT, todos: MOCK_FLOW_TODOS }))

  assert.equal(graph.turn?.turn, 1)
  assert.match(graph.turn?.prompt ?? '', /dark mode toggle/u)
  assert.deepEqual(graph.groups.map((group) => group.title), MOCK_FLOW_TODOS.map((todo) => todo.content))
  assert.deepEqual(graph.groups.map((group) => group.checks.map((check) => check.phase)), [
    ['thinking', 'planning', 'verify'],
    ['verify', 'coding'],
    ['testing', 'response'],
  ])
  assert.deepEqual(graph.nodes.filter((node) => node.kind === 'task').map((node) => node.icon), ['search', 'code', 'test'])
  assert.equal(graph.nodes.find((node) => node.kind === 'planning')?.plan?.length, 3)
  assert.ok(graph.groups.every((group) => group.status === 'done'))
})

test('flow-meta line drives turn, verify, and plan without a todo list', () => {
  const meta = { turn: 'Add dark mode toggle', verify: 'clear', plan: ['Read settings', 'Add toggle', 'Test'] }
  const graph = buildFlowGraph(input({
    snapshot: {
      eventNodes: [
        { kind: 'user', seq: 1, turn: 1, step: 1, content: [{ type: 'text', text: 'add dark mode' }] },
        { kind: 'assistant', seq: 2, turn: 1, step: 1, blocks: [{ kind: 'reasoning', text: 'plan' }] },
        { kind: 'tool-result', seq: 3, turn: 1, step: 1, callId: 'a', name: 'read_file', args: { path: 'src/settings.ts' }, content: 'ok' },
        { kind: 'tool-result', seq: 4, turn: 1, step: 2, callId: 'b', name: 'edit_file', args: { path: 'src/settings.ts' }, content: 'ok' },
        { kind: 'tool-result', seq: 5, turn: 1, step: 3, callId: 'c', name: 'bash', args: { command: 'npm test' }, content: 'ok' },
        { kind: 'assistant', seq: 6, turn: 1, step: 3, blocks: [{ kind: 'text', text: `Done.\n<!--flow-meta ${JSON.stringify(meta)}-->` }] },
      ],
      requests: [{ turn: 1, status: 'complete' }],
      partial: null,
      runningCalls: [],
    },
  }))

  assert.equal(graph.turn?.prompt, 'add dark mode')
  assert.equal(graph.nodes.find((node) => node.kind === 'turn')?.detail, 'add dark mode')
  assert.deepEqual(graph.groups.map((group) => group.title), ['Read settings', 'Add toggle', 'Test'])
  assert.equal(graph.nodes.find((node) => node.kind === 'planning')?.plan?.length, 3)
  assert.equal(graph.nodes.find((node) => node.kind === 'verify')?.detail, 'Add dark mode toggle')
  assert.equal(graph.groups[2].checks.find((check) => check.phase === 'response')?.title, 'Done.')
})

test('task and check caps keep the map readable', () => {
  const plan = Array.from({ length: 10 }, (_, index) => `task ${index + 1}`)
  const calls = Array.from({ length: 10 }, (_, index) => ({
    kind: 'tool-result' as const,
    seq: index + 2,
    turn: 1,
    step: 1,
    callId: `call-${index}`,
    name: 'read_file',
    args: { path: `src/file-${index}.ts` },
    content: 'ok',
  }))
  const graph = buildFlowGraph(input({
    snapshot: {
      eventNodes: [
        { kind: 'user', seq: 1, turn: 1, step: 1, content: [{ type: 'text', text: 'go' }] },
        ...calls,
        { kind: 'assistant', seq: 20, turn: 1, step: 1, blocks: [{ kind: 'text', text: `<!--flow-meta ${JSON.stringify({ turn: 'go', verify: 'clear', plan })}-->` }] },
      ],
      requests: [{ turn: 1, status: 'complete' }],
      partial: null,
      runningCalls: [],
    },
  }))

  assert.equal(graph.groups.length, 6)
  assert.equal(graph.groups[5].title, '+5 more')
  assert.equal(graph.groups[0].checks.length, 6)
  assert.equal(graph.groups[0].checks[5].title, '+5 more')
})

test('task icon follows the strongest action, not the first check', () => {
  const graph = buildFlowGraph(input({
    todos: [
      { content: 'code it', status: 'completed' },
      { content: 'ask first', status: 'completed' },
    ],
    snapshot: {
      eventNodes: [
        { kind: 'assistant', seq: 1, turn: 1, step: 1, blocks: [{ kind: 'reasoning', text: 'think' }] },
        { kind: 'tool-result', seq: 2, turn: 1, step: 1, callId: 'a', name: 'edit_file', args: { path: 'src/a.ts' }, content: 'ok' },
        { kind: 'tool-result', seq: 3, turn: 1, step: 2, callId: 'b', name: 'ask_user_question', args: { question: 'which?' }, content: 'this one' },
      ],
      requests: [{ turn: 1, status: 'complete' }],
      partial: null,
      runningCalls: [],
    },
  }))

  assert.equal(graph.nodes.find((node) => node.id === 'task-0')?.icon, 'code')
  assert.equal(graph.nodes.find((node) => node.id === 'task-1')?.icon, 'user')
})

test('top-down layout keeps the branch: turn, verify, planning stack, tasks fan out', () => {
  const graph = buildFlowGraph(input({
    todos: [
      { content: 'task A', status: 'pending' },
      { content: 'task B', status: 'pending' },
    ],
    snapshot: {
      eventNodes: [
        { kind: 'assistant', seq: 1, turn: 1, step: 1, blocks: [{ kind: 'text', text: 'go' }] },
      ],
      requests: [{ turn: 1, status: 'complete' }],
      partial: null,
      runningCalls: [],
    },
  }))
  const byKind = (kind: string) => graph.nodes.filter((node) => node.kind === kind)
  const [turn] = byKind('turn')
  const [verify] = byKind('verify')
  const [planning] = byKind('planning')
  const tasks = byKind('task')
  assert.ok(turn !== undefined && verify !== undefined && planning !== undefined)
  assert.equal(tasks.length, 2)
  assert.ok(turn.position.y < verify.position.y)
  assert.ok(verify.position.y < planning.position.y)
  assert.ok(planning.position.y < tasks[0].position.y)
  const mid = (node: { position: { x: number }; width: number }): number => node.position.x + node.width / 2
  assert.equal(mid(turn), mid(planning))
  assert.equal(mid(verify), mid(planning))
  assert.ok(tasks[0].position.x < tasks[1].position.x)
  assert.equal(tasks[0].position.y, tasks[1].position.y)
  const rowMid = (tasks[0].position.x + tasks[1].position.x + tasks[1].width) / 2
  assert.equal(rowMid, mid(planning))
})

test('finished turn adds a final response node after the task branches', () => {
  const graph = buildFlowGraph(input({
    todos: [{ content: 'task A', status: 'completed' }],
    snapshot: {
      eventNodes: [
        { kind: 'user', seq: 1, turn: 1, step: 1, content: [{ kind: 'text', text: 'go' }] },
        { kind: 'assistant', seq: 2, turn: 1, step: 1, blocks: [{ kind: 'text', text: 'final answer' }] },
      ],
      requests: [{ turn: 1, status: 'complete' }],
      partial: null,
      runningCalls: [],
    },
  }))
  const response = graph.nodes.find((node) => node.kind === 'response')
  assert.ok(response !== undefined)
  assert.equal(response.detail, 'final answer')
  assert.equal(response.turn, 1)
  assert.ok(graph.edges.some((edge) => edge.source === 'task-0' && edge.target === 'response'))
})

test('tool rows show a readable decorator instead of raw JSON', () => {
  const graph = buildFlowGraph(input({
    todos: [
      { content: 'task A', status: 'completed' },
      { content: 'task B', status: 'completed' },
    ],
    snapshot: {
      eventNodes: [
        { kind: 'user', seq: 1, turn: 1, step: 1, content: [{ kind: 'text', text: 'go' }] },
        { kind: 'tool-result', seq: 2, turn: 1, step: 1, callId: 'bash', name: 'bash', args: { command: 'npm test -- --watch=false' }, content: 'pass 12' },
        { kind: 'tool-result', seq: 3, turn: 1, step: 1, callId: 'edit', name: 'edit', args: { file_path: 'src/theme.ts', old_string: 'a', new_string: 'b' }, content: 'applied' },
        { kind: 'tool-result', seq: 4, turn: 1, step: 1, callId: 'read', name: 'read', args: { file_path: 'src/settings.ts' }, content: 'export {}' },
        { kind: 'tool-result', seq: 5, turn: 1, step: 1, callId: 'grep', name: 'grep', args: { pattern: 'darkMode', path: 'src' }, content: '1 match' },
        { kind: 'tool-result', seq: 6, turn: 1, step: 1, callId: 'web', name: 'web_search', args: { queries: ['dark mode css'] }, content: 'results' },
        { kind: 'tool-result', seq: 7, turn: 1, step: 2, callId: 'todo', name: 'todo_write', args: { todos: [{ content: 'a' }, { content: 'b' }] }, content: 'ok' },
        { kind: 'tool-result', seq: 8, turn: 1, step: 2, callId: 'present', name: 'present', args: { files: [{ path: 'a.png' }] }, content: 'ok' },
        { kind: 'tool-result', seq: 9, turn: 1, step: 2, callId: 'ask', name: 'ask_user_question', args: { questions: [{ question: 'Which theme?' }] }, content: 'dark' },
      ],
      requests: [{ turn: 1, status: 'complete' }],
      partial: null,
      runningCalls: [],
    },
  }))

  const first = graph.groups[0].checks
  const second = graph.groups[1].checks
  assert.deepEqual(first.map((check) => check.title), [
    '> npm test -- --watch=false',
    'src/theme.ts',
    'src/settings.ts',
    'darkMode in src',
    'dark mode css',
  ])
  assert.deepEqual(second.map((check) => check.title), ['2 tasks', '1 files', 'Which theme?'])
  assert.deepEqual([...first, ...second].map((check) => check.tool), ['bash', 'edit', 'read', 'grep', 'web_search', 'todo_write', 'present', 'ask_user_question'])
  assert.deepEqual([...first, ...second].map((check) => check.icon), ['terminal', 'code', 'info', 'search', 'search', 'list', 'archive', 'user'])
  assert.equal(graph.detailById['task-call-bash'].body, '> npm test -- --watch=false\n\nflow.result\npass 12')
  assert.equal(graph.detailById['task-call-edit'].body, 'src/theme.ts\n\nflow.result\napplied')
  assert.equal(graph.detailById['task-call-edit'].subtitle, 'edit · flow.phase.coding')
  assert.equal(graph.persistEvents.find((event) => event.id === 'task-call-bash')?.tool, 'bash')
})

test('running turn has no final response node', () => {
  const graph = buildFlowGraph(input({
    running: true,
    snapshot: {
      eventNodes: [
        { kind: 'assistant', seq: 1, turn: 1, step: 1, blocks: [{ kind: 'text', text: 'still writing' }] },
      ],
      requests: [{ turn: 1, status: 'running' }],
      partial: null,
      runningCalls: [],
    },
  }))
  assert.equal(graph.nodes.some((node) => node.kind === 'response'), false)
})

test('new sessions default to the Flow view without losing a draft', () => {
  const store = new Map<string, string>()
  const storage = {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => { store.set(key, value) },
  }
  const key = `${CONVERSATION_STORE_KEY}.session-1`

  preferFlowView('session-1', storage)
  assert.deepEqual(JSON.parse(store.get(key) ?? '{}'), { draft: '', view: FLOW_VIEW_ID, viewRequest: null })

  store.set(key, JSON.stringify({ draft: { text: 'keep me', references: [] }, view: null, viewRequest: null }))
  preferFlowView('session-1', storage)
  assert.deepEqual(JSON.parse(store.get(key) ?? '{}'), {
    draft: { text: 'keep me', references: [] },
    view: FLOW_VIEW_ID,
    viewRequest: null,
  })

  store.set(key, JSON.stringify({ draft: '', view: 'chat', viewRequest: null }))
  preferFlowView('session-1', storage)
  assert.equal(JSON.parse(store.get(key) ?? '{}').view, 'chat')
})
