/**
 * CompletedPanel — 오늘 한 것. 점수·연속일 없이 사실만 조용히 남긴다 (P4).
 */
import type { Item } from '@core/schema/current';
import { STRINGS } from '@core';
import './CompletedPanel.css';

export interface CompletedPanelProps {
  items: Item[];
}

export function CompletedPanel({ items }: CompletedPanelProps) {
  return (
    <section className="done" aria-label={STRINGS.board.doneTitle}>
      <h2 className="done__title">{STRINGS.board.doneTitle}</h2>
      {items.length === 0 ? (
        <p className="done__empty">{STRINGS.board.doneEmpty}</p>
      ) : (
        <ul className="done__list">
          {items.map((item) => (
            <li key={item.id} className="done__row">
              <span className="done__check" aria-hidden="true">
                ✓
              </span>
              <span className="done__label">{item.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
