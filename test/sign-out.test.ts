import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { v1Routes } from '../server/api/v1/routes.ts'
import { createAccount, sessionToken, signIn } from './helpers/sign-in.ts'
import { startApp, type StartedApp } from './helpers/start-app.ts'

const cleared = 'pupload_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'

async function withApp(run: (app: StartedApp, token: string) => Promise<void>): Promise<void> {
  const app = await startApp({ routes: v1Routes })
  try {
    await createAccount(app)
    await run(app, sessionToken(await signIn(app)))
  } finally {
    await app.close()
  }
}

function signOut(app: StartedApp, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`${app.base}/api/v1/sessions/current`, { method: 'DELETE', headers })
}

function me(app: StartedApp, token: string): Promise<Response> {
  return fetch(`${app.base}/api/v1/me`, { headers: { Cookie: `pupload_session=${token}` } })
}

function sessionCount(app: StartedApp): number {
  return (app.db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n
}

test('signing out answers 204, clears the cookie, and ends the session', () => withApp(async (app, token) => {
  const res = await signOut(app, { Cookie: `pupload_session=${token}` })
  assert.equal(res.status, 204)
  assert.deepEqual(res.headers.getSetCookie(), [cleared])
  assert.equal(await res.text(), '')
  assert.equal((await me(app, token)).status, 401)
  assert.equal(sessionCount(app), 0)
}))

test("signing out leaves the account's other sessions alone", () => withApp(async (app, token) => {
  const other = sessionToken(await signIn(app))
  assert.equal((await signOut(app, { Cookie: `pupload_session=${token}` })).status, 204)
  assert.equal((await me(app, other)).status, 200)
  assert.equal(sessionCount(app), 1)
}))

test('a cross-site sign-out gets 403 and leaves the session working', () => withApp(async (app, token) => {
  const res = await signOut(app, { Cookie: `pupload_session=${token}`, 'Sec-Fetch-Site': 'cross-site' })
  assert.equal(res.status, 403)
  assert.equal((await me(app, token)).status, 200)
  assert.equal(sessionCount(app), 1)
}))

test('signing out without a cookie gets 401', () => withApp(async (app) => {
  const res = await signOut(app)
  assert.equal(res.status, 401)
  assert.deepEqual(await res.json(), { error: 'Sign in first.' })
  assert.equal(sessionCount(app), 1)
}))
