import type { InputHTMLAttributes } from 'preact'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  disableAutocapitalize?: boolean
  disableAutocorrect?: boolean
  disableSpellcheck?: boolean
  autocapitalize?: never
  autoCapitalize?: never
  autocorrect?: never
  autoCorrect?: never
  spellcheck?: never
}

export function TextField({ label, disableAutocapitalize = false, disableAutocorrect = false, disableSpellcheck = false, ...input }: TextFieldProps) {
  return (
    <label class="field">
      <span class="field-label">{label}</span>
      <input
        class="input"
        autocapitalize={disableAutocapitalize ? 'none' : undefined}
        // autoCorrect, not autocorrect: Preact sets autocorrect as the input's boolean property, and "off" is truthy.
        autoCorrect={disableAutocorrect ? 'off' : undefined}
        spellcheck={disableSpellcheck ? false : undefined}
        {...input}
      />
    </label>
  )
}
