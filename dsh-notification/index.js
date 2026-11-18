/**
 * Notification Host half: one durable list plus the service other plugins push to.
 *
 * Items live in `notifications.json` beside this module. A notification may carry
 * plain actions or a `options` choice; the plugin that pushed it registers the
 * handler with `onAction`, so the browser never decides what an action means.
 *
 * @module @local/dsh-notification
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

export const name = 'dsh-notification'

/** The HTTP routes need the web server; the service itself needs nothing else. */
export const inject = ['webServer']

const here = dirname(fileURLToPath(import.meta.url))
const storePath = join(here, 'notifications.json')
const MAX_ITEMS = 200
const MAX_BODY_BYTES = 1_000_000

function readItems() {
  try {
    const parsed = JSON.parse(readFileSync(storePath, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeItems(items) {
  writeFileSync(storePath, `${JSON.stringify(items.slice(0, MAX_ITEMS), null, 2)}\n`)
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
  })
  res.end(data)
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > MAX_BODY_BYTES) {
        req.destroy()
        reject(new Error('request body too large'))
      }
    })
    req.on('end', () => {
      try {
        resolve(raw === '' ? {} : JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

/**
 * @param ctx - host context with `webServer`.
 */
export function apply(ctx) {
  let items = readItems()
  const handlers = new Map()
  const save = () => writeItems(items)
  const find = id => items.find(item => item.id === id)

  const service = {
    /**
     * Add or replace one notification.
     * @param input - title, body, kind, source, actions, or an options choice.
     * @returns the notification id.
     */
    push(input = {}) {
      const item = {
        id: typeof input.id === 'string' && input.id !== '' ? input.id : randomUUID(),
        title: String(input.title ?? ''),
        body: String(input.body ?? ''),
        kind: String(input.kind ?? 'info'),
        source: String(input.source ?? 'plugin'),
        actions: Array.isArray(input.actions)
          ? input.actions.map(action => ({ id: String(action.id), label: String(action.label) }))
          : [],
        ...(Array.isArray(input.options)
          ? { options: input.options.map(option => ({ value: String(option.value), label: String(option.label) })) }
          : {}),
        ...(typeof input.confirmLabel === 'string' ? { confirmLabel: input.confirmLabel } : {}),
        createdAt: new Date().toISOString(),
        read: false,
      }
      items = [item, ...items.filter(existing => existing.id !== item.id)]
      save()
      return item.id
    },
    /**
     * Register what an action of one notification does.
     * @param id - notification id.
     * @param handler - receives the action id and the chosen option value.
     * @returns disposer removing the handler.
     */
    onAction(id, handler) {
      handlers.set(id, handler)
      return () => {
        handlers.delete(id)
      }
    },
    list() {
      return { items, unread: items.filter(item => !item.read).length }
    },
    read(id) {
      const item = find(id)
      if (item === undefined) return false
      item.read = true
      save()
      return true
    },
    readAll() {
      for (const item of items) item.read = true
      save()
    },
    dismiss(id) {
      items = items.filter(item => item.id !== id)
      handlers.delete(id)
      save()
    },
    /**
     * Run one action of one notification.
     * @param id - notification id.
     * @param actionId - action id, or `choose` for an options notification.
     * @param value - selected option value.
     * @returns the handler outcome, or the reason it could not run.
     */
    async act(id, actionId, value) {
      const item = find(id)
      if (item === undefined) return { ok: false, error: 'notification not found' }
      const handler = handlers.get(id)
      if (handler === undefined) return { ok: false, error: 'this notification has no handler' }
      try {
        const result = await handler(actionId, value)
        item.read = true
        save()
        return { ok: true, result: result ?? null }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
      }
    },
  }

  ctx.provide('notifications', service)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-notification/list',
    handler: (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: 'method not allowed' })
        return
      }
      sendJson(res, 200, service.list())
    },
  }), 'dsh-notification: list route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/dsh-notification/act',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'method not allowed' })
        return
      }
      try {
        const body = await readJson(req)
        if (body.op === 'read') {
          sendJson(res, 200, { ok: service.read(String(body.id)) })
          return
        }
        if (body.op === 'readAll') {
          service.readAll()
          sendJson(res, 200, { ok: true })
          return
        }
        if (body.op === 'dismiss') {
          service.dismiss(String(body.id))
          sendJson(res, 200, { ok: true })
          return
        }
        sendJson(res, 200, await service.act(String(body.id), String(body.actionId ?? ''), body.value))
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'dsh-notification: act route')
}
