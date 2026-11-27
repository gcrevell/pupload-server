import { readdirSync } from 'node:fs'
import { extname, join } from 'node:path'

export const webDir = join(import.meta.dirname, 'web')

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

export interface WebFile {
  file: string
  contentType: string
}

export function listWebFiles(dir: string): Map<string, WebFile> {
  const files = new Map<string, WebFile>()
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const extension = extname(entry.name)
    const contentType = contentTypes[extension]
    if (!entry.isFile() || contentType === undefined) {
      const types = new Intl.ListFormat('en').format(Object.keys(contentTypes))
      throw new Error(`Pupload only serves ${types} files from ${dir}, so it can't serve ${entry.name}. Move it out, or add its type to server/web-files.ts.`)
    }
    const path = extension === '.html' ? entry.name.slice(0, -extension.length) : entry.name
    files.set(`/${path}`, { file: join(dir, entry.name), contentType })
  }
  return files
}
