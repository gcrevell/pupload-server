import { argon2, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const argon2Async = promisify(argon2)

const memory = 19456
const passes = 2
const parallelism = 1
const tagLength = 32

const storedFormat = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/
// Keeps a corrupted or hostile stored string from asking for gigabytes or minutes of work.
const maxMemory = 1024 * 1024
const maxPasses = 16
const maxParallelism = 16

export async function hashPassword(password: string): Promise<string> {
  const nonce = randomBytes(16)
  const hash = await argon2Async('argon2id', { message: password.normalize('NFC'), nonce, parallelism, tagLength, memory, passes })
  return `$argon2id$v=19$m=${memory},t=${passes},p=${parallelism}$${base64(nonce)}$${base64(hash)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const match = storedFormat.exec(stored)
  if (match === null) return false
  const [m, t, p] = [Number(match[1]), Number(match[2]), Number(match[3])]
  if (m > maxMemory || t > maxPasses || p > maxParallelism) return false
  const nonce = Buffer.from(match[4], 'base64')
  const expected = Buffer.from(match[5], 'base64')
  try {
    const actual = await argon2Async('argon2id', { message: password.normalize('NFC'), nonce, parallelism: p, tagLength: expected.length, memory: m, passes: t })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

function base64(bytes: Buffer): string {
  return bytes.toString('base64').replace(/=+$/, '')
}
