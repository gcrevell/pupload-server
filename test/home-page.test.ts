import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { v1Routes } from '../server/api/v1/routes.ts'
import { sessionLifetime } from '../server/sessions/sessions.ts'
import { createAccount, sessionToken, signIn } from './helpers/sign-in.ts'
import { startApp, type StartedApp } from './helpers/start-app.ts'

const cleared = 'pupload_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'

async function withApp(run: (app: StartedApp, token: string, clock: { t: number }) => Promise<void>): Promise<void> {
  const clock = { t: 0 }
  const app = await startApp({ routes: v1Routes, now: () => clock.t })
  try {
    await createAccount(app)
    await run(app, sessionToken(await signIn(app)), clock)
  } finally {
    await app.close()
  }
}

function home(app: StartedApp, token?: string): Promise<Response> {
  return fetch(`${app.base}/`, { redirect: 'manual', headers: token === undefined ? {} : { Cookie: `pupload_session=${token}` } })
}

function assertSentToSignIn(res: Response, setCookie: string[]): void {
  assert.equal(res.status, 302)
  assert.equal(res.headers.get('location'), '/auth/login')
  assert.deepEqual(res.headers.getSetCookie(), setCookie)
}

test('GET / sends someone who isn\'t signed in to the sign-in page', () => withApp(async (app) => {
  assertSentToSignIn(await home(app), [])
}))

test('GET / says hello world once signed in', () => withApp(async (app, token) => {
  const res = await home(app, token)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8')
  assert.equal(await res.text(), 'hello world\n')
}))

test('GET / clears a cookie for a session that no longer exists, and sends it to sign in', () => withApp(async (app) => {
  assertSentToSignIn(await home(app, 'not-a-session'), [cleared])
}))

test('GET / still counts a session idle for exactly its lifetime as signed in', () => withApp(async (app, token, clock) => {
  clock.t = sessionLifetime
  assert.equal((await home(app, token)).status, 200)
}))

test('GET / ends a session idle for longer than its lifetime, and sends it to sign in', () => withApp(async (app, token, clock) => {
  clock.t = sessionLifetime + 1
  assertSentToSignIn(await home(app, token), [cleared])
  assert.deepEqual(app.db.prepare('SELECT id FROM sessions').all(), [])
}))
