/**
 * Self-check for the settings validator. Run: node selftest.mjs
 */
import assert from 'node:assert/strict'
import { normalizeConfig } from './index.ts'

const base = {
  pollIntervalMs: 60_000,
  promptTemplate: '',
}

const legacy = normalizeConfig({
  ...base,
  apiKeyEnv: 'LINEAR_API_KEY',
  workspaces: [{ id: 'ws-1', name: 'dsh', path: '/tmp/dsh', projectId: 'proj-1' }],
})
assert.deepEqual(legacy.connections, [{ id: 'default', name: 'Linear', apiKeyEnv: 'LINEAR_API_KEY' }])
assert.deepEqual(legacy.boards, [{
  id: 'default',
  name: 'Board',
  connectionId: 'default',
  workspaces: [{ id: 'ws-1', name: 'dsh', path: '/tmp/dsh', projectId: 'proj-1', baseBranch: '' }],
}])

const multi = normalizeConfig({
  ...base,
  connections: [
    { id: 'c1', name: 'Work', apiKeyEnv: 'LINEAR_WORK' },
    { id: 'c2', name: 'Personal', apiKeyEnv: 'LINEAR_PERSONAL' },
  ],
  boards: [
    { id: 'b1', name: 'Gamehub', connectionId: 'c1', workspaces: [{ id: 'w1', projectId: 'p1', path: '/tmp/a' }] },
    { id: 'b2', name: 'Side', connectionId: 'c2', workspaces: [{ id: 'w2', projectId: 'p2', path: '/tmp/b' }] },
  ],
})
assert.equal(multi.connections.length, 2)
assert.equal(multi.boards.length, 2)
assert.equal(multi.boards[0].workspaces[0].name, 'a')

assert.equal(normalizeConfig({ ...base }).pollIntervalMs, 60_000)
assert.throws(() => normalizeConfig({ ...base, connections: [{ id: 'c', apiKeyEnv: 'not a name' }] }), /invalid apiKeyEnv/)
assert.throws(() => normalizeConfig({
  ...base,
  connections: [{ id: 'c', apiKeyEnv: 'LINEAR_KEY' }],
  boards: [{ id: 'b', connectionId: 'missing' }],
}), /unknown connection/)
assert.throws(() => normalizeConfig({
  ...base,
  connections: [{ id: 'c', apiKeyEnv: 'LINEAR_KEY' }],
  boards: [
    { id: 'b1', connectionId: 'c', workspaces: [{ id: 'w1', projectId: 'p1' }] },
    { id: 'b2', connectionId: 'c', workspaces: [{ id: 'w2', projectId: 'p1' }] },
  ],
}), /more than one board/)
assert.throws(() => normalizeConfig({
  ...base,
  connections: [{ id: 'c', apiKeyEnv: 'LINEAR_KEY' }],
  boards: [{ id: 'b', connectionId: 'c', workspaces: [{ id: 'w', projectId: '' }] }],
}), /needs a Linear project id/)
assert.throws(() => normalizeConfig({ ...base, pollIntervalMs: 1000 }), /pollIntervalMs/)

console.log('dsh-linear selftest: ok')
