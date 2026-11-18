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

const { inject, apply } = mod.factory((id) => {
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
assert.ok(registered.includes('settings.section'), 'settings page registered')

console.log('dsh-linear client-check: ok')
