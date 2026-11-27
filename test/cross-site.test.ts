import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { startApp, type StartedApp } from './helpers/start-app.ts'

let app: StartedApp

before(async () => {
  app = await startApp({
    routes: [
      { method: 'POST', path: '/api/test/echo', auth: 'public', handle: async (request) => ({ body: await request.json() }) },
      { method: 'GET', path: '/api/test/ping', auth: 'public', handle: () => ({ body: { pong: true } }) },
    ],
  })
})

after(async () => {
  await app.close()
})

function post(path: string, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`${app.base}${path}`, {
    method: 'POST',
    body: '{ "a": 1 }',
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

async function assertRefused(res: Response): Promise<void> {
  assert.equal(res.status, 403)
  assert.deepEqual(await res.json(), { error: 'Pupload only accepts this from its own pages.' })
}

for (const site of ['same-origin', 'none']) {
  test(`a POST with Sec-Fetch-Site ${site} goes through`, async () => {
    const res = await post('/api/test/echo', { 'Sec-Fetch-Site': site })
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { a: 1 })
  })
}

for (const site of ['same-site', 'cross-site']) {
  test(`a POST with Sec-Fetch-Site ${site} gets a 403`, async () => {
    await assertRefused(await post('/api/test/echo', { 'Sec-Fetch-Site': site }))
  })
}

test('Sec-Fetch-Site decides when it is present, whatever Origin says', async () => {
  const res = await post('/api/test/echo', { 'Sec-Fetch-Site': 'same-origin', Origin: 'https://evil.example' })
  assert.equal(res.status, 200)
})

test('a POST whose Origin is the server itself goes through', async () => {
  const res = await post('/api/test/echo', { Origin: app.base })
  assert.equal(res.status, 200)
})

test('a POST from another origin gets a 403', async () => {
  await assertRefused(await post('/api/test/echo', { Origin: 'https://evil.example' }))
})

test('a POST with Origin null gets a 403', async () => {
  await assertRefused(await post('/api/test/echo', { Origin: 'null' }))
})

test('a POST with an Origin that is not a URL gets a 403', async () => {
  await assertRefused(await post('/api/test/echo', { Origin: 'not a url' }))
})

test('a POST with neither header goes through', async () => {
  const res = await post('/api/test/echo')
  assert.equal(res.status, 200)
})

test('a cross-site GET goes through', async () => {
  const res = await fetch(`${app.base}/api/test/ping`, { headers: { 'Sec-Fetch-Site': 'cross-site', Origin: 'https://evil.example' } })
  assert.equal(res.status, 200)
})

test('a cross-site POST to an unknown path gets a 403, not a 404', async () => {
  await assertRefused(await post('/api/nope', { 'Sec-Fetch-Site': 'cross-site' }))
})
