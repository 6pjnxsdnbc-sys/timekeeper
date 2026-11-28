/**
 * durationModel — M-E1 시간 보정 (설계서 4.3).
 *
 * 계획 시간 `t̂` 하나를 그대로 믿지 않는다. 그 분류에서 지금까지
 * "실제가 계획의 몇 배였는지"를 로그 비율로 모아 두고, 표본이 적으면
 * 전체 평균 쪽으로 당겨(축소) 과신하지 않는다.
 *
 * 화면에는 점 추정이 아니라 **구간**이 나간다. `u = σ̂` 가 크면
 * "30분"이라 단정하지 않고 "25~90분"이라 말한다 — 병목 A에 대한 정직한 답.
 */
import type { Estimate, Item, ModelState, TimeCell } from '../schema/current';
import { POLICY } from '../policy';
import { clamp, Z80 } from './math';

function roundTo(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

/**
 * 한 항목의 보정 추정. 같은 항목이라도 기록이 쌓이면 `u` 가 줄어든다 —
 * 불확실성은 저장하는 필드가 아니라 계산값이다(4.3).
 */
export function estimateItem(item: Item, model: ModelState): Estimate {
  const policy = POLICY.engine.time;
  const plannedMin = item.estimateMin > 0 ? item.estimateMin : 15;
  const cell = model.byContext[item.contextId];
  const source: TimeCell | undefined = cell ?? model.global;
  const nEff = source?.nEff ?? 0;
  const sigma = clamp(source?.sigmaLog ?? policy.priorSdLog, 0.05, policy.priorSdLog);
  const mu = source?.muLog ?? 0;

  // 표본이 없으면 보정하지 않는다 — 대신 구간이 넓다 (4.3 · 4.9).
  const factor =
    nEff < 0.5 ? 1 : clamp(Math.exp(mu + (sigma * sigma) / 2), policy.minFactor, policy.maxFactor);
  const correctedRaw = plannedMin * factor;
  const correctedMin = roundTo(
    clamp(correctedRaw, plannedMin * policy.minFactor, plannedMin * policy.maxFactor),
    policy.roundMin,
  );
  const lo = roundTo(
    clamp(plannedMin * Math.exp(mu - Z80 * sigma), plannedMin * policy.minFactor, 24 * 60),
    policy.roundMin,
  );
  const hi = roundTo(
    clamp(plannedMin * Math.exp(mu + Z80 * sigma), lo, plannedMin * policy.maxFactor * 2),
    policy.roundMin,
  );

  return {
    plannedMin,
    correctedMin,
    lo,
    hi,
    u: sigma,
    cellN: Math.round(nEff * 10) / 10,
    factor: Math.round(factor * 100) / 100,
  };
}

/** 추정을 말로 바꾸는 경계 — 카드가 숫자를 몇 개 보일지 결정한다 (4.3 표). */
export function estimateKind(estimate: Estimate): 'single' | 'range' | 'unknown' {
  if (estimate.u < 0.2) return 'single';
  if (estimate.u < 0.45) return 'range';
  return 'unknown';
}

/** 타이머를 안 켠 완료는 시간 관측이 아니다 — 그때 쓰는 대체값 (4.4). */
export function actualOrCorrected(item: Item, model: ModelState): number {
  if (typeof item.actualMin === 'number' && item.actualMin > 0) return item.actualMin;
  return estimateItem(item, model).correctedMin;
}
