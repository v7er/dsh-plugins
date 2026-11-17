/**
 * dsh-enhance Host half: owns ttyd processes and exposes them to the browser
 * through one same-origin route. The browser half only renders iframes.
 */
import { spawn, execFileSync } from 'node:child_process'
import { createServer, connect } from 'node:net'
import { createServer as createHttpServer, request } from 'node:http'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
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

const EDITOR_PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'

function findCommand(candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    if (candidate.includes('/') && existsSync(candidate)) return candidate
  }
  for (const name of candidates) {
    if (name.includes('/')) continue
    try {
      const found = execFileSync('which', [name], { encoding: 'utf8' }).trim()
      if (found !== '') return found
    } catch {
      // not on PATH
    }
  }
  return undefined
}

function appExists(app: string): boolean {
  return existsSync(`/Applications/${app}.app`) || existsSync(`/System/Applications/${app}.app`)
}

interface EditorDef {
  id: string
  type: 'ttyd' | 'web' | 'novnc' | 'native'
  label: string
  command?: string
  url?: string
  app?: string
  icon: string
  color: string
}

const EDITOR_DEFAULTS: EditorDef[] = [
  { id: 'nvim', type: 'ttyd', label: 'Neovim', command: findCommand(['/opt/homebrew/bin/nvim', '/usr/local/bin/nvim', 'nvim']), icon: 'N', color: '#57a143' },
  { id: 'vscode', type: 'web', label: 'VS Code', command: findCommand(['/opt/homebrew/bin/code', '/usr/local/bin/code', '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code']), icon: 'VS', color: '#007acc' },
  { id: 'cursor', type: 'native', label: 'Cursor', app: 'Cursor', command: findCommand(['/Applications/Cursor.app/Contents/Resources/app/bin/cursor']), icon: 'C', color: '#2b2b2b' },
  { id: 'sublime', type: 'native', label: 'Sublime Text', app: 'Sublime Text', command: findCommand(['/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl']), icon: 'S', color: '#ff9800' },
  { id: 'zed', type: 'native', label: 'Zed', app: 'Zed', command: findCommand(['/Applications/Zed.app/Contents/MacOS/cli', 'zed']), icon: 'Z', color: '#084ccf' },
]

function normalizeEditors(raw: any): EditorDef[] {
  const merged = new Map<string, EditorDef>(EDITOR_DEFAULTS.map((editor) => [editor.id, { ...editor }]))
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (entry === null || typeof entry !== 'object') continue
      if (typeof entry.id !== 'string' || entry.id === '') continue
      const base: EditorDef = merged.get(entry.id) ?? {
        id: entry.id,
        type: 'ttyd',
        label: entry.id,
        icon: entry.id.slice(0, 2).toUpperCase(),
        color: '#6b7280',
      }
      const type = entry.type === 'novnc' || entry.type === 'web' || entry.type === 'native' || entry.type === 'ttyd'
        ? entry.type
        : base.type
      merged.set(entry.id, {
        ...base,
        type,
        label: typeof entry.label === 'string' && entry.label !== '' ? entry.label : base.label,
        command: typeof entry.command === 'string' && entry.command !== '' ? entry.command : base.command,
        url: typeof entry.url === 'string' && entry.url !== '' ? entry.url : base.url,
        app: typeof entry.app === 'string' && entry.app !== '' ? entry.app : base.app,
        icon: typeof entry.icon === 'string' && entry.icon !== '' ? entry.icon : base.icon,
        color: typeof entry.color === 'string' && entry.color !== '' ? entry.color : base.color,
      })
    }
  }
  return [...merged.values()]
}

function findTtyd(config: any): string | undefined {
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

function discoverShells(): Array<{ path: string; name: string }> {
  const seen = new Set()
  const shells = []
  for (const path of SHELL_CANDIDATES) {
    if (typeof path !== 'string' || path === '' || seen.has(path) || !existsSync(path)) continue
    seen.add(path)
    shells.push({ path, name: path.split('/').pop() })
  }
  return shells
}

function freePort(): Promise<number> {
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

function readJson(req: any): Promise<any> {
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

function sendJson(res: any, status: number, body: any) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(data),
  })
  res.end(data)
}

export function apply(ctx: any, config: any = {}) {
  const here = dirname(fileURLToPath(import.meta.url))
  const rootDir = existsSync(join(here, 'config.json')) ? here : join(here, '..')
  const configPath = join(rootDir, 'config.json')
  const readRaw = () => {
    try {
      return JSON.parse(readFileSync(configPath, 'utf8'))
    } catch {
      return {}
    }
  }
  const readConfig = () => {
    const raw = readRaw()
    return {
      ...raw,
      customLeftbar: raw.customLeftbar !== false,
      globalBar: raw.globalBar !== false,
      virtualGroups: raw.virtualGroups !== false,
      splitPanes: raw.splitPanes !== false,
    }
  }
  const ttydPath = findTtyd(config)
  const shells = discoverShells()
  const maxTerminals = Number.isFinite(config.maxTerminals) ? config.maxTerminals : 6
  const terminals = new Map<string, any>()
  const badgesPath = join(rootDir, 'badges.json')
  const decoratorsPath = join(rootDir, 'decorators.json')
  const groupsPath = join(rootDir, 'groups.json')
  let sequence = 0

  const close = (id: string) => {
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

  const create = async (body: any) => {
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

  const maxEditors = 5
  const editors = new Map<string, any>()
  let editorSequence = 0

  const editorDefs = () => normalizeEditors(readRaw().editors)

  const editorCwd = (requested?: string) => {
    if (typeof requested === 'string' && requested !== '' && existsSync(requested)) return requested
    const raw = readRaw()
    if (typeof raw.editorCwd === 'string' && existsSync(raw.editorCwd)) return raw.editorCwd
    return process.env.HOME ?? process.cwd()
  }

  const commandReady = (command?: string) => typeof command === 'string' && command !== ''
    && (command.includes('/') ? existsSync(command) : findCommand([command]) !== undefined)

  const editorAvailability = (editor: EditorDef) => {
    if (editor.type === 'novnc') {
      return typeof editor.url === 'string' && editor.url !== ''
        ? { available: true }
        : { available: false, reason: 'no noVNC URL configured' }
    }
    if (editor.type === 'native') {
      const ready = editor.app !== undefined ? appExists(editor.app) : commandReady(editor.command)
      return ready ? { available: true } : { available: false, reason: `${editor.app ?? editor.command} not installed` }
    }
    if (editor.type === 'web') {
      return commandReady(editor.command) ? { available: true } : { available: false, reason: 'CLI not found' }
    }
    if (ttydPath === undefined) return { available: false, reason: 'ttyd not found' }
    return commandReady(editor.command) ? { available: true } : { available: false, reason: `${editor.command} not found` }
  }

  const editorStatus = () => ({
    editors: editorDefs().map((editor) => ({
      id: editor.id,
      label: editor.label,
      type: editor.type,
      icon: editor.icon,
      color: editor.color,
      ...editorAvailability(editor),
    })),
    running: [...editors.values()].map((editor) => ({ editorId: editor.editorId, url: editor.url })),
  })

  const editorEnv = () => ({
    ...process.env,
    PATH: `${EDITOR_PATH}:${process.env.PATH ?? ''}`,
    COLORTERM: 'truecolor',
  })

  const waitForPort = (port: number, timeoutMs: number) => new Promise<void>((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const attempt = () => {
      const socket = connect(port, '127.0.0.1')
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() > deadline) reject(new Error('timed out waiting for the editor server'))
        else setTimeout(attempt, 200)
      })
    }
    attempt()
  })

  // The VS Code web server sends X-Frame-Options and frame-ancestors, so the tab
  // reaches it through this loopback proxy, which also carries its WebSocket.
  const startProxy = (targetPort: number) => new Promise<any>((resolve, reject) => {
    const server = createHttpServer((req, res) => {
      const upstream = request({
        host: '127.0.0.1',
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${targetPort}` },
      }, (up) => {
        const headers = { ...up.headers }
        delete headers['x-frame-options']
        delete headers['content-security-policy']
        delete headers['content-security-policy-report-only']
        res.writeHead(up.statusCode ?? 502, headers)
        up.pipe(res)
      })
      upstream.on('error', () => {
        if (!res.headersSent) res.writeHead(502)
        res.end('editor proxy error')
      })
      req.pipe(upstream)
    })
    server.on('upgrade', (req, socket, head) => {
      const upstream = connect(targetPort, '127.0.0.1', () => {
        const headers = { ...req.headers, host: `127.0.0.1:${targetPort}`, origin: `http://127.0.0.1:${targetPort}` }
        upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join('\r\n')}\r\n\r\n`)
        if (head !== undefined && head.length > 0) upstream.write(head)
        upstream.pipe(socket)
        socket.pipe(upstream)
      })
      upstream.on('error', () => socket.destroy())
      socket.on('error', () => upstream.destroy())
    })
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve({ server, port: typeof address === 'object' && address !== null ? address.port : 0 })
    })
  })

  const killEditorProcess = (proc: any) => {
    if (proc === undefined || proc === null || proc.exitCode !== null) return
    try {
      process.kill(-proc.pid, 'SIGTERM')
    } catch {
      try {
        proc.kill('SIGTERM')
      } catch {
        // already gone
      }
    }
  }

  const stopEditor = (editorId: string) => {
    const editor = editors.get(editorId)
    if (editor === undefined) return false
    editors.delete(editorId)
    killEditorProcess(editor.proc)
    try {
      editor.proxy?.server?.close()
    } catch {
      // already closed
    }
    return true
  }

  const startEditor = async (editorId: string, requestedCwd?: string) => {
    // shortcut: one process per editor id survives its tab closing, at most five, killed on plugin unload.
    const def = editorDefs().find((editor) => editor.id === editorId)
    if (def === undefined) throw new Error(`unknown editor: ${editorId}`)
    if (def.type === 'novnc') {
      if (typeof def.url !== 'string' || def.url === '') throw new Error('noVNC URL not configured')
      return { editorId: def.id, url: def.url }
    }
    const existing = editors.get(def.id)
    if (existing !== undefined) return { editorId: def.id, url: existing.url }
    if (editors.size >= maxEditors) throw new Error('editor limit reached')
    const cwd = editorCwd(requestedCwd)

    if (def.type === 'native') {
      if (def.app === undefined || !appExists(def.app)) throw new Error(`${def.app ?? def.id} not installed`)
      const proc = spawn('open', ['-a', def.app, cwd], { stdio: 'ignore' })
      await new Promise((resolve) => setTimeout(resolve, 300))
      if (proc.exitCode !== null && proc.exitCode !== 0) throw new Error(`could not open ${def.app}`)
      return { editorId: def.id, native: true, label: def.label }
    }

    if (def.type === 'web') {
      if (!commandReady(def.command)) throw new Error('CLI not found')
      const port = await freePort()
      const args = [
        'serve-web',
        '--host', '127.0.0.1',
        '--port', String(port),
        '--without-connection-token',
        '--accept-server-license-terms',
        '--disable-telemetry',
        '--default-folder', cwd,
      ]
      const proc = spawn(def.command as string, args, { stdio: ['ignore', 'ignore', 'pipe'], env: editorEnv(), detached: true })
      const entry: any = { editorId: def.id, id: `e${++editorSequence}`, port, proc, url: undefined }
      editors.set(def.id, entry)
      proc.stderr.on('data', () => {})
      proc.on('exit', () => {
        if (editors.get(def.id) === entry) editors.delete(def.id)
        try {
          entry.proxy?.server?.close()
        } catch {
          // already closed
        }
      })
      try {
        await waitForPort(port, 30_000)
        const proxy = await startProxy(port)
        entry.proxy = proxy
        entry.url = `http://127.0.0.1:${proxy.port}/`
      } catch (error) {
        stopEditor(def.id)
        throw error
      }
      return { editorId: def.id, url: entry.url }
    }

    if (ttydPath === undefined) throw new Error('ttyd not found')
    if (!commandReady(def.command)) throw new Error(`${def.command} not found`)
    const port = await freePort()
    const args = [
      '-p', String(port),
      '-i', '127.0.0.1',
      '-W',
      '-w', cwd,
      '-t', `theme=${JSON.stringify(DEFAULT_THEME)}`,
      '-t', `fontSize=${Number.isFinite(config.fontSize) ? config.fontSize : 13}`,
      '-t', `fontFamily=${typeof config.fontFamily === 'string' && config.fontFamily !== ''
        ? config.fontFamily
        : "'Hack Nerd Font Mono', 'JetBrains Mono', 'Fira Code', monospace"}`,
      '-t', `titleFixed=${def.label}`,
      def.command as string,
    ]
    const proc = spawn(ttydPath, args, { stdio: ['ignore', 'ignore', 'pipe'], env: editorEnv(), detached: true })
    const entry = { editorId: def.id, id: `e${++editorSequence}`, port, proc, url: `http://127.0.0.1:${port}/` }
    editors.set(def.id, entry)
    proc.on('exit', () => {
      if (editors.get(def.id) === entry) editors.delete(def.id)
    })
    proc.stderr.on('data', () => {})
    await new Promise((resolve) => setTimeout(resolve, 250))
    if (proc.exitCode !== null) {
      editors.delete(def.id)
      throw new Error(`${def.command} exited before listening`)
    }
    return { editorId: def.id, url: entry.url }
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-enhance/editors',
    handler: async (req, res) => {
      try {
        if (req.method === 'GET') {
          sendJson(res, 200, editorStatus())
          return
        }
        if (req.method === 'POST') {
          const body = await readJson(req)
          if (body.op === 'stop') {
            sendJson(res, 200, { ok: stopEditor(body.editorId) })
            return
          }
          const started = await startEditor(
            typeof body.editor === 'string' ? body.editor : '',
            typeof body.cwd === 'string' ? body.cwd : undefined,
          )
          sendJson(res, 200, { ok: true, ...started })
          return
        }
        sendJson(res, 405, { error: 'method not allowed' })
      } catch (error) {
        sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'dsh-enhance: editor route')

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

  const jsonFileRoute = (path: string, filePath: string, fallback: any) => ctx.effect(() => ctx.webServer.register({
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
    for (const id of [...editors.keys()]) stopEditor(id)
  }, 'dsh-enhance: terminal cleanup')
}
