import { strict as assert } from 'node:assert'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { v1Routes } from '../server/api/v1/routes.ts'
import { listWebFiles } from '../server/web-files.ts'
import { startApp, type StartedApp } from './helpers/start-app.ts'

const dir = mkdtempSync(join(tmpdir(), 'pupload-web-'))
const webDir = join(dir, 'web')
mkdirSync(webDir)
writeFileSync(join(webDir, 'page.html'), '<!doctype html><title>Page</title>\n')
writeFileSync(join(webDir, 'style.css'), 'body { margin: 0; }\n')
writeFileSync(join(webDir, 'script.js'), 'export {}\n')
writeFileSync(join(webDir, '.DS_Store'), '')
writeFileSync(join(dir, 'secret.txt'), 'not for the web\n')

let app: StartedApp

before(async () => {
  app = await startApp({ routes: v1Routes, webDir })
})

after(async () => {
  await app.close()
  rmSync(dir, { recursive: true, force: true })
})

test('an HTML file is served at its name without .html', async () => {
  const res = await fetch(`${app.base}/page`)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8')
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(res.headers.get('content-security-policy'), "frame-ancestors 'none'")
  assert.equal(await res.text(), '<!doctype html><title>Page</title>\n')
})

test('CSS and JavaScript are served at their file names, with their types', async () => {
  const css = await fetch(`${app.base}/style.css`)
  assert.equal(css.headers.get('content-type'), 'text/css; charset=utf-8')
  assert.equal(await css.text(), 'body { margin: 0; }\n')
  const js = await fetch(`${app.base}/script.js`)
  assert.equal(js.headers.get('content-type'), 'text/javascript; charset=utf-8')
})

test('a file changed after Pupload starts is served as it is now', async () => {
  writeFileSync(join(webDir, 'style.css'), 'body { margin: 8px; }\n')
  const res = await fetch(`${app.base}/style.css`)
  assert.equal(await res.text(), 'body { margin: 8px; }\n')
})

test('HEAD answers with the headers and no body', async () => {
  const res = await fetch(`${app.base}/script.js`, { method: 'HEAD' })
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-length'), '10')
  assert.equal(await res.text(), '')
})

test('another method on a web file is a 405', async () => {
  const res = await fetch(`${app.base}/page`, { method: 'POST' })
  assert.equal(res.status, 405)
  assert.equal(res.headers.get('allow'), 'GET, HEAD')
  assert.equal(await res.text(), '/page only answers GET and HEAD.\n')
})

test('only the files in the folder are served, and only at their own paths', async () => {
  for (const path of ['/page.html', '/.DS_Store', '/secret.txt', '/..%2fsecret.txt', '/%2e%2e/secret.txt', '/web/page']) {
    const res = await fetch(`${app.base}${path}`)
    assert.equal(res.status, 404, path)
    assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8', path)
  }
})

test('a file of a type Pupload does not know stops it starting, and says which', () => {
  const other = join(dir, 'other')
  mkdirSync(other)
  writeFileSync(join(other, 'photo.png'), '')
  assert.throws(() => listWebFiles(other), { message: `Pupload only serves .html, .css, and .js files from ${other}, so it can't serve photo.png. Move it out, or add its type to server/web-files.ts.` })
})
