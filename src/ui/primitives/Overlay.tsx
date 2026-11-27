/**
 * Overlay — 시트/모달의 바탕. 배경을 어둡게만 하고, 닫기는 바깥 클릭이다.
 */
import type { ReactNode } from 'react';
import './Overlay.css';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  placement?: 'center' | 'bottom';
}

export function Overlay({ open, onClose, label, children, placement = 'center' }: OverlayProps) {
  if (!open) return null;
  return (
    <div
      className={`overlay overlay--${placement}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="overlay__panel" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
