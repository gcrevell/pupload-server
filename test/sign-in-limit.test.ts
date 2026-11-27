import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { v1Routes } from '../server/api/v1/routes.ts'
import { defaultSettings } from '../server/settings/default-settings.ts'
import { createAccount, password, signIn } from './helpers/sign-in.ts'
import { startApp, type StartedApp } from './helpers/start-app.ts'

const minute = 60 * 1000

async function withApp(run: (app: StartedApp, clock: { t: number }) => Promise<void>): Promise<void> {
  const clock = { t: 0 }
  const app = await startApp({ routes: v1Routes, now: () => clock.t })
  try {
    await createAccount(app)
    await run(app, clock)
  } finally {
    await app.close()
  }
}

async function failTenTimes(app: StartedApp): Promise<void> {
  for (let i = 0; i < 10; i++) assert.equal((await signIn(app, { password: 'wrong' })).status, 401)
}

function sessionCount(app: StartedApp): number {
  return (app.db.prepare('SELECT COUNT(*) AS n FROM sessions').get() as { n: number }).n
}

test('the eleventh attempt after ten failures gets 429', () => withApp(async (app) => {
  await failTenTimes(app)
  const res = await signIn(app, { password: 'wrong' })
  assert.equal(res.status, 429)
  assert.equal(res.headers.get('retry-after'), '900')
  assert.deepEqual(await res.json(), { error: 'Too many failed sign-ins. Try again in 15 minutes.' })
}))

test('twenty wrong passwords sent together get ten 401s and ten 429s', () => withApp(async (app) => {
  const responses = await Promise.all(Array.from({ length: 20 }, () => signIn(app, { password: 'wrong' })))
  const statuses = responses.map((res) => res.status)
  assert.equal(statuses.filter((status) => status === 401).length, 10)
  assert.equal(statuses.filter((status) => status === 429).length, 10)
}))

test('the right password while paused gets 429 and makes no session', () => withApp(async (app) => {
  await failTenTimes(app)
  assert.equal((await signIn(app)).status, 429)
  assert.equal(sessionCount(app), 0)
}))

test('the pause ends after 15 minutes', () => withApp(async (app, clock) => {
  await failTenTimes(app)
  clock.t = 15 * minute - 1
  const paused = await signIn(app)
  assert.equal(paused.status, 429)
  assert.equal(paused.headers.get('retry-after'), '1')
  clock.t = 15 * minute
  assert.equal((await signIn(app)).status, 201)
  assert.equal(sessionCount(app), 1)
}))

test('a request that is refused with 400 is not counted', () => withApp(async (app) => {
  for (let i = 0; i < 10; i++) assert.equal((await signIn(app, { password: undefined })).status, 400)
  assert.equal((await signIn(app, { password: 'wrong' })).status, 401)
}))

test('unknown usernames are limited too', () => withApp(async (app) => {
  for (let i = 0; i < 10; i++) assert.equal((await signIn(app, { username: 'sam', password })).status, 401)
  assert.equal((await signIn(app, { username: 'sam', password })).status, 429)
}))

test('another username is not paused', () => withApp(async (app) => {
  await failTenTimes(app)
  assert.equal((await signIn(app, { username: 'sam' })).status, 401)
}))

test('nine failures, a success, then nine more are not paused', () => withApp(async (app) => {
  for (let i = 0; i < 9; i++) await signIn(app, { password: 'wrong' })
  assert.equal((await signIn(app)).status, 201)
  for (let i = 0; i < 9; i++) assert.equal((await signIn(app, { password: 'wrong' })).status, 401)
}))

async function failTenTimesFrom(app: StartedApp, forwardedFor: string): Promise<void> {
  for (let i = 0; i < 10; i++) assert.equal((await signIn(app, { password: 'wrong' }, { 'X-Forwarded-For': forwardedFor })).status, 401)
}

test('behind a trusted proxy, each X-Forwarded-For address has its own limit', async () => {
  const app = await startApp({ routes: v1Routes, settings: { ...defaultSettings, trustedProxies: ['127.0.0.1'] } })
  try {
    await createAccount(app)
    await failTenTimesFrom(app, '203.0.113.7')
    assert.equal((await signIn(app, { password: 'wrong' }, { 'X-Forwarded-For': '203.0.113.7' })).status, 429)
    assert.equal((await signIn(app, { password: 'wrong' }, { 'X-Forwarded-For': '198.51.100.4' })).status, 401)
  } finally {
    await app.close()
  }
})

test('without trusted proxies, X-Forwarded-For is ignored and the addresses share one limit', () => withApp(async (app) => {
  await failTenTimesFrom(app, '203.0.113.7')
  assert.equal((await signIn(app, { password: 'wrong' }, { 'X-Forwarded-For': '198.51.100.4' })).status, 429)
}))
