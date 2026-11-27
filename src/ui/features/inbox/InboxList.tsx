/**
 * InboxList — 오늘 보드에 올리지 않은 것들. 1탭으로 올리고, 꽉 차면 안내만.
 * 기본은 접힌 1줄 목록이고 12개를 넘으면 "더 보기" (5.7).
 */
import type { ItemId } from '@core/schema/current';
import { STRINGS, type BoardView } from '@core';
import './InboxList.css';

export interface InboxListProps {
  view: BoardView;
  expanded: boolean;
  onToggleMore: () => void;
  onPromote: (id: ItemId) => void;
}

export function InboxList({ view, expanded, onToggleMore, onPromote }: InboxListProps) {
  return (
    <section className="inbox" aria-label={STRINGS.inbox.title}>
      <header className="inbox__head">
        <h2 className="inbox__title">{STRINGS.inbox.title}</h2>
        <span className="inbox__count num">{view.candidates.length + view.hiddenCandidateCount}</span>
      </header>

      {view.candidates.length === 0 ? (
        <p className="inbox__empty">{STRINGS.inbox.empty}</p>
      ) : (
        <ul className="inbox__list">
          {view.candidates.map((candidate) => (
            <li key={candidate.item.id} className="inbox__row">
              <div className="inbox__body">
                <span className="inbox__row-title">{candidate.item.title}</span>
                <span className="inbox__meta">
                  <span className="inbox__context">{candidate.meta.contextLabel}</span>
                  <span className="num">{candidate.meta.estimateLabel}</span>
                  {candidate.meta.estimateAssumed ? (
                    <span className="inbox__assumed">{STRINGS.card.assumed}</span>
                  ) : null}
                  {candidate.meta.labels.map((label) => (
                    <span key={label} className="inbox__label num">
                      {label}
                    </span>
                  ))}
                </span>
              </div>
              <button
                type="button"
                className="inbox__add"
                onClick={() => onPromote(candidate.item.id)}
                disabled={view.full}
                aria-label={`${candidate.item.title} ${STRINGS.inbox.addToToday}`}
              >
                {STRINGS.inbox.addToToday}
              </button>
            </li>
          ))}
        </ul>
      )}

      {view.hiddenCandidateCount > 0 && !expanded ? (
        <button type="button" className="inbox__more" onClick={onToggleMore}>
          {STRINGS.inbox.more(view.hiddenCandidateCount)}
        </button>
      ) : null}

      {expanded && view.candidates.length > 0 ? (
        <button type="button" className="inbox__more" onClick={onToggleMore}>
          {STRINGS.inbox.fold}
        </button>
      ) : null}
    </section>
  );
}
