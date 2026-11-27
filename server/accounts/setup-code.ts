import { randomBytes, timingSafeEqual } from 'node:crypto'

// The digits and capitals without 0, 1, I and O, which look alike. Exactly 32, so `byte & 31` is unbiased.
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export function newSetupCode(): string {
  const chars = Array.from(randomBytes(12), (byte) => alphabet[byte & 31])
  return [0, 4, 8].map((start) => chars.slice(start, start + 4).join('')).join('-')
}

export function setupCodeMatches(expected: string | undefined, given: string): boolean {
  if (expected === undefined) return false
  const want = Buffer.from(normalize(expected))
  const have = Buffer.from(normalize(given))
  return want.length === have.length && timingSafeEqual(want, have)
}

function normalize(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}
