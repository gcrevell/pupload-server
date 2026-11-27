export function clientAddress(peer: string | undefined): string {
  return (peer ?? '').replace(/^::ffff:/, '')
}
