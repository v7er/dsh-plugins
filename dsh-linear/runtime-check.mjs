/**
 * Runtime check without the Harness: mount the Host half on a stub context,
 * then exercise the board and connect routes. Run: node runtime-check.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apply } from './index.js'

const here = dirname(fileURLToPath(import.meta.url))
const configPath = join(here, 'config.json')
let original
try {
  original = readFileSync(configPath, 'utf8')
} catch {
  original = undefined
}

const routes = new Map()
const ctx = {
  effect(fn) {
    return fn()
  },
  get() {
    return undefined
  },
  provide() {},
  webServer: {
    register(route) {
      routes.set(route.path, route.handler)
      return () => routes.delete(route.path)
    },
  },
}

apply(ctx, {})
assert.ok(routes.has('/dsh-linear/board'), 'board route registered')
assert.ok(routes.has('/dsh-linear/connect'), 'connect route registered')
assert.ok(routes.has('/dsh-linear/act'), 'act route registered')

const call = (path, method, body) => new Promise((resolve, reject) => {
  const res = {
    writeHead(status) {
      this.status = status
    },
    end(data) {
      resolve({ status: this.status, body: JSON.parse(data) })
    },
  }
  const req = {
    method,
    on(event, listener) {
      if (event === 'data' && body !== undefined) listener(JSON.stringify(body))
      if (event === 'end') listener()
      return req
    },
  }
  Promise.resolve(routes.get(path)(req, res)).catch(reject)
})

try {
  await new Promise(resolve => setTimeout(resolve, 300))

  const board = await call('/dsh-linear/board', 'GET')
  assert.equal(board.status, 200)
  assert.ok(Array.isArray(board.body.tasks), 'tasks is an array')
  assert.ok(Array.isArray(board.body.workspaces), 'workspaces is an array')
  assert.equal(typeof board.body.config.maxParallel, 'number')

  const connect = await call('/dsh-linear/connect', 'GET')
  assert.equal(connect.status, 200)
  assert.equal(connect.body.keyConfigured, false)
  assert.deepEqual(connect.body.projects, [])

  const emptyKey = await call('/dsh-linear/act', 'POST', { op: 'connect', key: '  ' })
  assert.equal(emptyKey.body.ok, false)
  assert.match(emptyKey.body.error, /Enter a Linear API key/)

  const added = await call('/dsh-linear/act', 'POST', {
    op: 'addWorkspace',
    workspace: { projectId: 'proj-1', path: '/tmp/dsh', name: 'dsh' },
  })
  assert.equal(added.body.ok, true)
  assert.equal(added.body.config.workspaces.length, 1)
  assert.equal(added.body.config.workspaces[0].name, 'dsh')

  const duplicate = await call('/dsh-linear/act', 'POST', {
    op: 'addWorkspace',
    workspace: { projectId: 'proj-1', path: '/tmp/dsh', name: 'dsh' },
  })
  assert.equal(duplicate.body.ok, false)
  assert.match(duplicate.body.error, /already linked/)

  const missingPath = await call('/dsh-linear/act', 'POST', {
    op: 'addWorkspace',
    workspace: { projectId: 'proj-2', path: '', name: 'x' },
  })
  assert.equal(missingPath.body.ok, false)
  assert.match(missingPath.body.error, /Choose a directory/)

  const removed = await call('/dsh-linear/act', 'POST', {
    op: 'removeWorkspace',
    id: added.body.config.workspaces[0].id,
  })
  assert.equal(removed.body.ok, true)
  assert.equal(removed.body.config.workspaces.length, 0)

  const bad = await call('/dsh-linear/act', 'POST', { op: 'move', id: 'missing', status: 'done' })
  assert.equal(bad.body.ok, false)
  assert.match(bad.body.error, /task not found/)

  console.log('dsh-linear runtime-check: ok')
} finally {
  if (original === undefined) rmSync(configPath, { force: true })
  else writeFileSync(configPath, original)
  process.exit(0)
}
