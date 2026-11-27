import { render, type TargetedSubmitEvent } from 'preact'
import { useLayoutEffect, useRef, useState } from 'preact/hooks'

async function signIn(username: string, password: string): Promise<string | null> {
  try {
    const response = await fetch('/api/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (response.ok) return null
    const body = await response.json().catch(() => ({}))
    return body.error ?? "Pupload couldn't sign you in. Try again."
  } catch {
    return "Couldn't reach Pupload. Check your connection and try again."
  }
}

function SignInForm() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const password = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (error !== null && !busy) password.current?.select()
  }, [error, busy])

  async function submit(event: TargetedSubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    setBusy(true)
    const failure = await signIn(String(form.get('username')), String(form.get('password')))
    if (failure === null) return location.assign('/')
    setError(failure)
    setBusy(false)
  }

  return (
    <form class="stack sign-in-form" method="post" onSubmit={submit}>
      <label class="field">
        <span class="field-label">Username</span>
        <input class="input" name="username" autocomplete="username" autocapitalize="none" autocorrect={false} spellcheck={false} required disabled={busy} />
      </label>
      <label class="field">
        <span class="field-label">Password</span>
        <input class="input" name="password" type="password" autocomplete="current-password" required disabled={busy} aria-invalid={error !== null} ref={password} />
      </label>
      <p class="alert alert--error" role="alert" hidden={error === null}>{error}</p>
      <button class="button button--primary button--block" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}

function SignInPage() {
  return (
    <main class="sign-in">
      <div class="sign-in-head">
        <h1>Sign in</h1>
      </div>
      <SignInForm />
    </main>
  )
}

render(<SignInPage />, document.body)
