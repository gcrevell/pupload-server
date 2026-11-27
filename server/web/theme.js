const storageKey = 'pupload-theme'
const root = document.documentElement
const currentTheme = () => root.dataset.theme ?? 'auto'

function applyTheme(theme) {
  const explicit = theme === 'light' || theme === 'dark'
  if (explicit) root.dataset.theme = theme
  else delete root.dataset.theme
  try {
    if (explicit) localStorage.setItem(storageKey, theme)
    else localStorage.removeItem(storageKey)
  } catch {}
}

for (const picker of document.querySelectorAll('.theme-picker')) {
  const trigger = picker.querySelector('.theme-picker-trigger')
  const panel = picker.querySelector('.theme-picker-options')
  const options = [...picker.querySelectorAll('.theme-picker-option')]
  const isOpen = () => picker.hasAttribute('data-open')
  const currentOption = () => options.find((option) => option.value === currentTheme())
  let closeTimer

  function showCurrent() {
    for (const option of options) option.setAttribute('aria-pressed', String(option === currentOption()))
    trigger.setAttribute('aria-label', `Theme: ${currentOption().title}`)
  }

  function setOpen(open, { returnFocus = false } = {}) {
    clearTimeout(closeTimer)
    picker.toggleAttribute('data-open', open)
    trigger.setAttribute('aria-expanded', String(open))
    panel.inert = !open
    if (open) currentOption().focus()
    else if (returnFocus) trigger.focus()
  }

  showCurrent()
  trigger.addEventListener('click', () => setOpen(!isOpen()))
  for (const option of options) {
    option.addEventListener('click', () => {
      applyTheme(option.value)
      showCurrent()
      closeTimer = setTimeout(() => setOpen(false, { returnFocus: true }), 200)
    })
  }
  picker.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) return setOpen(false, { returnFocus: true })
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    const index = options.indexOf(document.activeElement)
    if (step === undefined || index === -1) return
    event.preventDefault()
    options[(index + step + options.length) % options.length].focus()
  })
  picker.addEventListener('focusout', (event) => {
    if (event.relatedTarget !== null && !picker.contains(event.relatedTarget)) setOpen(false)
  })
  document.addEventListener('pointerdown', (event) => {
    if (isOpen() && !picker.contains(event.target)) setOpen(false)
  })
}
