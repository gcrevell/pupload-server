import { HttpError } from './http-error.ts'

export function stringFields<const Name extends string>(body: Record<string, unknown>, names: readonly Name[]): Record<Name, string> {
  const fields = {} as Record<Name, string>
  for (const name of names) {
    const value = body[name]
    if (typeof value !== 'string') throw new HttpError(400, `Send ${listOf(names)}, each as a string.`)
    fields[name] = value
  }
  return fields
}

function listOf(names: readonly string[]): string {
  if (names.length < 2) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
