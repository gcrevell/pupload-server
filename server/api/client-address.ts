import { isIP } from 'node:net'

export function normalizeAddress(address: string): string {
  return address.trim().replace(/^::ffff:/i, '').toLowerCase()
}

export function clientAddress(peer: string | undefined, forwardedFor: string | undefined, trusted: readonly string[]): string {
  const from = normalizeAddress(peer ?? '')
  if (from === '' || !trusted.includes(from)) return from

  const hops = (forwardedFor ?? '').split(',').map(normalizeAddress)
  const client = hops.findLast((hop) => !trusted.includes(hop))
  if (client === undefined) return hops[0] as string
  return isIP(client) === 0 ? from : client
}
