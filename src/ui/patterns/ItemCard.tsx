/**
 * ItemCard — 항목 1건의 렌더만 한다(계산 없음, 설계서 2.6).
 * 카드 메타(분류·보정 추정·MVS·재보기)는 selector 가 만든 것을 그대로 그린다.
 *
 * variant: 'card' = 집중/스플릿용 카드, 'row' = 리스트용 한 줄.
 */
import { useState } from 'react';
import type { Estimate, ItemId } from '@core/schema/current';
import { STRINGS, type CardView, type MvsView } from '@core';
import { Icon } from '@ui/primitives/Icon';
import './ItemCard.css';

export interface ItemCardProps {
  card: CardView;
  variant?: 'card' | 'row';
  showIndex?: boolean;
  estimate?: Estimate;
  mvs?: MvsView;
  probeOffer?: boolean;
  onComplete: (id: ItemId) => void;
  onPostpone: (id: ItemId) => void;
  onDemote: (id: ItemId) => void;
  onRemove: (id: ItemId) => void;
  onStart?: (id: ItemId) => void;
  onProbe?: (id: ItemId) => void;
  onExplain?: (id: ItemId) => void;
  onMvsChange?: (id: ItemId, label: string) => void;
}

function ContextDot({ contextId }: { contextId: string }) {
  return <span className="ctx-dot" data-context={contextId} aria-hidden="true" />;
}

function energyLabel(level: 'low' | 'mid' | 'high'): string {
  return level === 'high' ? STRINGS.energy.high : level === 'low' ? STRINGS.energy.low : STRINGS.energy.mid;
}

function estimateText(estimate: Estimate | undefined): string {
  if (!estimate) return '';
  if (estimate.u >= 0.45) {
    return STRINGS.card.uncertain(estimate.plannedMin, estimate.lo, estimate.hi);
  }
  if (estimate.u >= 0.2) {
    return STRINGS.card.correctedRange(estimate.plannedMin, estimate.lo, estimate.hi);
  }
  return STRINGS.card.corrected(estimate.plannedMin, estimate.correctedMin);
}

export function ItemCard({
  card,
  variant = 'card',
  showIndex,
  estimate,
  mvs,
  probeOffer,
  onComplete,
  onPostpone,
  onDemote,
  onRemove,
  onStart,
  onProbe,
  onExplain,
  onMvsChange,
}: ItemCardProps) {
  const { item, meta } = card;
  const index = showIndex ?? variant === 'card';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(mvs?.label ?? '');
  const started = Boolean(item.startedAt) && item.status !== 'done';

  const mvsNode = mvs ? (
    editing ? (
      <form
        className="item-card__mvs-edit"
        onSubmit={(event) => {
          event.preventDefault();
          onMvsChange?.(item.id, draft);
          setEditing(false);
        }}
      >
        <input
          className="item-card__mvs-input"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          aria-label={STRINGS.mvs.label}
        />
        <button type="submit" className="item-card__mvs-save">
          {STRINGS.mvs.save}
        </button>
        <button
          type="button"
          className="item-card__mvs-cancel"
          onClick={() => {
            setDraft(mvs.label);
            setEditing(false);
          }}
        >
          {STRINGS.mvs.cancel}
        </button>
      </form>
    ) : (
      <button
        type="button"
        className="item-card__mvs"
        title={`${STRINGS.mvs.editHint} · ${STRINGS.mvs.minutes(mvs.targetMin)}`}
        onClick={() => {
          setDraft(mvs.label);
          setEditing(true);
        }}
      >
        <span className="item-card__mvs-mark" aria-hidden="true" />
        <span className="item-card__mvs-text">{mvs.label}</span>
      </button>
    )
  ) : null;

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
          {onStart ? (
            <button
              type="button"
              className="item-row__act item-row__act--start"
              onClick={() => onStart(item.id)}
              aria-label={`${item.title} ${STRINGS.card.start}`}
              title={STRINGS.card.start}
            >
              <Icon name="clock" size={15} />
            </button>
          ) : null}
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
    <article className={`item-card${started ? ' item-card--started' : ''}`} aria-label={item.title}>
      <div className="item-card__head">
        <span className="item-card__index num" aria-hidden="true">
          {card.index + 1}
        </span>
        <h3 className="item-card__title">{item.title}</h3>
        {started ? <span className="item-card__started num">◐ {STRINGS.card.started}</span> : null}
        {onExplain ? (
          <button
            type="button"
            className="item-card__more"
            onClick={() => onExplain(item.id)}
            aria-label={`${item.title} ${STRINGS.card.why}`}
            title={STRINGS.card.why}
          >
            ⋯
          </button>
        ) : null}
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

      {mvsNode}

      <div className="item-card__meta">
        <span className="item-card__context">
          <ContextDot contextId={item.contextId} />
          {meta.contextLabel}
        </span>
        <span className="item-card__sep" aria-hidden="true" />
        <span className="item-card__estimate num">{estimateText(estimate) || meta.estimateLabel}</span>
        <span className="item-card__energy num">{energyLabel(item.energy)}</span>
        {meta.labels.map((label) => (
          <span key={label} className="item-card__label num">
            {label}
          </span>
        ))}
      </div>

      {probeOffer && onProbe ? (
        <button type="button" className="item-card__probe" onClick={() => onProbe(item.id)}>
          ⏱ {STRINGS.card.probe}
        </button>
      ) : null}

      <div className="item-card__actions">
        {onStart ? (
          <button
            type="button"
            className="item-card__action item-card__action--start"
            onClick={() => onStart(item.id)}
          >
            <Icon name="clock" size={14} />
            {STRINGS.card.start}
          </button>
        ) : null}
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
