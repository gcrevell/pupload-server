import type { ButtonHTMLAttributes } from 'preact'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant: 'primary' | 'secondary', block?: boolean }

export function Button({ variant, block = false, ...button }: ButtonProps) {
  const classes = ['button', `button--${variant}`, block && 'button--block'].filter(Boolean).join(' ')
  return <button class={classes} {...button} />
}
