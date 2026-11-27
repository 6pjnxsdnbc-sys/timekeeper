/**
 * Overlay — 시트/모달의 바탕. 배경을 어둡게만 하고, 닫기는 바깥 클릭·Esc 다.
 * 열려 있는 동안 뒤 화면은 스크롤하지 않는다.
 */
import { useEffect, type ReactNode } from 'react';
import './Overlay.css';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  placement?: 'center' | 'bottom';
  /** 패널 폭 — 스튜디오처럼 내용이 많은 패널은 'lg'. */
  size?: 'md' | 'lg';
}

export function Overlay({
  open,
  onClose,
  label,
  children,
  placement = 'center',
  size = 'md',
}: OverlayProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className={`overlay overlay--${placement}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`overlay__panel overlay__panel--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}
