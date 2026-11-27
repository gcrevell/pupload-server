import type { TargetedSubmitEvent } from 'preact'
import { useLayoutEffect, useRef } from 'preact/hooks'
import { Alert } from '../../components/alert.tsx'
import { Button } from '../../components/button.tsx'
import { Field } from '../../components/field.tsx'
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
      <Field label="Username" name="username" autocomplete="username" autocapitalize="none" autocorrect={false} spellcheck={false} required disabled={busy} />
      <Field label="Password" name="password" type="password" autocomplete="current-password" required disabled={busy} aria-invalid={error !== null} ref={password} />
      <Alert message={error} />
      <Button variant="primary" block type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
    </form>
  )
}
