/**
 * Runtime check without the Harness: mount the Host half on a stub context,
 * then exercise the board and connect routes. Run: node runtime-check.mjs
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apply } from './index.ts'

const here = dirname(fileURLToPath(import.meta.url))
const configPath = join(here, 'config.json')
const repoPath = mkdtempSync(join(tmpdir(), 'dsh-linear-repo-'))
execFileSync('git', ['init', repoPath])
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
  on() {
    return () => {}
  },
  tools: {
    register() {},
  },
  provide() {},
  inject(_deps, cb) {
    cb({ effect: (fn) => fn(), commands: { register: () => () => {} } })
  },
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
  assert.ok(Array.isArray(board.body.cycles), 'cycles is an array')
  assert.ok(Array.isArray(board.body.turns), 'turns is an array')
  assert.ok(Array.isArray(board.body.milestones), 'milestones is an array')
  assert.ok(Array.isArray(board.body.boards), 'boards is an array')
  assert.ok(Array.isArray(board.body.connections), 'connections is an array')
  assert.equal(typeof board.body.config.pollIntervalMs, 'number')

  const connect = await call('/dsh-linear/connect', 'GET')
  assert.equal(connect.status, 200)
  assert.ok(Array.isArray(connect.body.connections), 'connect connections is an array')

  const emptyKey = await call('/dsh-linear/act', 'POST', { op: 'connect', key: '  ' })
  assert.equal(emptyKey.body.ok, false)
  assert.match(emptyKey.body.error, /Enter a Linear API key/)

  const before = (await call('/dsh-linear/board', 'GET')).body.boards[0].workspaces.length
  const added = await call('/dsh-linear/act', 'POST', {
    op: 'addWorkspace',
    workspace: { projectId: 'proj-1', path: repoPath, name: 'dsh' },
  })
  assert.equal(added.body.ok, true)
  assert.equal(added.body.config.boards[0].workspaces.length, before + 1)
  assert.equal(added.body.config.boards[0].workspaces.at(-1).name, 'dsh')

  const duplicate = await call('/dsh-linear/act', 'POST', {
    op: 'addWorkspace',
    workspace: { projectId: 'proj-1', path: repoPath, name: 'dsh' },
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
    id: added.body.config.boards[0].workspaces.at(-1).id,
  })
  assert.equal(removed.body.ok, true)
  assert.equal(removed.body.config.boards[0].workspaces.length, before)

  const connection = await call('/dsh-linear/act', 'POST', {
    op: 'addConnection',
    connection: { name: 'Test connection' },
  })
  assert.equal(connection.body.ok, true)
  const connectionId = connection.body.config.connections.at(-1).id
  assert.equal(connection.body.config.connections.at(-1).name, 'Test connection')

  const renamed = await call('/dsh-linear/act', 'POST', {
    op: 'saveConnection',
    connection: { id: connectionId, name: 'Renamed connection' },
  })
  assert.equal(renamed.body.ok, true)
  assert.equal(renamed.body.config.connections.find(candidate => candidate.id === connectionId).name, 'Renamed connection')

  const boardAdded = await call('/dsh-linear/act', 'POST', {
    op: 'addBoard',
    board: { name: 'Test board', connectionId },
  })
  assert.equal(boardAdded.body.ok, true)
  const boardId = boardAdded.body.config.boards.at(-1).id
  assert.equal(boardAdded.body.config.boards.at(-1).name, 'Test board')

  const boardRemoved = await call('/dsh-linear/act', 'POST', { op: 'removeBoard', id: boardId })
  assert.equal(boardRemoved.body.ok, true)
  assert.equal(boardRemoved.body.config.boards.some(candidate => candidate.id === boardId), false)

  const connectionRemoved = await call('/dsh-linear/act', 'POST', { op: 'removeConnection', id: connectionId })
  assert.equal(connectionRemoved.body.ok, true)
  assert.equal(connectionRemoved.body.config.connections.some(candidate => candidate.id === connectionId), false)

  const bad = await call('/dsh-linear/act', 'POST', { op: 'move', id: 'missing', status: 'done' })
  assert.equal(bad.body.ok, false)
  assert.match(bad.body.error, /task not found/)

  const badCycle = await call('/dsh-linear/act', 'POST', { op: 'updateCycle', cycle: { id: 'missing', name: 'x' } })
  assert.equal(badCycle.body.ok, false)
  assert.match(badCycle.body.error, /cycle not found/)

  // Cycles start with the first turn; there is no manual start op.
  const noStartCycle = await call('/dsh-linear/act', 'POST', { op: 'startCycle', cycleId: 'missing' })
  assert.equal(noStartCycle.body.ok, false)
  assert.match(noStartCycle.body.error, /unknown op/)

  const badFields = await call('/dsh-linear/act', 'POST', { op: 'updateTaskFields', task: { id: 'missing', estimate: 1 } })
  assert.equal(badFields.body.ok, false)
  assert.match(badFields.body.error, /task not found/)

  // Realtime: the events route holds the response open and a config write
  // pushes a change frame to every subscriber.
  const frames = []
  const sseRes = {
    writeHead(status, headers) {
      this.status = status
      this.headers = headers
    },
    write(chunk) {
      frames.push(chunk)
    },
    end() {},
  }
  routes.get('/dsh-linear/events')({ on() {} }, sseRes)
  assert.equal(sseRes.status, 200)
  assert.match(sseRes.headers['content-type'], /text\/event-stream/)
  await call('/dsh-linear/act', 'POST', {
    op: 'addWorkspace',
    workspace: { projectId: 'proj-sse', path: '/tmp/sse', name: 'sse' },
  })
  await new Promise(resolve => setTimeout(resolve, 120))
  assert.ok(frames.some(chunk => chunk.includes('data: changed')), 'SSE pushed a change')

  console.log('dsh-linear runtime-check: ok')
} finally {
  rmSync(repoPath, { recursive: true, force: true })
  if (original === undefined) rmSync(configPath, { force: true })
  else writeFileSync(configPath, original)
  process.exit(0)
}
