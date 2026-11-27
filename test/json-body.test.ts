import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { startApp, type StartedApp } from './helpers/start-app.ts'

const limit = 64 * 1024

let app: StartedApp

before(async () => {
  app = await startApp({
    routes: [{ method: 'POST', path: '/api/test/echo', auth: 'public', handle: async (request) => ({ body: await request.json() }) }],
  })
})

after(async () => {
  await app.close()
})

function post(body: BodyInit, headers: Record<string, string> = { 'Content-Type': 'application/json' }): Promise<Response> {
  const init: RequestInit & { duplex?: 'half' } = { method: 'POST', body, headers }
  if (typeof body !== 'string') init.duplex = 'half'
  return fetch(`${app.base}/api/test/echo`, init)
}

function jsonOfBytes(length: number): string {
  const wrapper = '{"a":""}'
  return `{"a":"${'x'.repeat(length - wrapper.length)}"}`
}

function streamOf(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text)
  const chunkSize = 16 * 1024
  return new ReadableStream({
    start(controller) {
      for (let at = 0; at < bytes.length; at += chunkSize) controller.enqueue(bytes.slice(at, at + chunkSize))
      controller.close()
    },
  })
}

async function assertError(res: Response, status: number, message: string): Promise<void> {
  assert.equal(res.status, status)
  assert.deepEqual(await res.json(), { error: message })
}

test('a JSON object body is read', async () => {
  const res = await post('{ "a": 1 }')
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { a: 1 })
})

test('a charset parameter on the content type is allowed', async () => {
  const res = await post('{ "a": 1 }', { 'Content-Type': 'Application/JSON; charset=utf-8' })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { a: 1 })
})

test("fetch's default text/plain content type gets a 415", async () => {
  await assertError(await post('{ "a": 1 }', {}), 415, 'Send the body as JSON, with Content-Type: application/json.')
})

test('a body with no content type gets a 415', async () => {
  const res = await post(new Uint8Array(Buffer.from('{ "a": 1 }')), {})
  await assertError(res, 415, 'Send the body as JSON, with Content-Type: application/json.')
})

test('a body of exactly 64 KiB is read', async () => {
  const text = jsonOfBytes(limit)
  assert.equal(Buffer.byteLength(text), limit)
  const res = await post(text)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), JSON.parse(text))
})

test('a body one byte over 64 KiB gets a 413', async () => {
  const res = await post(jsonOfBytes(limit + 1))
  assert.equal(res.headers.get('connection'), 'close')
  await assertError(res, 413, 'The body is over 64 KiB.')
})

test('a streamed body of exactly 64 KiB is read', async () => {
  const res = await post(streamOf(jsonOfBytes(limit)))
  assert.equal(res.status, 200)
})

test('a streamed body one byte over 64 KiB gets a 413', async () => {
  const res = await post(streamOf(jsonOfBytes(limit + 1)))
  assert.equal(res.headers.get('connection'), 'close')
  await assertError(res, 413, 'The body is over 64 KiB.')
})

test('a body that is not JSON gets a 400', async () => {
  await assertError(await post('{bad'), 400, "The body isn't valid JSON.")
})

test('an empty body gets a 400', async () => {
  await assertError(await post(''), 400, "The body isn't valid JSON.")
})

test('JSON that is not an object gets a 400', async () => {
  for (const text of ['null', '[]', '"x"', '1']) {
    await assertError(await post(text), 400, 'The body should be a JSON object.')
  }
})
