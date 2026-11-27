import { strict as assert } from 'node:assert'
import { after, before, test } from 'node:test'
import { v1Routes } from '../server/api/v1/routes.ts'
import { webDir } from '../server/web-files.ts'
import { startApp, type StartedApp } from './helpers/start-app.ts'

let app: StartedApp

before(async () => {
  app = await startApp({ routes: v1Routes, webDir })
})

after(async () => {
  await app.close()
})

test('GET /auth/login answers the sign-in page', async () => {
  const res = await fetch(`${app.base}/auth/login`)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8')
  assert.match(await res.text(), /<title>Sign in · Pupload<\/title>/)
})

test('every file the sign-in page loads is served', async () => {
  const html = await (await fetch(`${app.base}/auth/login`)).text()
  const links = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(([, link]) => link)
  assert.notEqual(links.length, 0)
  for (const link of links) {
    const res = await fetch(new URL(link, `${app.base}/auth/login`))
    assert.equal(res.status, 200, link)
  }
})

test('without JavaScript the sign-in page says it needs it', async () => {
  const html = await (await fetch(`${app.base}/auth/login`)).text()
  assert.match(html, /<noscript>Signing in to Pupload needs JavaScript\. Turn it on, then reload this page\.<\/noscript>/)
})
