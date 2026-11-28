/**
 * FocusOverlay — 집중 모드 (설계서 5.9).
 *
 * 카드 1장 · 링 · 버튼 셋뿐. 다른 것(시계·배지·Now Line)은 숨긴다.
 * 타이머가 끝나면 선택 3개만 남는다: 계속 25분 · 착수 성공 · 5분 쉬기.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Estimate, FocusSession, Item } from '@core/schema/current';
import { STRINGS } from '@core';
import './FocusOverlay.css';

export interface FocusOverlayProps {
  session: FocusSession;
  item: Item;
  mvs?: string;
  estimate?: Estimate;
  onComplete: () => void;
  onStarted: () => void;
  onLeave: () => void;
  onPause: () => void;
  onResume: () => void;
  onExtend: (minutes: number) => void;
}

const RADIUS = 78;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function FocusOverlay({
  session,
  item,
  mvs,
  estimate,
  onComplete,
  onStarted,
  onLeave,
  onPause,
  onResume,
  onExtend,
}: FocusOverlayProps) {
  const [now, setNow] = useState(() => Date.now());
  const [breakUntil, setBreakUntil] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onLeave();
    };
    window.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onLeave]);

  const total = Math.max(1, session.plannedMin * 60_000);
  const endAt = Date.parse(session.endsAt);
  const pausedAt = session.pausedAt ? Date.parse(session.pausedAt) : null;
  const reference = pausedAt ?? now;
  const remaining = Math.max(0, endAt - reference);
  const expired = remaining <= 0 && !session.pausedAt;
  const progress = Math.min(1, Math.max(0, 1 - remaining / total));

  const breakRemaining = breakUntil === null ? 0 : Math.max(0, breakUntil - now);
  const breaking = breakUntil !== null && breakRemaining > 0;

  const endClock = useMemo(() => {
    const date = new Date(endAt);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }, [endAt]);

  return (
    <div className="focus-mode" role="dialog" aria-modal="true" aria-label={STRINGS.focus.title}>
      <div className="focus-mode__inner">
        <div className="focus-mode__ring" data-expired={expired} data-paused={Boolean(session.pausedAt)}>
          <svg viewBox="0 0 180 180" className="focus-mode__svg" aria-hidden="true">
            <circle className="focus-mode__track" cx="90" cy="90" r={RADIUS} />
            <circle
              className="focus-mode__progress"
              cx="90"
              cy="90"
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            />
          </svg>
          <div className="focus-mode__clock num">
            {breaking ? formatClock(breakRemaining) : formatClock(remaining)}
          </div>
          <div className="focus-mode__caption">
            {breaking
              ? STRINGS.focus.break5
              : session.pausedAt
                ? STRINGS.focus.pause
                : expired
                  ? STRINGS.focus.endedTitle
                  : `${STRINGS.focus.ringNote} ${endClock}`}
          </div>
        </div>

        <h1 className="focus-mode__title">{item.title}</h1>
        {mvs ? <p className="focus-mode__mvs">{mvs}</p> : <p className="focus-mode__mvs">{STRINGS.focus.mvsFallback}</p>}

        <p className="focus-mode__meta num">
          {estimate
            ? estimate.u >= 0.45
              ? STRINGS.card.uncertain(estimate.plannedMin, estimate.lo, estimate.hi)
              : STRINGS.card.corrected(estimate.plannedMin, estimate.correctedMin)
            : ''}
        </p>

        {expired || breaking ? (
          <div className="focus-mode__choices">
            {breaking ? (
              <button type="button" className="focus-mode__choice" onClick={() => setBreakUntil(null)}>
                {STRINGS.focus.continue25}
              </button>
            ) : (
              <button type="button" className="focus-mode__choice" onClick={() => onExtend(25)}>
                {STRINGS.focus.continue25}
              </button>
            )}
            <button type="button" className="focus-mode__choice" onClick={onStarted}>
              {STRINGS.focus.started}
            </button>
            <button
              type="button"
              className="focus-mode__choice"
              onClick={() => (breaking ? onLeave() : setBreakUntil(Date.now() + 5 * 60_000))}
            >
              {breaking ? STRINGS.focus.leave : STRINGS.focus.break5}
            </button>
          </div>
        ) : (
          <div className="focus-mode__actions">
            <button type="button" className="focus-mode__primary" onClick={onComplete}>
              {STRINGS.focus.done}
            </button>
            <button
              type="button"
              className="focus-mode__secondary"
              onClick={session.pausedAt ? onResume : onPause}
            >
              {session.pausedAt ? STRINGS.focus.resume : STRINGS.focus.pause}
            </button>
            <button type="button" className="focus-mode__ghost" onClick={onStarted}>
              {STRINGS.focus.started}
            </button>
          </div>
        )}

        <button type="button" className="focus-mode__leave" onClick={onLeave}>
          {STRINGS.focus.leave}
        </button>
      </div>
    </div>
  );
}
