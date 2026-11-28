/**
 * RecommendStrip — "지금 가장 추천하는 작업" 한 줄 (설계서 4.5 · 4.8).
 *
 * 이유는 숫자 등급이 아니라 **기여 몫**이다: `에너지 적합 +32% · 마감 임박 +28%`.
 * 총점은 여기에 쓰지 않는다(E6).
 */
import { STRINGS, toPercent } from '@core';
import type { Item, ItemId } from '@core/schema/current';
import type { InsightView } from '@core';
import { Icon } from '@ui/primitives/Icon';
import './RecommendStrip.css';

export interface RecommendStripProps {
  insight: InsightView;
  items: Record<ItemId, Item>;
  onStart: (id: ItemId) => void;
  onExplain: (id: ItemId) => void;
}

export function RecommendStrip({ insight, items, onStart, onExplain }: RecommendStripProps) {
  const recommendation = insight.recommendation;
  if (!recommendation) {
    return (
      <section className="recommend recommend--empty" aria-label={STRINGS.insight.recommend}>
        <span className="recommend__eyebrow">{STRINGS.insight.recommend}</span>
        <p className="recommend__empty-text">{STRINGS.insight.recommendEmpty}</p>
      </section>
    );
  }

  const item = items[recommendation.itemId];
  const estimate = insight.estimates[recommendation.itemId];
  const title = item?.title ?? '';
  const mvs = insight.mvs[recommendation.itemId];

  return (
    <section className="recommend" aria-label={STRINGS.insight.recommend}>
      <div className="recommend__head">
        <span className="recommend__eyebrow">
          <span className="recommend__pulse" aria-hidden="true" />
          {STRINGS.insight.recommend}
        </span>
        <button
          type="button"
          className="recommend__why"
          onClick={() => onExplain(recommendation.itemId)}
        >
          {STRINGS.card.why}
        </button>
      </div>

      <h2 className="recommend__title">{title || STRINGS.capture.untitled}</h2>

      {mvs ? <p className="recommend__mvs">{mvs.label}</p> : null}

      <div className="recommend__reasons">
        {recommendation.reasons.map((reason) => (
          <span key={reason.key} className="recommend__chip num">
            {STRINGS.engine.reason(reason.label, reason.percent)}
          </span>
        ))}
        {estimate ? (
          <span className="recommend__estimate num">
            {estimate.u >= 0.45
              ? STRINGS.card.uncertain(estimate.plannedMin, estimate.lo, estimate.hi)
              : STRINGS.card.corrected(estimate.plannedMin, estimate.correctedMin)}
          </span>
        ) : null}
        <span className="recommend__fit num">
          {estimate && estimate.cellN >= 3
            ? `${STRINGS.explain.probability} ${toPercent(recommendation.breakdown.probability.done)}%`
            : `${STRINGS.explain.probability} ${STRINGS.explain.unknown}`}
        </span>
      </div>

      <div className="recommend__actions">
        <button
          type="button"
          className="recommend__start"
          onClick={() => onStart(recommendation.itemId)}
        >
          <Icon name="clock" size={14} />
          {STRINGS.card.start}
        </button>
        <button type="button" className="recommend__why-inline" onClick={() => onExplain(recommendation.itemId)}>
          {STRINGS.explain.title}
        </button>
      </div>
    </section>
  );
}
