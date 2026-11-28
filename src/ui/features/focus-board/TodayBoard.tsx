/**
 * TodayBoard — 오늘 카드 최대 3장 (설계서 1.4 M2 · 5.7).
 * 3장이 차면 안내만 하고, 빈 칸은 "빈 자리"로 남긴다. 자동 추가는 없다.
 *
 * variant: 'board' = 집중 카드, 'list' = 한 줄 리스트.
 */
import type { Estimate, ItemId } from '@core/schema/current';
import { STRINGS, type BoardView, type MvsView } from '@core';
import { EmptyState } from '@ui/patterns/EmptyState';
import { ItemCard } from '@ui/patterns/ItemCard';
import { Icon } from '@ui/primitives/Icon';
import './TodayBoard.css';

export interface TodayBoardProps {
  view: BoardView;
  variant?: 'board' | 'list';
  estimateFor?: (id: ItemId) => Estimate | undefined;
  mvsFor?: (id: ItemId) => MvsView | undefined;
  probeOffers?: ItemId[];
  onComplete: (id: ItemId) => void;
  onPostpone: (id: ItemId) => void;
  onDemote: (id: ItemId) => void;
  onRemove: (id: ItemId) => void;
  onStart?: (id: ItemId) => void;
  onProbe?: (id: ItemId) => void;
  onExplain?: (id: ItemId) => void;
  onMvsChange?: (id: ItemId, label: string) => void;
  onOpenCapture: () => void;
  onSample?: () => void;
}

export function TodayBoard({
  view,
  variant = 'board',
  estimateFor,
  mvsFor,
  probeOffers,
  onComplete,
  onPostpone,
  onDemote,
  onRemove,
  onStart,
  onProbe,
  onExplain,
  onMvsChange,
  onOpenCapture,
  onSample,
}: TodayBoardProps) {
  const isEmptyDay =
    view.cards.length === 0 && view.completed.length === 0 && view.candidates.length === 0;
  const slots = Array.from({ length: view.emptySlots }, (_, index) => index);
  const rowVariant = variant === 'list';
  const offers = probeOffers ?? [];

  return (
    <section className={`board${rowVariant ? ' board--list' : ''}`} aria-label={STRINGS.board.title}>
      <header className="board__head">
        <h2 className="board__title">{STRINGS.board.title}</h2>
        <span className="board__count num" aria-label={`${view.cards.length} / ${view.capacity}`}>
          {STRINGS.board.count(view.cards.length, view.capacity)}
        </span>
      </header>

      {isEmptyDay ? (
        <div className="board__empty">
          <EmptyState
            title={STRINGS.shell.emptyBoardTitle}
            body={STRINGS.shell.emptyBoardBody}
            hint={STRINGS.capture.hint}
            action={
              <button type="button" className="board__empty-action" onClick={onOpenCapture}>
                <Icon name="plus" size={14} />
                {STRINGS.shell.emptyBoardAction}
              </button>
            }
          />
          {onSample ? (
            <div className="board__sample">
              <button type="button" className="board__sample-btn" onClick={onSample}>
                {STRINGS.sample.action}
              </button>
              <span className="board__sample-hint">{STRINGS.sample.hint}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="board__cards">
          {view.cards.map((card) => (
            <li key={card.item.id}>
              <ItemCard
                card={card}
                variant={rowVariant ? 'row' : 'card'}
                showIndex
                estimate={estimateFor?.(card.item.id)}
                mvs={mvsFor?.(card.item.id)}
                probeOffer={offers.includes(card.item.id)}
                onComplete={onComplete}
                onPostpone={onPostpone}
                onDemote={onDemote}
                onRemove={onRemove}
                onStart={onStart}
                onProbe={onProbe}
                onExplain={onExplain}
                onMvsChange={onMvsChange}
              />
            </li>
          ))}
          {slots.map((slot) => (
            <li key={`slot-${slot}`}>
              <div className="board__slot">
                <span className="board__slot-plus" aria-hidden="true">
                  <Icon name="plus" size={13} />
                </span>
                <span className="board__slot-label">{STRINGS.board.emptySlot}</span>
                <span className="board__slot-hint">{STRINGS.board.emptySlotHint}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {view.fullHint ? <p className="board__note">{STRINGS.board.fullHint}</p> : null}
      {view.extraOffer ? <p className="board__note board__note--offer">{STRINGS.board.extraOffer}</p> : null}
    </section>
  );
}
