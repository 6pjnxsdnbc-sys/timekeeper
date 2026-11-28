/**
 * InsightsPanel — 오른쪽 "지금" 패널 (설계서 5.7 ③).
 *
 * 집중 곡선 · 남은 시간 · 7일 균형 · 추정 정확도 · 운동(플랜 B).
 * 숫자는 전부 지금 다시 계산한 파생값이다 — 저장하지 않는다(D2).
 */
import type { CSSProperties } from 'react';
import { STRINGS, type InsightView } from '@core';
import { Icon } from '@ui/primitives/Icon';
import './InsightsPanel.css';

export interface InsightsPanelProps {
  insight: InsightView;
  onWorkoutPlan: (plan: 'full' | 'planB') => void;
  onWorkoutDone: () => void;
  onWorkoutStart: () => void;
}

const BLOCK_LABELS = ['04', '10', '16', '22'];

export function InsightsPanel({
  insight,
  onWorkoutPlan,
  onWorkoutDone,
  onWorkoutStart,
}: InsightsPanelProps) {
  const { stats, energy, timeline, workout } = insight;
  const humanize = (minutes: number) =>
    minutes >= 60
      ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`
      : `${minutes}분`;
  const freeHours = humanize(timeline.freeFromNow);
  const totalAreaMinutes = Math.max(1, stats.totalMinutes);

  return (
    <div className="insight">
      <section className="insight__card" aria-label={STRINGS.insight.nowPanel}>
        <header className="insight__head">
          <h2 className="insight__title">{STRINGS.insight.nowPanel}</h2>
          <span className="insight__meta num">{`${STRINGS.timeline.density} ${Math.round(timeline.density * 100)}%`}</span>
        </header>

        <div className="insight__energy" aria-hidden="true">
          {energy.curve.map((value, index) => (
            <div
              key={index}
              className="insight__bar"
              data-active={index === energy.blockIndex}
              style={{ '--level': `${Math.round(value * 100)}%` } as CSSProperties}
            >
              <span className="insight__bar-fill" />
              <span className="insight__bar-label num">{BLOCK_LABELS[index]}</span>
            </div>
          ))}
        </div>

        <dl className="insight__facts">
          <div className="insight__fact">
            <dt>{STRINGS.timeline.labelFree}</dt>
            <dd className="num">{freeHours}</dd>
          </div>
          <div className="insight__fact">
            <dt>{STRINGS.timeline.labelNext}</dt>
            <dd className="num">{humanize(timeline.untilNextBlock)}</dd>
          </div>
        </dl>
      </section>

      <section className="insight__card" aria-label={STRINGS.insight.balance}>
        <header className="insight__head">
          <h2 className="insight__title">{STRINGS.insight.balance}</h2>
          <span className="insight__meta num">{STRINGS.insight.samples(stats.completedCount)}</span>
        </header>

        <div className="balance" aria-hidden="true">
          {stats.areas.map((area) => (
            <span
              key={area.key}
              className="balance__seg"
              data-area={area.key}
              style={{ width: `${Math.round((area.minutes / totalAreaMinutes) * 100)}%` }}
            />
          ))}
          {stats.totalMinutes === 0 ? <span className="balance__empty" /> : null}
        </div>

        <ul className="insight__rows">
          {stats.areas.map((area) => (
            <li key={area.key} className="insight__row">
              <span className="insight__dot" data-area={area.key} aria-hidden="true" />
              <span className="insight__row-label">{area.label}</span>
              <span className="insight__row-target num">
                {STRINGS.insight.target(Math.round(area.target * 100))}
              </span>
              <span className="insight__row-value num">
                {area.minutes > 0 ? `${area.minutes}분` : '—'}
              </span>
            </li>
          ))}
        </ul>

        <p className="insight__note">
          {STRINGS.insight.accuracy}
          {' · '}
          <span className="num">{stats.accuracy.label}</span>
          {stats.accuracy.samples > 0 ? (
            <span className="insight__meta num">{` (${STRINGS.insight.samples(stats.accuracy.samples)})`}</span>
          ) : null}
        </p>
      </section>

      <section className="insight__card insight__card--workout" aria-label={STRINGS.workout.title}>
        <header className="insight__head">
          <h2 className="insight__title">{STRINGS.workout.title}</h2>
          <span className="insight__meta num">
            {workout.doneMinutes ? STRINGS.workout.doneStatus(workout.doneMinutes) : STRINGS.workout.skipped}
          </span>
        </header>

        <p className="workout__title">{workout.item?.title ?? STRINGS.workout.defaultTitle}</p>

        <div className="workout__switch" role="group" aria-label={STRINGS.workout.goal}>
          <button
            type="button"
            className="workout__opt"
            aria-pressed={workout.plan === 'full'}
            onClick={() => onWorkoutPlan('full')}
          >
            {STRINGS.workout.planA(40)}
          </button>
          <button
            type="button"
            className="workout__opt"
            aria-pressed={workout.plan === 'planB'}
            onClick={() => onWorkoutPlan('planB')}
          >
            {STRINGS.workout.planB}
          </button>
        </div>

        <p className="workout__hint">{STRINGS.workout.hint}</p>

        <div className="workout__actions">
          <button type="button" className="workout__start" onClick={onWorkoutStart}>
            <Icon name="clock" size={13} />
            {STRINGS.card.start}
          </button>
          <button type="button" className="workout__done" onClick={onWorkoutDone}>
            <Icon name="check" size={13} />
            {STRINGS.workout.done}
          </button>
        </div>
      </section>
    </div>
  );
}
