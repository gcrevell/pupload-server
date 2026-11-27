export type Theme = 'auto' | 'light' | 'dark'

const storageKey = 'pupload-theme'
const root = document.documentElement

export function currentTheme(): Theme {
  const theme = root.dataset.theme
  return theme === 'light' || theme === 'dark' ? theme : 'auto'
}

export function applyTheme(theme: Theme) {
  const explicit = theme === 'light' || theme === 'dark'
  if (explicit) root.dataset.theme = theme
  else delete root.dataset.theme
  try {
    if (explicit) localStorage.setItem(storageKey, theme)
    else localStorage.removeItem(storageKey)
  } catch {}
}
