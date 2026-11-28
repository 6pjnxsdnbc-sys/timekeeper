/**
 * math — 엔진이 쓰는 수학 (설계서 4.10).
 *
 * 여기 있는 것은 전부 **순수 함수**다. 난수·시계·저장 없음(E1·E2).
 * 같은 입력이면 언제나 같은 답이 나와야 하므로, 근사식도 고정한다.
 */

export function clamp(value: number, lo: number, hi: number): number {
  if (!Number.isFinite(value)) return lo;
  return value < lo ? lo : value > hi ? hi : value;
}

/** 5분 단위 반올림 — 화면에 보이는 모든 시간은 이 함수를 지난다. */
export function round5(minutes: number, step = 5): number {
  if (!Number.isFinite(minutes)) return step;
  return Math.max(step, Math.round(minutes / step) * step);
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * 표준정규 누적분포 Φ. Abramowitz–Stegun 7.1.26 (오차 < 1.5e-7).
 * 라이브러리를 늘리지 않으려고 직접 둔다 — 결과는 결정적이다.
 */
export function normalCdf(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    t *
    (0.254829592 +
      t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-x * x);
  const signed = z < 0 ? -erf : erf;
  return clamp(0.5 * (1 + signed), 0, 1);
}

/** 표준정규의 80% 구간 계수 (양측 10%씩). */
export const Z80 = 1.2815515655446004;

export interface WeightedStats {
  mean: number;
  variance: number;
  nEff: number;
  count: number;
}

/**
 * 시간 가중 통계 (설계서 4.3 1단).
 * w_j = (1−α)^(n−j) · baseWeight
 * n_eff = S0² / Σ w²  (Kish 유효 표본 수)
 */
export function weightedStats(
  values: readonly number[],
  alpha: number,
  baseWeights?: readonly number[],
): WeightedStats {
  const n = values.length;
  if (n === 0) return { mean: 0, variance: 0, nEff: 0, count: 0 };

  const weights: number[] = [];
  for (let index = 0; index < n; index += 1) {
    const recency = Math.pow(1 - alpha, n - 1 - index);
    const base = baseWeights?.[index] ?? 1;
    weights.push(recency * base);
  }

  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  for (let index = 0; index < n; index += 1) {
    const w = weights[index] ?? 0;
    s0 += w;
    s1 += w * (values[index] ?? 0);
    s2 += w * w;
  }
  if (s0 <= 0 || s2 <= 0) return { mean: 0, variance: 0, nEff: 0, count: n };

  const mean = s1 / s0;
  let varianceSum = 0;
  for (let index = 0; index < n; index += 1) {
    const diff = (values[index] ?? 0) - mean;
    varianceSum += (weights[index] ?? 0) * diff * diff;
  }
  return {
    mean,
    variance: varianceSum / s0,
    nEff: (s0 * s0) / s2,
    count: n,
  };
}

/** FNV-1a 32bit — MVS 로테이션의 결정적 해시 (설계서 5.10). */
export function hash32(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** ISO 두 시각의 차이(분). 형식이 깨졌으면 null — 이상치는 로그만 남긴다. */
export function minutesBetween(from: string, to: string): number | null {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const minutes = (end - start) / 60_000;
  if (minutes < 0 || minutes > 24 * 60) return null;
  return minutes;
}

/** 0–1 비율을 정수 퍼센트로 — 화면 표시용(설계서 4.8 표시 규칙 1). */
export function toPercent(value: number): number {
  return Math.round(clamp(value, 0, 1) * 100);
}
