/**
 * engine/types — 화면이 받는 계산 결과의 모양 (설계서 4.8).
 *
 * 점수와 내역은 **같은 함수**에서 나온다(E3). 따로 재계산하지 않는다.
 */
import type { Estimate, ItemId, Minutes } from '../schema/current';

export type ScoreTermKey =
  | 'urgency'
  | 'balance'
  | 'energy'
  | 'fit'
  | 'start'
  | 'switch'
  | 'recovery';

export interface ScoreTerm {
  key: ScoreTermKey;
  label: string;
  /** 0–1 정규화 값. switch 만 클수록 나쁘다. */
  value: number;
  weight: number;
  /** weight × value — switch 는 음수 */
  contribution: number;
}

export interface ScoreBreakdown {
  itemId: ItemId;
  slotMin?: Minutes;
  /** −0.03 – 0.97 */
  total: number;
  terms: ScoreTerm[];
  estimate: Estimate;
  probability: { start: number; done: number };
  method: 'greedy';
  modelVersion: string;
}

export interface ReasonChip {
  key: ScoreTermKey;
  label: string;
  /** 기여 몫 (%) — 화면에는 `에너지 적합 +32%` 처럼 쓴다 */
  percent: number;
}

export interface Recommendation {
  itemId: ItemId;
  breakdown: ScoreBreakdown;
  reasons: ReasonChip[];
}

export interface Selection {
  picks: ScoreBreakdown[];
  breakdowns: ScoreBreakdown[];
  method: 'greedy';
}
