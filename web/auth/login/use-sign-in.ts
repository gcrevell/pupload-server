import { useState } from 'preact/hooks'

async function createSession(username: string, password: string): Promise<string | null> {
  try {
    const response = await fetch('/api/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (response.ok) return null
    const body = await response.json().catch(() => ({})) as { error?: string }
    return body.error ?? "Pupload couldn't sign you in. Try again."
  } catch {
    return "Couldn't reach Pupload. Check your connection and try again."
  }
}

export function useSignIn() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signIn(username: string, password: string) {
    setError(null)
    setBusy(true)
    const failure = await createSession(username, password)
    if (failure === null) return location.assign('/')
    setError(failure)
    setBusy(false)
  }

  return { busy, error, signIn }
}
