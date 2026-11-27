import { HttpError } from '../api/http-error.ts'

export function checkUsername(username: string): void {
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(username)) {
    throw new HttpError(400, 'A username is 1 to 64 letters, digits, dots, underscores or hyphens.')
  }
}

export function checkPassword(password: string): void {
  if ([...password.normalize('NFC')].length < 12) throw new HttpError(400, 'A password needs at least 12 characters.')
}
