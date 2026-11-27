import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { isIP } from 'node:net'
import { dirname, join } from 'node:path'
import { normalizeAddress } from '../api/client-address.ts'
import { configDir, writableFolderAdvice } from '../config-dir.ts'
import { messageOf } from '../message-of.ts'
import { defaultSettings } from './default-settings.ts'
import { SettingsError } from './settings-error.ts'
import type { Settings } from './settings.ts'

export function settingsFile(env: NodeJS.ProcessEnv = process.env): string {
  return join(configDir(env), 'settings.json')
}

export function loadSettings(file: string): { settings: Settings; created: boolean } {
  let text: string
  try {
    text = readFileSync(file, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw new SettingsError(`Couldn't read ${file}. ${messageOf(err)}`)
    writeDefaults(file)
    return { settings: structuredClone(defaultSettings), created: true }
  }
  return { settings: parseSettings(text, file), created: false }
}

function writeDefaults(file: string): void {
  try {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, `${JSON.stringify(defaultSettings, null, 2)}\n`, { flag: 'wx' })
  } catch (err) {
    throw new SettingsError(`Couldn't write the default settings to ${file}. ${messageOf(err)} ${writableFolderAdvice(dirname(file))}`)
  }
}

export function parseSettings(text: string, file: string): Settings {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (err) {
    throw new SettingsError(`${file} isn't valid JSON. ${messageOf(err)} Fix it, or delete it to start again from the defaults.`)
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SettingsError(`${file} should hold a JSON object, like ${JSON.stringify(defaultSettings)}.`)
  }

  const known = Object.keys(defaultSettings)
  for (const key of Object.keys(raw)) {
    if (!known.includes(key)) throw new SettingsError(`${file} has a setting called "${key}", which Pupload doesn't have. Remove it or fix its name. The settings are: ${known.join(', ')}.`)
  }

  const { port = defaultSettings.port, trustedProxies = defaultSettings.trustedProxies } = raw as Record<string, unknown>
  if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new SettingsError(`"port" in ${file} is ${JSON.stringify(port)}. Set it to a port number from 1 to 65535.`)
  }
  if (!Array.isArray(trustedProxies) || !trustedProxies.every((entry) => typeof entry === 'string' && isIP(normalizeAddress(entry)) !== 0)) {
    throw new SettingsError(`"trustedProxies" in ${file} is ${JSON.stringify(trustedProxies)}. Set it to a list of the addresses of the proxies in front of Pupload, like ["192.0.2.10"].`)
  }
  return { port, trustedProxies: trustedProxies.map((entry: string) => normalizeAddress(entry)) }
}
