import { render } from 'preact'
import { SignInForm } from './login/sign-in-form.tsx'

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
