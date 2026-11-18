/**
 * Self-check for the settings validator. Run: node selftest.mjs
 */
import assert from 'node:assert/strict'
import { normalizeConfig } from './index.js'

const base = {
  apiKeyEnv: 'LINEAR_API_KEY',
  pollIntervalMs: 60_000,
  autoStart: true,
  maxParallel: 3,
  promptTemplate: '',
  workspaces: [],
}

assert.equal(normalizeConfig(base).autoStart, true)
assert.equal(normalizeConfig({ ...base, autoStart: false }).autoStart, false)

const linked = normalizeConfig({
  ...base,
  workspaces: [{ id: 'ws-1', name: 'dsh', path: '/tmp/dsh', projectId: 'proj-1' }],
})
assert.deepEqual(linked.workspaces, [{ id: 'ws-1', name: 'dsh', path: '/tmp/dsh', projectId: 'proj-1' }])

assert.throws(() => normalizeConfig({ ...base, workspaces: [{ id: 'a', projectId: '' }] }), /needs a Linear project id/)
assert.throws(() => normalizeConfig({
  ...base,
  workspaces: [{ id: 'a', projectId: 'p' }, { id: 'a', projectId: 'q' }],
}), /used twice/)
assert.throws(() => normalizeConfig({ ...base, maxParallel: 0 }), /maxParallel/)
assert.throws(() => normalizeConfig({ ...base, maxParallel: 21 }), /maxParallel/)
assert.throws(() => normalizeConfig({ ...base, pollIntervalMs: 1000 }), /pollIntervalMs/)
assert.throws(() => normalizeConfig({ ...base, apiKeyEnv: 'not a name' }), /apiKeyEnv/)

console.log('dsh-linear selftest: ok')
