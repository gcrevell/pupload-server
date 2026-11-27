import type { ButtonHTMLAttributes } from 'preact'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean, block?: boolean }

export function Button({ primary = false, block = false, ...button }: ButtonProps) {
  const classes = ['button', primary && 'button--primary', block && 'button--block'].filter(Boolean).join(' ')
  return <button class={classes} {...button} />
}
