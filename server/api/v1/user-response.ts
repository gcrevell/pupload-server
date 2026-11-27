export interface UserRow {
  id: number
  username: string
  is_admin: number
  created_at: number
}

export interface UserResponse {
  id: number
  username: string
  isAdmin: boolean
  createdAt: string
}

export function userResponse(row: UserRow): UserResponse {
  return {
    id: row.id,
    username: row.username,
    isAdmin: row.is_admin === 1,
    createdAt: new Date(row.created_at).toISOString(),
  }
}
