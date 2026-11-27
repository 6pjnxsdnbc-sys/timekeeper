/**
 * EmptyState — 비어 있는 화면은 "아직"이라고 말한다. 실패 문구는 없다 (P4).
 */
import type { ReactNode } from 'react';
import './EmptyState.css';

export interface EmptyStateProps {
  title: string;
  body: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({ title, body, hint, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__body">{body}</p>
      {hint ? <p className="empty-state__hint">{hint}</p> : null}
      {action}
    </div>
  );
}
