import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { clientAddress } from '../server/api/client-address.ts'
import { v1Routes } from '../server/api/v1/routes.ts'
import { serverVersion } from '../server/version.ts'
import { startApp, type StartedApp } from './helpers/start-app.ts'

let app: StartedApp
let base: string

before(async () => {
  app = await startApp({
    routes: [
      ...v1Routes,
      { method: 'GET', path: '/api/test/ping', handle: () => ({ body: { pong: true } }) },
      { method: 'GET', path: '/api/test/ip', handle: (request) => ({ body: { ip: request.ip } }) },
    ],
  })
  base = app.base
})

after(async () => {
  await app.close()
})

test('GET / says hello world', async () => {
  const res = await fetch(`${base}/`)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8')
  assert.equal(await res.text(), 'hello world\n')
})

test('an unknown path is a 404', async () => {
  const res = await fetch(`${base}/nope`)
  assert.equal(res.status, 404)
})

test('GET /api/v1/info returns the server version, and that setup is needed', async () => {
  const res = await fetch(`${base}/api/v1/info`)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.deepEqual(await res.json(), { version: serverVersion(), setupNeeded: true })
})

test('GET /api/v1/info says setup is not needed once there is an account', async () => {
  const withAccount = await startApp({ routes: v1Routes })
  try {
    withAccount.db.prepare(`INSERT INTO users (username, created_at) VALUES ('alex', 0)`).run()
    const res = await fetch(`${withAccount.base}/api/v1/info`)
    assert.deepEqual(await res.json(), { version: serverVersion(), setupNeeded: false })
  } finally {
    await withAccount.close()
  }
})

test('another method on /api/v1/info is a 405', async () => {
  const res = await fetch(`${base}/api/v1/info`, { method: 'POST' })
  assert.equal(res.status, 405)
  assert.equal(res.headers.get('allow'), 'GET')
})

test('a route passed to createApp answers', async () => {
  const res = await fetch(`${base}/api/test/ping`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { pong: true })
})

test('request.ip is the address the request came from', async () => {
  const res = await fetch(`${base}/api/test/ip`)
  assert.deepEqual(await res.json(), { ip: '127.0.0.1' })
})

test('clientAddress drops the IPv4-mapped prefix, and nothing else', () => {
  assert.equal(clientAddress('::ffff:192.0.2.10'), '192.0.2.10')
  assert.equal(clientAddress('::1'), '::1')
  assert.equal(clientAddress('2001:db8::1'), '2001:db8::1')
  assert.equal(clientAddress(undefined), '')
})
