import type { IncomingMessage } from 'node:http'
import { HttpError } from './http-error.ts'

const maxBodyBytes = 64 * 1024

export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (mediaType(req) !== 'application/json') throw new HttpError(415, 'Send the body as JSON, with Content-Type: application/json.')
  if (Number(req.headers['content-length']) > maxBodyBytes) throw tooLarge()

  const body = await readBody(req)
  let parsed: unknown
  try {
    parsed = JSON.parse(body.toString('utf8'))
  } catch {
    throw new HttpError(400, "The body isn't valid JSON.")
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new HttpError(400, 'The body should be a JSON object.')
  return Object.fromEntries(Object.entries(parsed))
}

function mediaType(req: IncomingMessage): string {
  const [type = ''] = (req.headers['content-type'] ?? '').split(';')
  return type.trim().toLowerCase()
}

function tooLarge(): HttpError {
  return new HttpError(413, 'The body is over 64 KiB.', { Connection: 'close' })
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0

    function stopReading(): void {
      req.off('data', onData)
      req.off('end', onEnd)
      req.off('close', onClose)
      req.pause()
    }
    function onData(chunk: Buffer): void {
      size += chunk.length
      if (size > maxBodyBytes) {
        stopReading()
        reject(tooLarge())
      } else chunks.push(chunk)
    }
    function onEnd(): void {
      stopReading()
      resolve(Buffer.concat(chunks))
    }
    function onClose(): void {
      stopReading()
      reject(new Error('The client closed the connection before it finished sending the body.'))
    }

    req.on('data', onData)
    req.on('end', onEnd)
    req.on('close', onClose)
    req.on('error', reject)
  })
}
