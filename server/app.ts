import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http'
import { HttpError } from './api/http-error.ts'
import type { Route } from './api/route.ts'

export interface AppOptions {
  routes: Route[]
}

export function createApp(options: AppOptions): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    respond(options, req, res).catch((err: unknown) => {
      process.stderr.write(`${req.method} ${req.url} failed. ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`)
      if (res.headersSent) res.destroy()
      else sendError(res, pathnameOf(req), 500, 'Something went wrong on the server. Its log has the details.')
    })
  }
}

async function respond(options: AppOptions, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const pathname = pathnameOf(req)
  if (req.method === 'GET' && pathname === '/') return sendText(res, 200, 'hello world\n')

  const routes = options.routes.filter((route) => route.path === pathname)
  const route = routes.find((candidate) => candidate.method === req.method)
  if (route === undefined) {
    if (routes.length === 0) return sendError(res, pathname, 404, `There's nothing at ${pathname}.`)
    const allowed = routes.map((candidate) => candidate.method)
    return sendError(res, pathname, 405, `${pathname} only answers ${allowed.join(' and ')}.`, { Allow: allowed.join(', ') })
  }
  try {
    sendJson(res, 200, await route.handle(req))
  } catch (err) {
    if (err instanceof HttpError) return sendError(res, pathname, err.status, err.message, err.headers)
    throw err
  }
}

function pathnameOf(req: IncomingMessage): string {
  try {
    return new URL(req.url ?? '/', 'http://localhost').pathname
  } catch {
    return req.url ?? '/'
  }
}

function sendError(res: ServerResponse, pathname: string, status: number, message: string, headers: OutgoingHttpHeaders = {}): void {
  if (pathname === '/api' || pathname.startsWith('/api/')) sendJson(res, status, { error: message }, headers)
  else sendText(res, status, `${message}\n`, headers)
}

function sendText(res: ServerResponse, status: number, text: string, headers: OutgoingHttpHeaders = {}): void {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers })
  res.end(text)
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers: OutgoingHttpHeaders = {}): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers })
  res.end(`${JSON.stringify(body)}\n`)
}
