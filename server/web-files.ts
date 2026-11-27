import { readdirSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'

export const webDir = join(import.meta.dirname, '..', 'dist', 'web')

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
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    const file = join(entry.parentPath, entry.name)
    const name = relative(dir, file).split(sep).join('/')
    if (entry.isDirectory() || name.split('/').some((part) => part.startsWith('.'))) continue
    const extension = extname(name)
    const contentType = contentTypes[extension]
    if (!entry.isFile() || contentType === undefined) {
      const types = new Intl.ListFormat('en').format(Object.keys(contentTypes))
      throw new Error(`Pupload only serves ${types} files from ${dir}, so it can't serve ${name}. Move it out, or add its type to server/web-files.ts.`)
    }
    const path = extension === '.html' ? name.slice(0, -extension.length) : name
    files.set(`/${path}`, { file, contentType })
  }
  return files
}
