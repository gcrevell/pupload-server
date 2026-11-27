export function messageOf(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  return /[.!?]$/.test(message) ? message : `${message}.`
}
