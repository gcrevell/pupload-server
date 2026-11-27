import { createElement, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'preact'

type ButtonStyle = { variant: 'primary' | 'secondary', block?: boolean }
type ButtonProps = ButtonStyle & (
  | ({ as?: 'button' } & ButtonHTMLAttributes<HTMLButtonElement>)
  | ({ as?: 'a' } & AnchorHTMLAttributes<HTMLAnchorElement>)
)

export function Button({ variant, block = false, as, ...props }: ButtonProps) {
  const classes = ['button', `button--${variant}`, block && 'button--block'].filter(Boolean).join(' ')
  return createElement(as ?? ('href' in props ? 'a' : 'button'), { class: classes, ...props })
}
