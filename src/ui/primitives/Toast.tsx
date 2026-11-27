/**
 * Toast — 하단 1줄. 되돌리기가 있으면 그 자리에서 1탭. 경고·모달 아님.
 */
import { useEffect, useRef } from 'react';
import { Button } from './Button';
import './Toast.css';

export interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export function Toast({ message, actionLabel, onAction, onDismiss, durationMs = 5000 }: ToastProps) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs]);

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__message">{message}</span>
      {actionLabel && onAction ? (
        <Button size="sm" variant="ghost" className="toast__action" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
