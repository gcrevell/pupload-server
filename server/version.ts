export function serverVersion(env: NodeJS.ProcessEnv = process.env): string {
  return env.PUPLOAD_VERSION || 'dev'
}
