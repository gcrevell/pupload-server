import type { IncomingMessage } from 'node:http'

export function isCrossSite(req: IncomingMessage): boolean {
  if (req.method === 'GET' || req.method === 'HEAD') return false

  const fetchSite = req.headers['sec-fetch-site']
  if (fetchSite !== undefined) return fetchSite !== 'same-origin' && fetchSite !== 'none'

  const origin = req.headers.origin
  if (origin === undefined) return false
  const host = req.headers.host?.toLowerCase()
  return host === undefined || originHost(origin) !== host
}

function originHost(origin: string): string | undefined {
  try {
    return new URL(origin).host
  } catch {
    return undefined
  }
}
