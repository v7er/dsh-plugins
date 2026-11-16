/**
 * dsh-enhance Host half: owns ttyd processes and exposes them to the browser
 * through one same-origin route. The browser half only renders iframes.
 */
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const name = '@local/dsh-enhance'
export const inject = ['webServer']

const DEFAULT_THEME = {
  background: '#17191d',
  foreground: '#d7dce5',
  cursor: '#d7dce5',
  selectionBackground: '#2b3240',
  black: '#17191d',
  red: '#f07178',
  green: '#7ee787',
  yellow: '#ffd479',
  blue: '#79b8ff',
  magenta: '#d2a8ff',
  cyan: '#76e3ea',
  white: '#d7dce5',
  brightBlack: '#6b7280',
  brightRed: '#ff8b92',
  brightGreen: '#9ef0a5',
  brightYellow: '#ffe3a3',
  brightBlue: '#a5d6ff',
  brightMagenta: '#e2c5ff',
  brightCyan: '#a5f3f8',
  brightWhite: '#ffffff',
}

const SHELL_CANDIDATES = [
  process.env.SHELL,
  '/bin/zsh',
  '/bin/bash',
  '/opt/homebrew/bin/fish',
  '/usr/local/bin/fish',
  '/opt/homebrew/bin/pwsh',
  '/usr/local/bin/pwsh',
  '/bin/sh',
]

function findTtyd(config) {
  if (typeof config.ttydPath === 'string' && existsSync(config.ttydPath)) return config.ttydPath
  for (const candidate of ['/opt/homebrew/bin/ttyd', '/usr/local/bin/ttyd', '/usr/bin/ttyd']) {
    if (existsSync(candidate)) return candidate
  }
  try {
    return execFileSync('which', ['ttyd'], { encoding: 'utf8' }).trim() || undefined
  } catch {
    return undefined
  }
}

function discoverShells() {
  const seen = new Set()
  const shells = []
  for (const path of SHELL_CANDIDATES) {
    if (typeof path !== 'string' || path === '' || seen.has(path) || !existsSync(path)) continue
    seen.add(path)
    shells.push({ path, name: path.split('/').pop() })
  }
  return shells
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address !== null ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) req.destroy()
    })
    req.on('end', () => {
      try {
        resolve(body === '' ? {} : JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(data),
  })
  res.end(data)
}

export function apply(ctx, config = {}) {
  const configPath = fileURLToPath(new URL('./config.json', import.meta.url))
  const readConfig = () => {
    try {
      const raw = JSON.parse(readFileSync(configPath, 'utf8'))
      return {
        customLeftbar: raw.customLeftbar !== false,
        globalBar: raw.globalBar !== false,
        virtualGroups: raw.virtualGroups !== false,
        splitPanes: raw.splitPanes !== false,
      }
    } catch {
      return { customLeftbar: true, globalBar: true, virtualGroups: true, splitPanes: true }
    }
  }
  const ttydPath = findTtyd(config)
  const shells = discoverShells()
  const maxTerminals = Number.isFinite(config.maxTerminals) ? config.maxTerminals : 6
  const terminals = new Map()
  const badgesPath = fileURLToPath(new URL('./badges.json', import.meta.url))
  const decoratorsPath = fileURLToPath(new URL('./decorators.json', import.meta.url))
  const groupsPath = fileURLToPath(new URL('./groups.json', import.meta.url))
  let sequence = 0

  const close = (id) => {
    const terminal = terminals.get(id)
    if (terminal === undefined) return false
    terminals.delete(id)
    try {
      terminal.proc.kill('SIGTERM')
    } catch {
      // already gone
    }
    const timer = setTimeout(() => {
      try {
        terminal.proc.kill('SIGKILL')
      } catch {
        // already gone
      }
    }, 1500)
    timer.unref?.()
    return true
  }

  const create = async (body) => {
    if (ttydPath === undefined) throw new Error('ttyd not found')
    if (terminals.size >= maxTerminals) throw new Error('terminal limit reached')
    const requested = typeof body.shell === 'string' ? body.shell : undefined
    const shell = shells.find((entry) => entry.path === requested)?.path ?? shells[0]?.path
    if (shell === undefined) throw new Error('no shell found')
    const cwd = typeof body.cwd === 'string' && existsSync(body.cwd) ? body.cwd : (process.env.HOME ?? process.cwd())
    const theme = body.theme !== null && typeof body.theme === 'object' ? body.theme : DEFAULT_THEME
    const port = await freePort()
    const args = [
      '-p', String(port),
      '-i', '127.0.0.1',
      '-W',
      '-w', cwd,
      '-t', `theme=${JSON.stringify(theme)}`,
      '-t', `fontSize=${Number.isFinite(config.fontSize) ? config.fontSize : 13}`,
      '-t', `fontFamily=${typeof config.fontFamily === 'string' && config.fontFamily !== ''
        ? config.fontFamily
        : "'Hack Nerd Font Mono', 'JetBrains Mono', 'Fira Code', monospace"}`,
      shell,
    ]
    const proc = spawn(ttydPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    const id = `t${++sequence}`
    const entry = {
      id,
      port,
      shell,
      cwd,
      title: typeof body.title === 'string' && body.title !== '' ? body.title : shell.split('/').pop(),
      proc,
      createdAt: Date.now(),
    }
    terminals.set(id, entry)
    proc.on('exit', () => {
      terminals.delete(id)
    })
    proc.stderr.on('data', () => {})
    await new Promise((resolve) => setTimeout(resolve, 250))
    if (proc.exitCode !== null) {
      terminals.delete(id)
      throw new Error('ttyd exited before listening')
    }
    return {
      id,
      port,
      shell,
      cwd,
      title: entry.title,
      url: `http://127.0.0.1:${port}/`,
    }
  }

  const list = () => [...terminals.values()].map((terminal) => ({
    id: terminal.id,
    port: terminal.port,
    shell: terminal.shell,
    cwd: terminal.cwd,
    title: terminal.title,
    url: `http://127.0.0.1:${terminal.port}/`,
  }))

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-enhance/terminals',
    handler: async (req, res) => {
      try {
        if (req.method === 'GET') {
          sendJson(res, 200, { terminals: list(), shells, ttyd: ttydPath !== undefined })
          return
        }
        if (req.method === 'POST') {
          const body = await readJson(req)
          if (body.op === 'close') {
            sendJson(res, 200, { ok: close(body.id) })
            return
          }
          const terminal = await create(body)
          sendJson(res, 200, { ok: true, terminal })
          return
        }
        sendJson(res, 405, { error: 'method not allowed' })
      } catch (error) {
        sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'dsh-enhance: terminal route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-enhance/badges',
    handler: async (req, res) => {
      if (req.method === 'GET') {
        try {
          sendJson(res, 200, JSON.parse(readFileSync(badgesPath, 'utf8')))
        } catch {
          sendJson(res, 200, { shadowBrowser: false, workspaces: {} })
        }
        return
      }
      if (req.method === 'POST') {
        try {
          const body = await readJson(req)
          writeFileSync(badgesPath, JSON.stringify(body, null, 2) + '\n')
          sendJson(res, 200, { ok: true })
        } catch (error) {
          sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
        }
        return
      }
      sendJson(res, 405, { error: 'method not allowed' })
    },
  }), 'dsh-enhance: badges route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-enhance/decorators',
    handler: async (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'method not allowed' })
        return
      }
      try {
        sendJson(res, 200, JSON.parse(readFileSync(decoratorsPath, 'utf8')))
      } catch {
        sendJson(res, 200, { tools: {}, variants: {} })
      }
    },
  }), 'dsh-enhance: decorators route')

  const jsonFileRoute = (path, filePath, fallback) => ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path,
    handler: async (req, res) => {
      if (req.method === 'GET') {
        try {
          sendJson(res, 200, JSON.parse(readFileSync(filePath, 'utf8')))
        } catch {
          sendJson(res, 200, fallback)
        }
        return
      }
      if (req.method === 'POST') {
        try {
          const body = await readJson(req)
          writeFileSync(filePath, JSON.stringify(body, null, 2) + '\n')
          sendJson(res, 200, { ok: true })
        } catch (error) {
          sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
        }
        return
      }
      sendJson(res, 405, { error: 'method not allowed' })
    },
  }), 'dsh-enhance: ' + path)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-enhance/config',
    handler: async (req, res) => {
      if (req.method === 'GET') {
        sendJson(res, 200, readConfig())
        return
      }
      if (req.method === 'POST') {
        try {
          const body = await readJson(req)
          writeFileSync(configPath, JSON.stringify(body, null, 2) + '\n')
          sendJson(res, 200, { ok: true })
        } catch (error) {
          sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
        }
        return
      }
      sendJson(res, 405, { error: 'method not allowed' })
    },
  }), 'dsh-enhance: config route')
  jsonFileRoute('/dsh-enhance/groups', groupsPath, { groups: [] })

  ctx.effect(() => () => {
    for (const id of [...terminals.keys()]) close(id)
  }, 'dsh-enhance: terminal cleanup')
}
