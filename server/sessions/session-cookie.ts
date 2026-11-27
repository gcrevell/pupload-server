export const sessionCookieName = 'pupload_session'

export function sessionCookie(token: string): string {
  return `${sessionCookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30 * 24 * 60 * 60}`
}
