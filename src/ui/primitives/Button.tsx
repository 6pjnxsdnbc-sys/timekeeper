/**
 * Button — 도메인 없는 부품. 변형은 4가지뿐이다 (5.4 색 절제).
 */
import type { ButtonHTMLAttributes } from 'react';
import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'quiet' | 'ghost' | 'primary' | 'danger';
  size?: 'sm' | 'md';
}

export function Button({
  variant = 'quiet',
  size = 'md',
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, `btn--${size}`, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
