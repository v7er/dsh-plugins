import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const toolsDir = path.resolve(process.env.DSH_INSTALL_DIR, '..', 'dsh-tools', 'lib', 'index.js')
const { assertSupportedJsonSchema, validateJsonSchemaValue } = await import(pathToFileURL(toolsDir).href)
const plugin = await import('./index.js')

const tools = []
const sections = []
const commands = []
plugin.apply({
  tools: { register: tool => tools.push(tool) },
  systemPrompt: { section: section => sections.push(section) },
  commands: { register: command => commands.push(command) },
}, {})

assert.equal(tools.length, 3)
assert.equal(sections.length, 1)
assert.equal(commands.length, 2)
assert.deepEqual(commands.map(command => command.name).sort(), ['s', 'simsa'])
for (const tool of tools) {
  assertSupportedJsonSchema(tool.parameters)
  assertSupportedJsonSchema(tool.output.schema)
  assert.equal(tool.parameters.type, 'object')
}

const memory = tools.find(tool => tool.name === 'simsa_memory')
assert.deepEqual(validateJsonSchemaValue(memory.parameters, { action: 'search', query: 'x' }, ''), [])
assert.ok(validateJsonSchemaValue(memory.parameters, { action: 'nope' }, '').length > 0)
assert.ok(validateJsonSchemaValue(memory.parameters, { action: 'search', extra: 1 }, '').length > 0)

const refine = tools.find(tool => tool.name === 'simsa_refine')
assert.deepEqual(validateJsonSchemaValue(refine.parameters, { prompt: 'x' }, ''), [])
assert.ok(validateJsonSchemaValue(refine.parameters, {}, '').length > 0)

console.log('simsa schema check ok')
