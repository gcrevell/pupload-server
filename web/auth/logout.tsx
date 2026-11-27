import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { Alert } from '../components/alert.tsx'
import { Button } from '../components/button.tsx'
import { Wordmark } from '../components/wordmark.tsx'
import { useSignOut } from './logout/use-sign-out.ts'

const redirectSeconds = 5

function RedirectCountdown() {
  const [seconds, setSeconds] = useState(redirectSeconds)

  useEffect(() => {
    const tick = setTimeout(() => {
      if (seconds > 1) setSeconds(seconds - 1)
      else location.replace('/auth/login')
    }, 1000)
    return () => clearTimeout(tick)
  }, [seconds])

  return <p class="auth-message">Taking you to the sign-in page in {seconds} {seconds === 1 ? 'second' : 'seconds'}.</p>
}

function SignOutPage() {
  const { state, signOut } = useSignOut()
  const signedOut = state.status === 'signed-out'

  return (
    <main class="auth-card">
      <div class="auth-head">
        <Wordmark />
        <h1>{signedOut ? 'Signed out' : 'Sign out'}</h1>
      </div>
      <div class="stack">
        <p class="auth-message" role="status" hidden={!signedOut}>{signedOut && "You've signed out of Pupload."}</p>
        {signedOut ? (
          <>
            <RedirectCountdown />
            <Button variant="secondary" block href="/auth/login">Sign in again</Button>
          </>
        ) : (
          <>
            <Alert message={state.status === 'failed' ? state.error : null} />
            <Button variant="primary" block type="button" disabled={state.status === 'signing-out'} onClick={() => void signOut()}>
              {state.status === 'signing-out' ? 'Signing out…' : 'Try again'}
            </Button>
          </>
        )}
      </div>
    </main>
  )
}

render(<SignOutPage />, document.body)
