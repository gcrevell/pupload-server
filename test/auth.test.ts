import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { v1Routes } from '../server/api/v1/routes.ts'
import { createSession } from '../server/sessions/sessions.ts'
import { createAccount, sessionToken, signIn } from './helpers/sign-in.ts'
import { startApp, type StartedApp } from './helpers/start-app.ts'

const cleared = 'pupload_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'

async function withApp(run: (app: StartedApp, token: string, user: unknown) => Promise<void>): Promise<void> {
  const app = await startApp({
    routes: [
      ...v1Routes,
      { method: 'GET', path: '/api/test/locked', handle: () => ({ body: { ok: true } }) },
      { method: 'GET', path: '/api/test/admin', auth: 'admin', handle: () => ({ body: { ok: true } }) },
    ],
  })
  try {
    await createAccount(app)
    const res = await signIn(app)
    const token = sessionToken(res)
    const { user } = await res.json() as { user: unknown }
    await run(app, token, user)
  } finally {
    await app.close()
  }
}

function get(app: StartedApp, path: string, cookie?: string): Promise<Response> {
  return fetch(`${app.base}${path}`, { headers: cookie === undefined ? {} : { Cookie: cookie } })
}

test('/me without a cookie gets 401, and nothing to clear', () => withApp(async (app) => {
  const res = await get(app, '/api/v1/me')
  assert.equal(res.status, 401)
  assert.deepEqual(await res.json(), { error: 'Sign in first.' })
  assert.deepEqual(res.headers.getSetCookie(), [])
}))

test('/me with a made-up session cookie gets 401 and clears it', () => withApp(async (app) => {
  const res = await get(app, '/api/v1/me', `pupload_session=${'x'.repeat(43)}`)
  assert.equal(res.status, 401)
  assert.deepEqual(await res.json(), { error: 'Sign in first.' })
  assert.deepEqual(res.headers.getSetCookie(), [cleared])
}))

test('/me with only other cookies gets 401, and nothing to clear', () => withApp(async (app) => {
  const res = await get(app, '/api/v1/me', 'a=1; b=2')
  assert.equal(res.status, 401)
  assert.deepEqual(res.headers.getSetCookie(), [])
}))

test('/me with a real cookie gets the user, with other cookies around it too', () => withApp(async (app, token, user) => {
  for (const cookie of [`pupload_session=${token}`, `a=1; pupload_session=${token}; b=2`]) {
    const res = await get(app, '/api/v1/me', cookie)
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { user })
  }
}))

test('with two session cookies, the first one wins', () => withApp(async (app, token) => {
  assert.equal((await get(app, '/api/v1/me', `pupload_session=${token}; pupload_session=fake`)).status, 200)
  assert.equal((await get(app, '/api/v1/me', `pupload_session=fake; pupload_session=${token}`)).status, 401)
}))

test('a route without auth is locked', () => withApp(async (app, token) => {
  assert.equal((await get(app, '/api/test/locked')).status, 401)
  assert.equal((await get(app, '/api/test/locked', `pupload_session=${token}`)).status, 200)
}))

test('an admin route gets 403 for a non-admin and 200 for an admin', () => withApp(async (app, token) => {
  app.db.prepare(`INSERT INTO users (username, is_admin, created_at) VALUES ('sam', 0, 0)`).run()
  const { id } = app.db.prepare(`SELECT id FROM users WHERE username = 'sam'`).get() as { id: number }
  const samToken = createSession(app.db, id, Date.now())

  const refused = await get(app, '/api/test/admin', `pupload_session=${samToken}`)
  assert.equal(refused.status, 403)
  assert.deepEqual(await refused.json(), { error: 'Only an admin can do that.' })
  assert.equal((await get(app, '/api/test/admin', `pupload_session=${token}`)).status, 200)
}))

test('info answers without a cookie', () => withApp(async (app) => {
  assert.equal((await get(app, '/api/v1/info')).status, 200)
}))

test('an unknown path is still 404 and a wrong method still 405, without a cookie', () => withApp(async (app) => {
  assert.equal((await get(app, '/api/v1/nope')).status, 404)
  const res = await fetch(`${app.base}/api/v1/me`, { method: 'POST' })
  assert.equal(res.status, 405)
  assert.equal(res.headers.get('allow'), 'GET')
}))
