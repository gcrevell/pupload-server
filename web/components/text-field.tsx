import type { InputHTMLAttributes } from 'preact'

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string }

export function TextField({ label, ...input }: TextFieldProps) {
  return (
    <label class="field">
      <span class="field-label">{label}</span>
      <input class="input" {...input} />
    </label>
  )
}
