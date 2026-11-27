import type { IncomingMessage, ServerResponse } from 'node:http'

export function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('hello world\n')
    return
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('Not found\n')
}
