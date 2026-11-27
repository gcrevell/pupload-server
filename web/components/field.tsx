import type { InputHTMLAttributes } from 'preact'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string }

export function Field({ label, ...input }: FieldProps) {
  return (
    <label class="field">
      <span class="field-label">{label}</span>
      <input class="input" {...input} />
    </label>
  )
}
