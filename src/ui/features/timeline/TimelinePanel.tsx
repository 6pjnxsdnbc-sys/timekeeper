/**
 * TimelinePanel — 04:00–28:00 시간축 (설계서 5.7 미니 타임라인 · 5.8).
 *
 * 시각이 있는 항목은 블록으로, 없는 항목은 아래 칩으로. 칩을 고른 뒤
 * 빈 시간을 누르면 배치된다(클릭 한 번). 지금 시각은 선 하나로만 표시한다.
 */
import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import type { ItemId } from '@core/schema/current';
import { STRINGS, formatTimelineClock, type TimelineView } from '@core';
import './TimelinePanel.css';

export interface PendingPlacement {
  itemId: ItemId;
  title: string;
}

export interface TimelineSuggestion {
  itemId: ItemId;
  title: string;
  startMin: number;
  durationMin: number;
}

export interface TimelinePanelProps {
  timeline: TimelineView;
  suggestion?: TimelineSuggestion | null;
  pending: PendingPlacement | null;
  onPick: (item: PendingPlacement | null) => void;
  onPlace: (itemId: ItemId, startMin: number) => void;
  onUnschedule: (itemId: ItemId) => void;
  onStart: (itemId: ItemId) => void;
}

const HOUR_HEIGHT = 36;
const SNAP_MIN = 15;

function positionOf(minute: number, dayStartMin: number): number {
  return ((minute - dayStartMin) / 60) * HOUR_HEIGHT;
}

export function TimelinePanel({
  timeline,
  suggestion,
  pending,
  onPick,
  onPlace,
  onUnschedule,
  onStart,
}: TimelinePanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const nowRef = useRef(timeline.nowMin);
  nowRef.current = timeline.nowMin;

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let hour = timeline.startHour; hour <= timeline.endHour; hour += 1) list.push(hour);
    return list;
  }, [timeline.startHour, timeline.endHour]);

  // 처음 보이는 순간 한 번만 지금 시각으로 — 매분 따라가지는 않는다(산만 억제).
  // 모바일 탭에서는 display:none 이라 그때는 clientHeight 가 0 — 보이는 순간(I/O)에 맞춘다.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    let applied = false;
    const apply = () => {
      if (applied || node.clientHeight === 0) return;
      node.scrollTop = Math.max(0, positionOf(nowRef.current, timeline.dayStartMin) - HOUR_HEIGHT * 2);
      applied = true;
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) apply();
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    apply();
    return () => observer.disconnect();
  }, [timeline.dayStartMin]);

  const handleTrackClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!pending) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const rawMinutes = (offsetY / HOUR_HEIGHT) * 60 + timeline.dayStartMin;
    const snapped = Math.round(rawMinutes / SNAP_MIN) * SNAP_MIN;
    const bounded = Math.min(timeline.dayEndMin - SNAP_MIN, Math.max(timeline.dayStartMin, snapped));
    onPlace(pending.itemId, bounded % (24 * 60));
  };

  const freeLabel = timeline.freeFromNow >= 60
    ? `${Math.floor(timeline.freeFromNow / 60)}시간 ${timeline.freeFromNow % 60}분`
    : `${timeline.freeFromNow}분`;

  return (
    <section className="timeline" aria-label={STRINGS.timeline.title}>
      <header className="timeline__head">
        <h2 className="timeline__title">{STRINGS.timeline.title}</h2>
        <span className="timeline__free num">{STRINGS.timeline.free(freeLabel)}</span>
        <span className="timeline__density num">{`${STRINGS.timeline.density} ${Math.round(timeline.density * 100)}%`}</span>
      </header>

      {pending ? (
        <div className="timeline__pending">
          <span className="timeline__pending-text">{STRINGS.timeline.chooseSlot(pending.title)}</span>
          <button type="button" className="timeline__pending-cancel" onClick={() => onPick(null)}>
            {STRINGS.timeline.cancel}
          </button>
        </div>
      ) : null}

      <div className="timeline__scroll" ref={scrollRef}>
        <div className="timeline__inner" style={{ height: `${(timeline.endHour - timeline.startHour) * HOUR_HEIGHT}px` }}>
          <div className="timeline__axis" aria-hidden="true">
            {hours.map((hour) => (
              <div
                key={hour}
                className="timeline__tick"
                style={{ top: `${positionOf(hour * 60, timeline.dayStartMin)}px` }}
              >
                <span className="timeline__hour num">{formatTimelineClock(hour * 60)}</span>
              </div>
            ))}
          </div>

          <div
            className={`timeline__track${pending ? ' timeline__track--placing' : ''}`}
            onClick={handleTrackClick}
            role={pending ? 'button' : 'presentation'}
            aria-label={pending ? STRINGS.timeline.placeHint : STRINGS.timeline.title}
          >
            {hours.map((hour) => (
              <span
                key={hour}
                className="timeline__line"
                style={{ top: `${positionOf(hour * 60, timeline.dayStartMin)}px` }}
                aria-hidden="true"
              />
            ))}

            {timeline.gaps
              .filter((gap) => gap.minutes >= 30 && gap.endMin > timeline.nowMin)
              .map((gap) => (
                <span
                  key={`gap-${gap.startMin}`}
                  className="timeline__gap num"
                  style={{
                    top: `${positionOf(Math.max(gap.startMin, timeline.nowMin), timeline.dayStartMin)}px`,
                    height: `${((gap.endMin - Math.max(gap.startMin, timeline.nowMin)) / 60) * HOUR_HEIGHT}px`,
                  }}
                >
                  {`${gap.endMin - Math.max(gap.startMin, timeline.nowMin)}분`}
                </span>
              ))}

            {timeline.blocks.map((block) => (
              <div
                key={block.key}
                className={`timeline__block${block.locked ? ' timeline__block--locked' : ''}`}
                data-kind={block.kind}
                data-state={block.state}
                style={{
                  top: `${positionOf(block.startMin, timeline.dayStartMin)}px`,
                  height: `${Math.max(22, ((block.endMin - block.startMin) / 60) * HOUR_HEIGHT)}px`,
                }}
              >
                <button
                  type="button"
                  className="timeline__block-main"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (pending) {
                      onPlace(pending.itemId, block.startMin);
                      return;
                    }
                    onStart(block.itemId);
                  }}
                  title={`${block.title} · ${formatTimelineClock(block.startMin)}–${formatTimelineClock(block.endMin)}`}
                >
                  <span className="timeline__block-time num">
                    {formatTimelineClock(block.startMin)}
                  </span>
                  <span className="timeline__block-title">{block.title}</span>
                  {block.locked ? (
                    <span className="timeline__block-lock num">{STRINGS.timeline.locked}</span>
                  ) : null}
                </button>
                {block.locked ? null : (
                  <button
                    type="button"
                    className="timeline__block-remove"
                    aria-label={`${block.title} ${STRINGS.timeline.unschedule}`}
                    title={STRINGS.timeline.unschedule}
                    onClick={(event) => {
                      event.stopPropagation();
                      onUnschedule(block.itemId);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            {suggestion &&
            suggestion.startMin >= timeline.dayStartMin &&
            suggestion.startMin < timeline.dayEndMin ? (
              <div
                className="timeline__ghost"
                style={{
                  top: `${positionOf(suggestion.startMin, timeline.dayStartMin)}px`,
                  height: `${Math.max(22, (suggestion.durationMin / 60) * HOUR_HEIGHT)}px`,
                }}
              >
                <button
                  type="button"
                  className="timeline__ghost-main"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPlace(suggestion.itemId, suggestion.startMin);
                  }}
                  title={`${suggestion.title} · ${formatTimelineClock(suggestion.startMin)}`}
                >
                  <span className="timeline__block-time num">
                    {formatTimelineClock(suggestion.startMin)}
                  </span>
                  <span className="timeline__block-title">{suggestion.title}</span>
                  <span className="timeline__ghost-tag num">{STRINGS.timeline.suggestion}</span>
                </button>
              </div>
            ) : null}

            <span
              className="timeline__now"
              style={{ top: `${positionOf(timeline.nowMin, timeline.dayStartMin)}px` }}
              aria-hidden="true"
            >
              <span className="timeline__now-label num">{STRINGS.timeline.now}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="timeline__unplaced">
        <p className="timeline__unplaced-title">
          {STRINGS.timeline.unplaced}
          <span className="timeline__unplaced-count num">{timeline.unplaced.length}</span>
        </p>
        {timeline.unplaced.length === 0 ? (
          <p className="timeline__unplaced-empty">{STRINGS.timeline.noUnplaced}</p>
        ) : (
          <ul className="timeline__chips">
            {timeline.unplaced.slice(0, 12).map((entry) => {
              const active = pending?.itemId === entry.item.id;
              return (
                <li key={entry.item.id}>
                  <button
                    type="button"
                    className="timeline__chip"
                    aria-pressed={active}
                    onClick={() => onPick(active ? null : { itemId: entry.item.id, title: entry.item.title })}
                  >
                    <span className="timeline__chip-title">{entry.item.title}</span>
                    <span className="timeline__chip-min num">
                      {entry.estimate.correctedMin > 0 ? `${entry.estimate.correctedMin}분` : '—'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
