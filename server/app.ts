import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http'
import { v1Routes } from './api/v1/routes.ts'

export function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  respond(req, res).catch((err: unknown) => {
    process.stderr.write(`${req.method} ${req.url} failed. ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`)
    if (res.headersSent) res.destroy()
    else sendJson(res, 500, { error: 'Something went wrong on the server. Its log has the details.' })
  })
}

async function respond(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost')
  if (req.method === 'GET' && pathname === '/') return sendText(res, 200, 'hello world\n')

  const routes = v1Routes.filter((route) => route.path === pathname)
  const route = routes.find((candidate) => candidate.method === req.method)
  if (route !== undefined) return sendJson(res, 200, await route.handle(req))
  if (routes.length > 0) return sendText(res, 405, 'Method not allowed\n', { Allow: routes.map((candidate) => candidate.method).join(', ') })
  sendText(res, 404, 'Not found\n')
}

function sendText(res: ServerResponse, status: number, text: string, headers: OutgoingHttpHeaders = {}): void {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers })
  res.end(text)
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(`${JSON.stringify(body)}\n`)
}
