/**
 * ExplainSheet — "왜 이 카드?" (설계서 4.8).
 *
 * 내역은 **요청 시에만** 계산되어 여기 온다(E6). 총점은 크게 쓰지 않는다.
 * 각 줄: `+0.24 · 에너지 적합 82%`.
 */
import type { Estimate, Item } from '@core/schema/current';
import { STRINGS } from '@core';
import type { ScoreBreakdown } from '@core';
import { Overlay } from '@ui/primitives/Overlay';
import './ExplainSheet.css';

export interface ExplainSheetProps {
  open: boolean;
  item: Item | null;
  breakdown: ScoreBreakdown | null;
  estimate: Estimate | null;
  onClose: () => void;
}

export function ExplainSheet({ open, item, breakdown, estimate, onClose }: ExplainSheetProps) {
  const samples = estimate?.cellN ?? 0;
  const known = samples >= 3;

  return (
    <Overlay open={open} onClose={onClose} label={STRINGS.explain.title}>
      <div className="explain">
        <header className="explain__head">
          <h2 className="explain__title">{STRINGS.explain.title}</h2>
          <button type="button" className="explain__close" onClick={onClose} aria-label={STRINGS.explain.close}>
            ×
          </button>
        </header>

        <p className="explain__item">{item?.title ?? ''}</p>

        {breakdown ? (
          <ul className="explain__terms">
            {breakdown.terms.map((term) => (
              <li key={term.key} className="explain__row">
                <span className={`explain__value num${term.contribution < 0 ? ' explain__value--neg' : ''}`}>
                  {`${term.contribution >= 0 ? '+' : ''}${term.contribution.toFixed(2)}`}
                </span>
                <span className="explain__label">{term.label}</span>
                <span className="explain__bar" aria-hidden="true">
                  <span className="explain__fill" style={{ width: `${Math.round(term.value * 100)}%` }} />
                </span>
                <span className="explain__percent num">{`${Math.round(term.value * 100)}%`}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="explain__note">{STRINGS.explain.samples(0)}</p>
        )}

        <dl className="explain__facts">
          <div>
            <dt>{STRINGS.explain.estimate}</dt>
            <dd className="num">
              {estimate
                ? `${estimate.lo}~${estimate.hi}분`
                : STRINGS.explain.unknown}
            </dd>
          </div>
          <div>
            <dt>{STRINGS.explain.probability}</dt>
            <dd className="num">
              {known && breakdown
                ? `${Math.round(breakdown.probability.done * 100)}%`
                : STRINGS.explain.unknown}
            </dd>
          </div>
          <div>
            <dt>{STRINGS.explain.samples(samples)}</dt>
            <dd className="num">{estimate ? `u ${estimate.u.toFixed(2)}` : '—'}</dd>
          </div>
        </dl>

        <p className="explain__foot">{STRINGS.explain.note}</p>
      </div>
    </Overlay>
  );
}
