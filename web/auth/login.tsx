import { render } from 'preact'
import { ThemePicker } from '../components/theme-picker.tsx'
import { Wordmark } from '../components/wordmark.tsx'
import { SignInForm } from './login/sign-in-form.tsx'

function SignInPage() {
  return (
    <>
      <div class="corner">
        <ThemePicker />
      </div>
      <main class="auth-card">
        <div class="auth-head">
          <Wordmark />
          <h1>Sign in</h1>
        </div>
        <SignInForm />
      </main>
    </>
  )
}

render(<SignInPage />, document.body)
