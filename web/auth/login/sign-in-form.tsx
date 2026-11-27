import type { TargetedSubmitEvent } from 'preact'
import { useLayoutEffect, useRef } from 'preact/hooks'
import { useSignIn } from './use-sign-in.ts'

export function SignInForm() {
  const { busy, error, signIn } = useSignIn()
  const password = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (error !== null && !busy) password.current?.select()
  }, [error, busy])

  function submit(event: TargetedSubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void signIn(String(form.get('username')), String(form.get('password')))
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
