const form = document.querySelector('.sign-in-form')
const alert = form.querySelector('.alert')
const button = form.querySelector('button[type="submit"]')
const password = form.elements.password

function showError(message) {
  alert.textContent = message ?? ''
  alert.hidden = message === null
  password.setAttribute('aria-invalid', String(message !== null))
}

function setBusy(busy) {
  for (const element of form.elements) element.disabled = busy
  button.textContent = busy ? 'Signing in…' : 'Sign in'
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  showError(null)
  setBusy(true)
  try {
    const response = await fetch('/api/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.elements.username.value, password: password.value }),
    })
    if (response.ok) return location.assign('/')
    const body = await response.json().catch(() => ({}))
    showError(body.error ?? "Pupload couldn't sign you in. Try again.")
  } catch {
    showError("Couldn't reach Pupload. Check your connection and try again.")
  }
  setBusy(false)
  password.select()
})
