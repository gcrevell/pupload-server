import { strict as assert } from 'node:assert'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, test } from 'node:test'
import { defaultSettings } from '../server/settings/default-settings.ts'
import { loadSettings, parseSettings, settingsFile } from '../server/settings/load-settings.ts'
import { SettingsError } from '../server/settings/settings-error.ts'

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
  assert.deepEqual(settings, { port: 7875, trustedProxies: [], publicUrl: null })
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), defaultSettings)
})

test('a config folder Pupload cannot write to is refused, naming the user and the folder', { skip: process.getuid() === 0 && 'root can write anywhere' }, () => {
  const locked = join(dir, 'locked')
  mkdirSync(locked, { mode: 0o500 })
  assert.throws(
    () => loadSettings(join(locked, 'settings.json')),
    (err) => err instanceof SettingsError && err.message.includes(`Pupload runs as user ${process.getuid()}, so let it write to ${locked}:`),
  )
})

test('an existing settings file is read and left alone', () => {
  const file = join(dir, 'settings.json')
  writeFileSync(file, '{"port": 9000}')
  assert.deepEqual(loadSettings(file), { settings: { port: 9000, trustedProxies: [], publicUrl: null }, created: false })
  assert.equal(readFileSync(file, 'utf8'), '{"port": 9000}')
})

test('a setting left out uses its default', () => {
  assert.deepEqual(parseSettings('{}', 'settings.json'), { port: 7875, trustedProxies: [], publicUrl: null })
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

test('trusted proxies are stored without ::ffff: and in lower case', () => {
  assert.deepEqual(parseSettings('{"trustedProxies": ["192.0.2.10", "::ffff:198.51.100.4", " 2001:DB8::1 "]}', 'settings.json').trustedProxies, ['192.0.2.10', '198.51.100.4', '2001:db8::1'])
})

test('trusted proxies that are not a list of addresses are refused', () => {
  for (const value of ['"192.0.2.10"', '[7875]', '["192.0.2"]', '["proxy.example.com"]', '["::ffff:"]', 'null']) {
    refuses(`{"trustedProxies": ${value}}`, `"trustedProxies" in settings.json is ${value}. Set it to a list of the addresses of the proxies in front of Pupload, like ["192.0.2.10"].`)
  }
})

test('changing the settings a new file returns does not change the defaults', () => {
  const { settings } = loadSettings(join(dir, 'fresh', 'settings.json'))
  settings.trustedProxies.push('192.0.2.10')
  assert.deepEqual(defaultSettings.trustedProxies, [])
  assert.deepEqual(parseSettings('{}', 'settings.json').trustedProxies, [])
})

test('a public URL is stored as its origin', () => {
  assert.equal(parseSettings('{"publicUrl": null}', 'settings.json').publicUrl, null)
  assert.equal(parseSettings('{"publicUrl": "http://192.0.2.10:7875"}', 'settings.json').publicUrl, 'http://192.0.2.10:7875')
  assert.equal(parseSettings('{"publicUrl": "https://pupload.example.com/"}', 'settings.json').publicUrl, 'https://pupload.example.com')
})

test('a public URL that is not an http or https origin is refused', () => {
  for (const value of ['"pupload.example.com"', '"ftp://pupload.example.com"', '"https://pupload.example.com/photos"', '"https://pupload.example.com/?a=1"', '"https://pupload.example.com/#top"', '"https://alex:pw@pupload.example.com"', '7875']) {
    refuses(`{"publicUrl": ${value}}`, `"publicUrl" in settings.json is ${value}. Set it to the address people open Pupload at, like "https://pupload.example.com", or null.`)
  }
})
