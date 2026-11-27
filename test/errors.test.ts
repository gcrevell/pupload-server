import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { HttpError } from '../server/api/http-error.ts'
import { v1Routes } from '../server/api/v1/routes.ts'
import { startApp, type StartedApp } from './helpers/start-app.ts'

let app: StartedApp

before(async () => {
  app = await startApp({
    routes: [
      ...v1Routes,
      {
        method: 'POST',
        path: '/api/test/conflict',
        handle: () => {
          throw new HttpError(409, 'Already done.')
        },
      },
    ],
  })
})

after(async () => {
  await app.close()
})

test('an HttpError thrown by a route answers with its status as JSON', async () => {
  const res = await fetch(`${app.base}/api/test/conflict`, { method: 'POST' })
  assert.equal(res.status, 409)
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.deepEqual(await res.json(), { error: 'Already done.' })
})

test('an unknown path under /api is a JSON 404', async () => {
  const res = await fetch(`${app.base}/api/nope`)
  assert.equal(res.status, 404)
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.deepEqual(await res.json(), { error: "There's nothing at /api/nope." })
})

test('another method on an API path is a JSON 405 with Allow', async () => {
  const res = await fetch(`${app.base}/api/v1/info`, { method: 'POST' })
  assert.equal(res.status, 405)
  assert.equal(res.headers.get('allow'), 'GET')
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.deepEqual(await res.json(), { error: '/api/v1/info only answers GET.' })
})

test('an unknown path outside /api is a plain text 404', async () => {
  const res = await fetch(`${app.base}/nope`)
  assert.equal(res.status, 404)
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8')
  assert.equal(await res.text(), "There's nothing at /nope.\n")
})
