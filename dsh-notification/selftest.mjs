/**
 * Self-check for the notification service. Run: node selftest.mjs
 */
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apply } from './index.js'

const here = dirname(fileURLToPath(import.meta.url))
rmSync(join(here, 'notifications.json'), { force: true })

let service
const ctx = {
  provide(name, value) {
    if (name === 'notifications') service = value
  },
  effect(fn) {
    fn()
  },
  webServer: { register: () => () => {} },
  get: () => undefined,
}

apply(ctx)
assert.ok(service, 'the service is provided')

const id = service.push({ title: 'A', body: 'B', actions: [{ id: 'go', label: 'Go' }] })
assert.equal(service.list().unread, 1)
assert.equal(service.list().items[0].title, 'A')

let called
service.onAction(id, async (actionId, value) => {
  called = { actionId, value }
  return { panel: 'linear' }
})
assert.deepEqual(await service.act(id, 'go', undefined), { ok: true, result: { panel: 'linear' } })
assert.deepEqual(called, { actionId: 'go', value: undefined })
assert.equal(service.list().unread, 0)

const choice = service.push({ id: 'choose-1', title: 'C', options: [{ value: 'w1', label: 'One' }] })
assert.equal(choice, 'choose-1')
assert.equal(service.list().items[0].options[0].value, 'w1')
assert.equal((await service.act('choose-1', 'choose', 'w1')).ok, false, 'no handler yet')

service.onAction('choose-1', async (actionId, value) => ({ actionId, value }))
assert.deepEqual(await service.act('choose-1', 'choose', 'w1'), { ok: true, result: { actionId: 'choose', value: 'w1' } })

service.dismiss('choose-1')
assert.equal(service.list().items.some(item => item.id === 'choose-1'), false)

rmSync(join(here, 'notifications.json'), { force: true })
console.log('dsh-notification selftest: ok')
