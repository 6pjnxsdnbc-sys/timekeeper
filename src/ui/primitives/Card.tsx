/**
 * Card — 도메인 지식 0 (설계서 2.6). `Item` 을 모른다.
 */
import type { ReactNode } from 'react';
import './Card.css';

export interface CardProps {
  children: ReactNode;
  /** 목록에서의 의미 단위 — 스크린리더가 카드 경계를 읽는다. */
  label?: string;
  tone?: 'default' | 'ghost';
  className?: string;
}

export function Card({ children, label, tone = 'default', className }: CardProps) {
  const classes = ['card', `card--${tone}`, className].filter(Boolean).join(' ');
  return (
    <section className={classes} aria-label={label}>
      {children}
    </section>
  );
}
