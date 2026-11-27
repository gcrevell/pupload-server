import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http'
import type { DatabaseSync } from 'node:sqlite'
import type { ApiRequest } from './api/api-request.ts'
import type { ApiResponse } from './api/api-response.ts'
import type { AppContext } from './api/app-context.ts'
import { clientAddress } from './api/client-address.ts'
import { isCrossSite } from './api/cross-site.ts'
import { HttpError } from './api/http-error.ts'
import { readJson } from './api/read-json.ts'
import type { Route } from './api/route.ts'
import { defaultSettings } from './settings/default-settings.ts'
import type { Settings } from './settings/settings.ts'
import { authenticate } from './sessions/authenticate.ts'
import { createSignInLimiter } from './sessions/sign-in-limiter.ts'

export interface AppOptions {
  routes: Route[]
  db: DatabaseSync
  setupCode?: string
  now?: () => number
  settings?: Settings
}

export function createApp(options: AppOptions): (req: IncomingMessage, res: ServerResponse) => void {
  const { db, setupCode, now = Date.now, settings = defaultSettings } = options
  const context: AppContext = { db, setupCode, now, settings, signInLimiter: createSignInLimiter(now) }
  return (req, res) => {
    respond(options.routes, context, req, res).catch((err: unknown) => {
      process.stderr.write(`${req.method} ${req.url} failed. ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`)
      if (res.headersSent) res.destroy()
      else sendError(res, pathnameOf(req), 500, 'Something went wrong on the server. Its log has the details.')
    })
  }
}

async function respond(allRoutes: Route[], context: AppContext, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const pathname = pathnameOf(req)
  if (req.method === 'GET' && pathname === '/') return sendText(res, 200, 'hello world\n')
  if (isCrossSite(req)) return sendError(res, pathname, 403, 'Pupload only accepts this from its own pages.')

  const routes = allRoutes.filter((route) => route.path === pathname)
  const route = routes.find((candidate) => candidate.method === req.method)
  if (route === undefined) {
    if (routes.length === 0) return sendError(res, pathname, 404, `There's nothing at ${pathname}.`)
    const allowed = routes.map((candidate) => candidate.method)
    return sendError(res, pathname, 405, `${pathname} only answers ${allowed.join(' and ')}.`, { Allow: allowed.join(', ') })
  }
  try {
    const request = apiRequest(req, context)
    const refreshedCookie = authenticate(route, request, context)
    sendResponse(res, withCookie(await route.handle(request, context), refreshedCookie))
  } catch (err) {
    if (err instanceof HttpError) return sendError(res, pathname, err.status, err.message, err.headers)
    throw err
  }
}

function withCookie(response: ApiResponse, cookie: string | undefined): ApiResponse {
  if (cookie === undefined || Object.keys(response.headers ?? {}).some((name) => name.toLowerCase() === 'set-cookie')) return response
  return { ...response, headers: { ...response.headers, 'Set-Cookie': cookie } }
}

function apiRequest(req: IncomingMessage, { settings }: AppContext): ApiRequest {
  let body: Promise<Record<string, unknown>> | undefined
  return {
    req,
    url: new URL(req.url ?? '/', 'http://localhost'),
    ip: clientAddress(req.socket.remoteAddress, req.headers['x-forwarded-for']?.toString(), settings.trustedProxies),
    json: () => (body ??= readJson(req)),
    user: undefined,
    sessionId: undefined,
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

function sendResponse(res: ServerResponse, { status = 200, headers = {}, body }: ApiResponse): void {
  if (body === undefined) {
    res.writeHead(status, headers)
    res.end()
  } else sendJson(res, status, body, headers)
}

function sendText(res: ServerResponse, status: number, text: string, headers: OutgoingHttpHeaders = {}): void {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers })
  res.end(text)
}

function sendJson(res: ServerResponse, status: number, body: unknown, headers: OutgoingHttpHeaders = {}): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers })
  res.end(`${JSON.stringify(body)}\n`)
}
