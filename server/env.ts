export interface Env {
  port: number
}

export class EnvError extends Error {}

const defaultPort = 7875

export function readEnv(env: NodeJS.ProcessEnv = process.env): Env {
  return {
    port: readPort(env.PORT),
  }
}

function readPort(value: string | undefined): number {
  if (value === undefined || value === '') return defaultPort
  const number = Number(value)
  if (!/^\d+$/.test(value) || number < 1 || number > 65535) {
    throw new EnvError(`PORT is "${value}". Set it to a port number from 1 to 65535, or leave it unset to use ${defaultPort}.`)
  }
  return number
}
