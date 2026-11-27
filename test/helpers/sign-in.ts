import { testSetupCode, type StartedApp } from './start-app.ts'

export const password = 'a long passphrase'

export async function createAccount(app: StartedApp, username = 'alex'): Promise<void> {
  const res = await post(app, '/api/v1/setup', { code: testSetupCode, username, password })
  if (res.status !== 201) throw new Error(`Setup answered ${res.status}.`)
}

export function signIn(app: StartedApp, fields: Record<string, unknown> = {}): Promise<Response> {
  return post(app, '/api/v1/sessions', { username: 'alex', password, ...fields })
}

function post(app: StartedApp, path: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(`${app.base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function sessionToken(res: Response): string {
  const token = /^pupload_session=([^;]+)/.exec(res.headers.getSetCookie()[0] ?? '')?.[1]
  if (token === undefined) throw new Error('The response set no session cookie.')
  return token
}
