import type { SVGAttributes, TargetedFocusEvent, TargetedKeyboardEvent } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { applyTheme, currentTheme, type Theme } from './theme.ts'

const themes: Theme[] = ['auto', 'light', 'dark']
const titles: Record<Theme, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' }
const steps: Record<string, number | undefined> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

const shapes = {
  auto: () => <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" /></>,
  light: () => <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
  dark: () => <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  close: () => <path d="M6 6l12 12M18 6L6 18" />,
}

function Icon({ name, ...svg }: SVGAttributes<SVGSVGElement> & { name: keyof typeof shapes }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...svg}>
      {shapes[name]()}
    </svg>
  )
}

export function ThemePicker() {
  const [theme, setTheme] = useState(currentTheme)
  const [open, setOpen] = useState(false)
  const picker = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const closeTimer = useRef(0)

  function show(next: boolean, { returnFocus = false } = {}) {
    clearTimeout(closeTimer.current)
    setOpen(next)
    if (!next && returnFocus) trigger.current?.focus()
  }

  function pick(value: Theme) {
    applyTheme(value)
    setTheme(value)
    closeTimer.current = window.setTimeout(() => show(false, { returnFocus: true }), 200)
  }

  function moveFocus(event: TargetedKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) return show(false, { returnFocus: true })
    const step = steps[event.key]
    const options = [...panel.current!.children] as HTMLElement[]
    const index = options.indexOf(document.activeElement as HTMLElement)
    if (step === undefined || index === -1) return
    event.preventDefault()
    options[(index + step + options.length) % options.length].focus()
  }

  function closeOnFocusOutside(event: TargetedFocusEvent<HTMLDivElement>) {
    if (event.relatedTarget !== null && !event.currentTarget.contains(event.relatedTarget as Node)) show(false)
  }

  useLayoutEffect(() => {
    if (open) panel.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function closeOnPointerOutside(event: PointerEvent) {
      if (!picker.current?.contains(event.target as Node)) show(false)
    }
    document.addEventListener('pointerdown', closeOnPointerOutside)
    return () => document.removeEventListener('pointerdown', closeOnPointerOutside)
  }, [open])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  return (
    <div class="theme-picker" data-open={open || undefined} onKeyDown={moveFocus} onFocusOut={closeOnFocusOutside} ref={picker}>
      <button class="theme-picker-trigger" type="button" aria-expanded={open} aria-controls="theme-options" aria-label={`Theme: ${titles[theme]}`} onClick={() => show(!open)} ref={trigger}>
        <span class="theme-picker-icons">
          {[...themes, 'close' as const].map((name) => <Icon key={name} name={name} data-icon={name} />)}
        </span>
      </button>
      <div class="theme-picker-options" id="theme-options" role="group" aria-label="Theme" inert={!open} ref={panel}>
        {themes.map((value) => (
          <button key={value} class="theme-picker-option" type="button" value={value} aria-pressed={value === theme} title={titles[value]} onClick={() => pick(value)}>
            <Icon name={value} />
            <span class="visually-hidden">{titles[value]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
