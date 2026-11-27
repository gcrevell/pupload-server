import { useEffect, useState } from 'preact/hooks'

export type SignOutState = { status: 'signing-out' } | { status: 'signed-out' } | { status: 'failed', error: string }

async function deleteSession(): Promise<string | null> {
  try {
    const response = await fetch('/api/v1/sessions/current', { method: 'DELETE' })
    const alreadySignedOut = response.status === 401
    if (response.ok || alreadySignedOut) return null
    const body = await response.json().catch(() => ({}))
    return body.error ?? "Pupload couldn't sign you out. Try again."
  } catch {
    return "Couldn't reach Pupload. Check your connection and try again."
  }
}

export function useSignOut() {
  const [state, setState] = useState<SignOutState>({ status: 'signing-out' })

  async function signOut() {
    setState({ status: 'signing-out' })
    const error = await deleteSession()
    setState(error === null ? { status: 'signed-out' } : { status: 'failed', error })
  }

  useEffect(() => {
    void signOut()
  }, [])

  return { state, signOut }
}
