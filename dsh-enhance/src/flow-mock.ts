/**
 * Fake turn for the Flow view: one prompt, a plan, and three tasks with the
 * checks that resolve them. Toggled from the Flow toolbar (or `?flowMock=1`).
 */
import type { FlowSnapshot, FlowTodo } from './flow-graph'

const PROMPT = 'Add a dark mode toggle to the settings page and cover it with a test.'

export const MOCK_FLOW_TODOS: readonly FlowTodo[] = [
  { content: 'Read the settings page and theme wiring', status: 'completed' },
  { content: 'Add the dark mode toggle and persist the choice', status: 'completed' },
  { content: 'Cover the toggle with a test', status: 'completed' },
]

export const MOCK_FLOW_SNAPSHOT: FlowSnapshot = {
  eventNodes: [
    { kind: 'user', seq: 1, turn: 1, step: 1, content: [{ kind: 'text', text: PROMPT }] },
    {
      kind: 'assistant',
      seq: 2,
      turn: 1,
      step: 1,
      blocks: [{ kind: 'reasoning', text: 'Three steps: read the theme wiring, add the toggle, then test it.' }],
    },
    {
      kind: 'tool-result',
      seq: 3,
      turn: 1,
      step: 1,
      callId: 'mock-todo',
      name: 'todo_write',
      args: { todos: MOCK_FLOW_TODOS },
      content: '3 tasks',
      callTime: 1000,
      time: 1400,
    },
    {
      kind: 'tool-result',
      seq: 4,
      turn: 1,
      step: 1,
      callId: 'mock-read-settings',
      name: 'read_file',
      args: { path: 'src/settings.ts' },
      content: 'export const settings = { theme: "light" }',
      callTime: 1500,
      time: 1900,
    },
    {
      kind: 'tool-result',
      seq: 5,
      turn: 1,
      step: 2,
      callId: 'mock-read-theme',
      name: 'read_file',
      args: { path: 'src/theme.ts' },
      content: 'export const theme = { mode: "light" }',
      callTime: 3000,
      time: 3400,
    },
    {
      kind: 'tool-result',
      seq: 6,
      turn: 1,
      step: 2,
      callId: 'mock-edit-theme',
      name: 'edit_file',
      args: { path: 'src/theme.ts' },
      content: 'applied 2 edits',
      callTime: 3500,
      time: 4200,
    },
    {
      kind: 'tool-result',
      seq: 7,
      turn: 1,
      step: 3,
      callId: 'mock-test',
      name: 'bash',
      args: { command: 'npm test' },
      content: 'pass 12',
      callTime: 4300,
      time: 6100,
    },
    {
      kind: 'assistant',
      seq: 8,
      turn: 1,
      step: 3,
      blocks: [{ kind: 'text', text: 'Added the dark mode toggle, persisted the choice, and covered it with a test.' }],
    },
  ],
  requests: [{ turn: 1, status: 'complete', requestConfig: { model: 'mock-model' } }],
  partial: null,
  runningCalls: [],
}
