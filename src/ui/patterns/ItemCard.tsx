/**
 * ItemCard — 항목 1건의 렌더만 한다(계산 없음, 설계서 2.6).
 * 카드 메타(분류·시간·라벨)는 selector 가 만든 것을 그대로 그린다.
 *
 * variant: 'card' = 집중/스플릿용 카드, 'row' = 리스트용 한 줄.
 */
import type { ItemId } from '@core/schema/current';
import { STRINGS, type CardView } from '@core';
import { Icon } from '@ui/primitives/Icon';
import './ItemCard.css';

export interface ItemCardProps {
  card: CardView;
  variant?: 'card' | 'row';
  showIndex?: boolean;
  onComplete: (id: ItemId) => void;
  onPostpone: (id: ItemId) => void;
  onDemote: (id: ItemId) => void;
  onRemove: (id: ItemId) => void;
}

function ContextDot({ contextId }: { contextId: string }) {
  return <span className="ctx-dot" data-context={contextId} aria-hidden="true" />;
}

export function ItemCard({
  card,
  variant = 'card',
  showIndex,
  onComplete,
  onPostpone,
  onDemote,
  onRemove,
}: ItemCardProps) {
  const { item, meta } = card;
  const index = showIndex ?? variant === 'card';

  if (variant === 'row') {
    return (
      <article className="item-row" aria-label={item.title}>
        {index ? (
          <span className="item-row__index num" aria-hidden="true">
            {card.index + 1}
          </span>
        ) : null}
        <ContextDot contextId={item.contextId} />
        <span className="item-row__body">
          <span className="item-row__title">{item.title}</span>
          <span className="item-row__meta">
            <span>{meta.contextLabel}</span>
            <span className="item-row__sep" aria-hidden="true" />
            <span className="num">{meta.estimateLabel}</span>
            {meta.labels.map((label) => (
              <span key={label} className="item-row__label num">
                {label}
              </span>
            ))}
          </span>
        </span>
        <span className="item-row__actions">
          <button
            type="button"
            className="item-row__act item-row__act--done"
            onClick={() => onComplete(item.id)}
            aria-label={`${item.title} ${STRINGS.card.complete}`}
            title={STRINGS.card.complete}
          >
            <Icon name="check" size={15} />
          </button>
          <button
            type="button"
            className="item-row__act"
            onClick={() => onPostpone(item.id)}
            aria-label={`${item.title} ${STRINGS.card.postpone}`}
            title={STRINGS.card.postpone}
          >
            <Icon name="arrowRight" size={15} />
          </button>
          <button
            type="button"
            className="item-row__act"
            onClick={() => onDemote(item.id)}
            aria-label={`${item.title} ${STRINGS.card.demote}`}
            title={STRINGS.card.demote}
          >
            <Icon name="arrowDown" size={15} />
          </button>
          <button
            type="button"
            className="item-row__act item-row__act--remove"
            onClick={() => onRemove(item.id)}
            aria-label={STRINGS.card.removeLabel(item.title)}
            title={STRINGS.card.remove}
          >
            <Icon name="x" size={14} />
          </button>
        </span>
      </article>
    );
  }

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
          title={STRINGS.card.remove}
        >
          <Icon name="x" size={14} />
        </button>
      </div>

      <div className="item-card__meta">
        <span className="item-card__context">
          <ContextDot contextId={item.contextId} />
          {meta.contextLabel}
        </span>
        <span className="item-card__sep" aria-hidden="true" />
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
        <button
          type="button"
          className="item-card__action item-card__action--done"
          onClick={() => onComplete(item.id)}
        >
          <Icon name="check" size={14} />
          {STRINGS.card.complete}
        </button>
        <span className="item-card__secondary">
          <button type="button" className="item-card__action" onClick={() => onPostpone(item.id)}>
            {STRINGS.card.postpone}
          </button>
          <button type="button" className="item-card__action" onClick={() => onDemote(item.id)}>
            {STRINGS.card.demote}
          </button>
        </span>
      </div>
    </article>
  );
}
