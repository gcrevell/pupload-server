import { strict as assert } from 'node:assert'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, test } from 'node:test'
import { defaultSettings, loadSettings, parseSettings, SettingsError, settingsFile } from '../server/settings.ts'

const dir = mkdtempSync(join(tmpdir(), 'pupload-settings-'))
after(() => rmSync(dir, { recursive: true, force: true }))

function refuses(text: string, start: string): void {
  assert.throws(() => parseSettings(text, 'settings.json'), (err) => err instanceof SettingsError && err.message.startsWith(start))
}

test('the settings file is config/settings.json, or in PUPLOAD_CONFIG_DIR', () => {
  assert.equal(settingsFile({}), resolve('config', 'settings.json'))
  assert.equal(settingsFile({ PUPLOAD_CONFIG_DIR: '/config' }), '/config/settings.json')
})

test('a missing settings file is written with the defaults', () => {
  const file = join(dir, 'new', 'settings.json')
  const { settings, created } = loadSettings(file)
  assert.equal(created, true)
  assert.deepEqual(settings, { port: 7875 })
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), defaultSettings)
})

test('an existing settings file is read and left alone', () => {
  const file = join(dir, 'settings.json')
  writeFileSync(file, '{"port": 9000}')
  assert.deepEqual(loadSettings(file), { settings: { port: 9000 }, created: false })
  assert.equal(readFileSync(file, 'utf8'), '{"port": 9000}')
})

test('a setting left out uses its default', () => {
  assert.deepEqual(parseSettings('{}', 'settings.json'), { port: 7875 })
})

test('a settings file that is not a JSON object is refused', () => {
  refuses('{"port": 7875', `settings.json isn't valid JSON.`)
  refuses('[]', 'settings.json should hold a JSON object')
})

test('an unknown setting is refused', () => {
  refuses('{"prot": 7875}', 'settings.json has a setting called "prot"')
})

test('a port that is not a port number is refused', () => {
  for (const port of ['"7875"', '0', '65536', '80.5', 'null']) refuses(`{"port": ${port}}`, `"port" in settings.json is ${port}.`)
})
