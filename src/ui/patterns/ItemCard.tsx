/**
 * ItemCard — 항목 1건의 렌더만 한다(계산 없음, 설계서 2.6).
 * 카드 메타(분류·시간·라벨)는 selector 가 만든 것을 그대로 그린다.
 */
import type { ItemId } from '@core/schema/current';
import { STRINGS, type CardView } from '@core';
import { Chip } from '@ui/primitives/Chip';
import './ItemCard.css';

export interface ItemCardProps {
  card: CardView;
  onComplete: (id: ItemId) => void;
  onPostpone: (id: ItemId) => void;
  onDemote: (id: ItemId) => void;
  onRemove: (id: ItemId) => void;
}

export function ItemCard({ card, onComplete, onPostpone, onDemote, onRemove }: ItemCardProps) {
  const { item, meta } = card;
  return (
    <article className="item-card" aria-label={item.title}>
      <div className="item-card__head">
        <span className="item-card__index num" aria-hidden="true">
          {card.index + 1}
        </span>
        <h3 className="item-card__title">{item.title}</h3>
        <button
          type="button"
          className="item-card__remove"
          onClick={() => onRemove(item.id)}
          aria-label={STRINGS.card.removeLabel(item.title)}
        >
          ✕
        </button>
      </div>

      <div className="item-card__meta">
        <Chip>{meta.contextLabel}</Chip>
        <span className="item-card__estimate num">{meta.estimateLabel}</span>
        {meta.estimateAssumed ? (
          <span className="item-card__assumed">{STRINGS.card.assumed}</span>
        ) : null}
        {meta.labels.map((label) => (
          <span key={label} className="item-card__label num">
            {label}
          </span>
        ))}
      </div>

      <div className="item-card__actions">
        <button type="button" className="item-card__action item-card__action--done" onClick={() => onComplete(item.id)}>
          <span aria-hidden="true">✓</span> {STRINGS.card.complete}
        </button>
        <button type="button" className="item-card__action" onClick={() => onPostpone(item.id)}>
          {STRINGS.card.postpone}
        </button>
        <button type="button" className="item-card__action" onClick={() => onDemote(item.id)}>
          {STRINGS.card.demote}
        </button>
      </div>
    </article>
  );
}
