/**
 * QuickCapture — 어디서든 1초 입력 (설계서 1.4 M1 · 5.6).
 * 아래 한 줄이 실시간 해석이다. 저장은 Enter 하나로 끝난다.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Context, LocalDate } from '@core/schema/current';
import { STRINGS, parseCapture } from '@core';
import { Overlay } from '@ui/primitives/Overlay';
import { Icon } from '@ui/primitives/Icon';
import './QuickCapture.css';

export interface QuickCaptureProps {
  open: boolean;
  today: LocalDate;
  contexts: Record<string, Context>;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export function QuickCapture({ open, today, contexts, onClose, onSubmit }: QuickCaptureProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setText('');
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const parts = useMemo(() => {
    if (!text.trim()) return null;
    return parseCapture(text, { today, contexts }).parts;
  }, [text, today, contexts]);

  return (
    <Overlay open={open} onClose={onClose} label={STRINGS.capture.title} placement="center">
      <form
        className="quick"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim()) return;
          onSubmit(text);
        }}
      >
        <div className="quick__head">
          <h2 className="quick__title">{STRINGS.capture.title}</h2>
          <button
            type="button"
            className="quick__close"
            onClick={onClose}
            aria-label={STRINGS.capture.close}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="quick__field">
          <span className="quick__field-icon" aria-hidden="true">
            <Icon name="plus" size={16} />
          </span>
          <input
            ref={inputRef}
            className="quick__input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={STRINGS.capture.placeholder}
            aria-label={STRINGS.capture.placeholder}
            autoComplete="off"
            enterKeyHint="done"
          />
        </div>

        <div className="quick__preview" aria-live="polite">
          {parts && parts.length > 0 ? (
            parts.map((part) => (
              <span key={part} className="quick__chip">
                {part}
              </span>
            ))
          ) : (
            <span className="quick__chip quick__chip--idle">{STRINGS.capture.emptyPreview}</span>
          )}
        </div>

        <div className="quick__foot">
          <span className="quick__keys">{STRINGS.capture.example}</span>
          <button type="submit" className="quick__save" disabled={!text.trim()}>
            {STRINGS.capture.save}
          </button>
        </div>
        <p className="quick__hint">{STRINGS.capture.keys}</p>
      </form>
    </Overlay>
  );
}
