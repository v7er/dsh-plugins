/**
 * Self-check for the browser half without a browser: load the module with a
 * stub loader and React, then run apply against a stub context. Run: node client-check.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const React = {
  createElement: (...args) => ({ args }),
  useState: value => [value, () => {}],
  useCallback: fn => fn,
  useEffect: () => {},
  useLayoutEffect: () => {},
  useRef: value => ({ current: value }),
  useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
}

let mod
const sandbox = {
  window: { __ModuleLoader__: { load: (definition) => { mod = definition } } },
  document: { createElement: () => ({ dataset: {}, remove() {} }), head: { appendChild() {} } },
  console,
  fetch: async () => ({ ok: true, json: async () => ({}) }),
  setInterval: () => 0,
  clearInterval: () => {},
}
vm.createContext(sandbox)
vm.runInContext(readFileSync(new URL('./client.js', import.meta.url), 'utf8'), sandbox)

const { inject, apply, finalTranscript, cycleWindow } = mod.factory((id) => {
  if (id === 'react') return React
  throw new Error(`unexpected module ${id}`)
})

const registered = []
const ctx = {
  uiWorkspace: { pickDirectory: async () => '/tmp' },
  workspaces: {
    list: { getSnapshot: () => ({ items: [] }), subscribe: () => () => {} },
    create: async () => ({ path: '/tmp', title: 'tmp' }),
  },
  effect: fn => fn(),
  locale: { register: () => () => {}, bind: () => key => key },
  slots: {
    inject: (name, fn) => { registered.push(name); fn() },
    register: (definition) => { registered.push(definition.name); return () => {} },
  },
}
apply(ctx)

assert.ok(inject.includes('workspaces'), 'workspaces service is injected')
assert.ok(registered.includes('main'), 'board panel registered')

const event = (seq, type, data) => ({ type: 'event', event: { seq, type, data } })
const text = value => [{ type: 'text', text: value }]
const rows = finalTranscript([
  event(1, 'turn/start', { turn: 1 }),
  event(2, 'user/message', { source: { kind: 'user' }, content: text('fix it') }),
  event(3, 'assistant/message', { message: { content: [{ type: 'reasoning', text: 'thinking' }] } }),
  event(4, 'tool/call', { name: 'bash', arguments: '{}' }),
  event(5, 'assistant/message', { message: { content: text('done') } }),
  event(6, 'turn/end', { turn: 1 }),
  event(7, 'turn/start', { turn: 2 }),
  event(8, 'user/message', { source: { kind: 'context' }, content: text('injected') }),
  event(9, 'assistant/message', { message: { content: text('still running') } }),
])
assert.equal(JSON.stringify(rows.map(row => [row.role, row.text])), JSON.stringify([
  ['user', 'fix it'],
  ['assistant', 'done'],
  ['assistant', 'still running'],
]), 'one final assistant row per turn, no thinking or tool rows')

const cycle = (number, startsAt, endsAt, state) => ({ id: String(number), number: String(number), startsAt, endsAt, state })
const window = cycleWindow([
  cycle(11, '2026-10-04T17:00:00.000Z', '2026-10-18T17:00:00.000Z', 'closed'),
  cycle(12, '2026-10-18T17:00:00.000Z', '2026-11-01T17:00:00.000Z', 'closed'),
  cycle(14, '2026-11-15T17:00:00.000Z', '2026-11-29T17:00:00.000Z', 'active'),
  cycle(15, '2026-11-29T17:00:00.000Z', '2026-12-13T17:00:00.000Z', 'idle'),
  cycle(16, '2026-12-13T17:00:00.000Z', '2026-12-27T17:00:00.000Z', 'idle'),
])
assert.equal(window.current?.number, '14', 'active cycle is current')
assert.equal(window.next?.number, '15', 'next cycle follows current')
assert.equal(cycleWindow([]).current, null, 'no cycles means no current')
assert.equal(cycleWindow([]).next, null, 'no cycles means no next')
const future = cycleWindow([cycle(20, '2099-01-01T00:00:00.000Z', '2099-01-15T00:00:00.000Z', 'idle')])
assert.equal(future.current, null, 'a future cycle is not current')
assert.equal(future.next?.number, '20', 'the first future cycle is next')

console.log('dsh-linear client-check: ok')
