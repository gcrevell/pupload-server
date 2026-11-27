import { resolve } from 'node:path'

export function configDir(env: NodeJS.ProcessEnv = process.env): string {
  return resolve(env.PUPLOAD_CONFIG_DIR || 'config')
}

export function writableFolderAdvice(dir: string): string {
  const user = process.getuid?.()
  return `Pupload runs as user ${user}, so let it write to ${dir}: in Docker, mount a volume there, or a folder user ${user} owns. Or set PUPLOAD_CONFIG_DIR to a folder it can write to.`
}
