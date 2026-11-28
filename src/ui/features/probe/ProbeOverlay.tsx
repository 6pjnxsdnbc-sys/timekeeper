/**
 * ProbeOverlay — 5분만 재보기 (설계서 5.10 (1)).
 *
 * 버튼이다, 절차가 아니다. 사용자가 눌렀을 때만 뜨고, 끝나면 2선택.
 * 재보기는 **완료로 세지 않는다** — 준비이고, 기록만 남긴다.
 */
import { useEffect, useState } from 'react';
import type { Estimate, FocusSession, Item } from '@core/schema/current';
import { STRINGS } from '@core';
import './ProbeOverlay.css';

export interface ProbeOverlayProps {
  session: FocusSession;
  item: Item;
  estimate: Estimate;
  split?: { chunks: number; chunkMin: number } | null;
  onVerdict: (verdict: 'kept' | 'bigger', revisedMin?: number) => void;
  onDismiss: () => void;
}

const SIZES = [15, 30, 60] as const;

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function ProbeOverlay({
  session,
  item,
  estimate,
  split,
  onVerdict,
  onDismiss,
}: ProbeOverlayProps) {
  const [now, setNow] = useState(() => Date.now());
  const [phase, setPhase] = useState<'timer' | 'verdict' | 'size'>('timer');

  useEffect(() => {
    if (phase !== 'timer') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const remaining = Math.max(0, Date.parse(session.endsAt) - now);

  useEffect(() => {
    if (phase === 'timer' && remaining <= 0) setPhase('verdict');
  }, [phase, remaining]);

  if (phase === 'timer') {
    return (
      <div className="probe-bar" role="status" aria-live="polite">
        <span className="probe-bar__clock num">⏱ {formatClock(remaining)}</span>
        <span className="probe-bar__label">{STRINGS.probe.eyebrow}</span>
        <button type="button" className="probe-bar__stop" onClick={() => setPhase('verdict')}>
          {STRINGS.probe.stop}
        </button>
      </div>
    );
  }

  return (
    <div className="probe-sheet" role="dialog" aria-modal="true" aria-label={STRINGS.probe.title}>
      <div className="probe-sheet__panel">
        <p className="probe-sheet__eyebrow">{STRINGS.probe.title}</p>
        <h2 className="probe-sheet__title">{item.title}</h2>

        {phase === 'verdict' ? (
          <>
            <p className="probe-sheet__question">{STRINGS.probe.question}</p>
            <div className="probe-sheet__choices">
              <button
                type="button"
                className="probe-sheet__choice"
                onClick={() => onVerdict('kept')}
              >
                {STRINGS.probe.kept}
              </button>
              <button
                type="button"
                className="probe-sheet__choice probe-sheet__choice--big"
                onClick={() => setPhase('size')}
              >
                {STRINGS.probe.bigger}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="probe-sheet__question">{STRINGS.probe.sizeQuestion}</p>
            <div className="probe-sheet__sizes">
              {SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  className="probe-sheet__size num"
                  aria-pressed={estimate.plannedMin === size}
                  onClick={() => onVerdict('bigger', size)}
                >
                  {`${size}분`}
                </button>
              ))}
            </div>
            {split ? (
              <p className="probe-sheet__split num">
                {STRINGS.probe.split(split.chunkMin, split.chunks)}
              </p>
            ) : null}
          </>
        )}

        <div className="probe-sheet__foot">
          <span className="probe-sheet__note">{STRINGS.probe.notDone}</span>
          <button type="button" className="probe-sheet__dismiss" onClick={onDismiss}>
            {STRINGS.probe.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
