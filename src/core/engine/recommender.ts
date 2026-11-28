/**
 * recommender — M-E3 효용과 후보 선정 (설계서 4.5 · 4.6).
 *
 * 일곱 항을 모두 `[0,1]` 로 맞춘 뒤 가중합한다. 그래서 어떤 한 항도
 * 다른 항을 압도하지 못하고(최대 무게 .28), 총점은 항상 `[−0.03, 0.97]` 이다.
 *
 * 하드 제약은 "선호"가 아니라 "보장"이다 — 같은 분류 2장까지만, 남은 시간을 넘지 않게.
 */
import type {
  AppDataV1,
  Energy,
  Estimate,
  Item,
  LocalDate,
  ModelState,
} from '../schema/current';
import { POLICY } from '../policy';
import { STRINGS } from '../content/strings.ko';
import { INBOX_CONTEXT_ID } from '../data/contexts';
import { addDays } from '../rules/day';
import { clamp, normalCdf, round5 } from './math';
import { energyAt, fatigueAt, pFinish, recoveryDelta, requiredEnergy } from './energyModel';
import { estimateItem } from './durationModel';
import { gapAt, type TimelineView } from '../selectors/timeline';
import type { ReasonChip, Recommendation, ScoreBreakdown, ScoreTerm, Selection } from './types';

export type AreaKey = 'study' | 'errand' | 'workout';

export interface AreaMinutes {
  study: number;
  errand: number;
  workout: number;
}

export interface ScoreInput {
  data: AppDataV1;
  today: LocalDate;
  nowMinute: number;
  energy: Energy;
  model: ModelState;
  timeline: TimelineView;
  /** 최근 7일 영역별 완료 분 — 없으면 계산한다 */
  areas?: AreaMinutes;
}

const AREAS: readonly AreaKey[] = ['study', 'errand', 'workout'];
const AREA_TARGET: Record<AreaKey, number> = {
  study: POLICY.engine.utility.balanceTargets.study,
  errand: POLICY.engine.utility.balanceTargets.errand,
  workout: POLICY.engine.utility.balanceTargets.workout,
};

export function areaOf(item: Item): AreaKey {
  if (item.kind === 'workout' || item.contextId === 'workout') return 'workout';
  if (item.kind === 'errand' || item.contextId === 'errand') return 'errand';
  return 'study';
}

/** 최근 7일 완료 시간 — 3.9의 "하루가 아니라 7일 창" */
export function selectAreaMinutes(data: AppDataV1, today: LocalDate): AreaMinutes {
  const result: AreaMinutes = { study: 0, errand: 0, workout: 0 };
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(today, -offset);
    const snapshot = data.snapshots[date];
    for (const id of snapshot?.completed ?? []) {
      const item = data.items[id];
      if (!item || item.deletedAt) continue;
      const minutes = item.actualMin ?? item.estimateMin ?? 0;
      const area = areaOf(item);
      result[area] += minutes;
    }
  }
  return result;
}

function totalMinutes(areas: AreaMinutes): number {
  return AREAS.reduce((sum, key) => sum + areas[key], 0);
}

function tvDistance(areas: AreaMinutes): number {
  const total = totalMinutes(areas);
  if (total <= 0) {
    // 아무 기록도 없으면 어떤 영역도 목표에 닿지 않은 상태다.
    return 0.5 * AREAS.reduce((sum, key) => sum + AREA_TARGET[key], 0);
  }
  return (
    0.5 *
    AREAS.reduce((sum, key) => sum + Math.abs(areas[key] / total - AREA_TARGET[key]), 0)
  );
}

/** 균형 개선율 — 이미 맞으면 0, 이 항목이 비율을 목표 쪽으로 밀면 1에 가까워진다. */
export function balanceScore(areas: AreaMinutes, area: AreaKey, addedMinutes: number): number {
  const before = tvDistance(areas);
  const after = { ...areas };
  after[area] += Math.max(1, addedMinutes);
  const improved = before - tvDistance(after);
  return clamp(improved / Math.max(before, 0.01), 0, 1);
}

function daysUntil(today: LocalDate, due: LocalDate): number {
  const [ty, tm, td] = today.split('-').map(Number);
  const [dy, dm, dd] = due.split('-').map(Number);
  const a = Date.UTC(ty ?? 1970, (tm ?? 1) - 1, td ?? 1);
  const b = Date.UTC(dy ?? 1970, (dm ?? 1) - 1, dd ?? 1);
  return Math.round((b - a) / 86_400_000);
}

function urgency(item: Item, today: LocalDate): number {
  const lambda = POLICY.engine.utility.urgencyLambda;
  const due = item.kind === 'task' ? item.dueDate : undefined;
  let value = 0.15;
  if (due) {
    const days = daysUntil(today, due);
    value = days < 0 ? 1 : Math.exp(-lambda * days);
  }
  const priority = item.kind === 'task' ? item.priority : undefined;
  if (priority === 1) value = Math.min(1, value + 0.15);
  return clamp(value, 0, 1);
}

function energyFit(item: Item, nowMinute: number, input: ScoreInput): number {
  const current = energyAt(nowMinute, input.model, input.energy, input.data.settings.dayStartHour);
  const required = requiredEnergy(item.energy);
  const diff = current - required;
  return clamp(Math.exp(-(diff * diff) / (2 * 0.18 * 0.18)), 0, 1);
}

function timeFit(estimate: Estimate, gapMin: number): number {
  const gap = Math.max(1, gapMin);
  const sigma = Math.max(0.12, estimate.u);
  const z = (Math.log(gap) - Math.log(Math.max(5, estimate.correctedMin))) / sigma;
  return clamp(normalCdf(z), 0, 1);
}

function startProbability(item: Item, input: ScoreInput): number {
  const cell = input.model.start[item.kind];
  let value = cell?.p ?? 0.5;
  if (item.mvsLabel && item.mvsLabel.trim().length > 0) {
    value += POLICY.engine.start.mvsBonus;
  }
  if ((item.startedCount ?? 0) > 0 || item.startedAt) {
    value += POLICY.engine.start.restartBonus * (1 - value);
  }
  return clamp(value, 0, 1);
}

function lastActivity(input: ScoreInput): { contextId: string; endedAt: number } | null {
  let latest: { contextId: string; endedAt: number } | null = null;
  for (const block of input.timeline.blocks) {
    if (block.endMin > input.timeline.nowMin) continue;
    if (!latest || block.endMin > latest.endedAt) {
      latest = { contextId: block.contextId, endedAt: block.endMin };
    }
  }
  for (const item of Object.values(input.data.items)) {
    if (item.status !== 'doing' && item.status !== 'started') continue;
    if (latest && latest.endedAt >= input.timeline.nowMin) continue;
    latest = { contextId: item.contextId, endedAt: input.timeline.nowMin - 1 };
  }
  return latest;
}

function switchCost(item: Item, input: ScoreInput): number {
  const utility = POLICY.engine.utility;
  const last = lastActivity(input);
  if (!last) return 0;
  let raw = 0;
  if (last.contextId !== item.contextId) raw += utility.switchContext;
  if (item.kind === 'errand') raw += utility.switchPlace;
  if (input.timeline.nowMin - last.endedAt <= 10) raw += utility.switchReentry;
  return clamp(raw / (utility.switchContext + utility.switchPlace + utility.switchReentry), 0, 1);
}

function termLabel(key: ScoreTerm['key']): string {
  return STRINGS.engine.terms[key];
}

function buildTerms(item: Item, estimate: Estimate, gapMin: number, input: ScoreInput): ScoreTerm[] {
  const utility = POLICY.engine.utility;
  const areas = input.areas ?? selectAreaMinutes(input.data, input.today);
  const fatigue = fatigueAt(input.data, input.today, input.nowMinute);
  const currentEnergy = energyAt(
    input.nowMinute,
    input.model,
    input.energy,
    input.data.settings.dayStartHour,
  );
  const candidates = Object.values(input.data.items).filter(
    (candidate) =>
      !candidate.deletedAt &&
      candidate.id !== item.id &&
      (candidate.status === 'inbox' || candidate.status === 'planned' || candidate.status === 'doing'),
  ).length;

  const values: Record<ScoreTerm['key'], { value: number; weight: number }> = {
    urgency: { value: urgency(item, input.today), weight: utility.wUrgency },
    balance: { value: balanceScore(areas, areaOf(item), estimate.correctedMin), weight: utility.wBalance },
    energy: { value: energyFit(item, input.nowMinute, input), weight: utility.wEnergy },
    fit: { value: timeFit(estimate, gapMin), weight: utility.wFit },
    start: { value: startProbability(item, input), weight: utility.wStart },
    switch: { value: switchCost(item, input), weight: utility.wSwitch },
    recovery: {
      value: item.kind === 'workout' ? recoveryDelta(candidates, currentEnergy, fatigue) : 0,
      weight: utility.wRecovery,
    },
  };

  const order: ScoreTerm['key'][] = ['urgency', 'balance', 'energy', 'fit', 'start', 'switch', 'recovery'];
  return order.map((key) => {
    const entry = values[key];
    const contribution = key === 'switch' ? -entry.weight * entry.value : entry.weight * entry.value;
    return {
      key,
      label: termLabel(key),
      value: Math.round(entry.value * 100) / 100,
      weight: entry.weight,
      contribution: Math.round(contribution * 1000) / 1000,
    };
  });
}

/** 후보 1건의 점수와 내역 — 둘은 같은 함수에서 나온다(E3). */
export function scoreItem(item: Item, input: ScoreInput, slotMin?: number): ScoreBreakdown {
  const estimate = estimateItem(item, input.model);
  const minute = slotMin ?? input.nowMinute;
  const gap = gapAt(input.timeline, minute);
  const terms = buildTerms(item, estimate, gap, input);
  const total = Math.round(terms.reduce((sum, term) => sum + term.contribution, 0) * 1000) / 1000;
  const energyNow = energyAt(minute, input.model, input.energy, input.data.settings.dayStartHour);
  const fatigue = fatigueAt(input.data, input.today, minute);
  const start = startProbability(item, input);
  const finish = pFinish(energyNow, fatigue);
  const done = clamp(start * finish * timeFit(estimate, gap), 0, 1);

  const breakdown: ScoreBreakdown = {
    itemId: item.id,
    total,
    terms,
    estimate,
    probability: { start: Math.round(start * 100) / 100, done: Math.round(done * 100) / 100 },
    method: 'greedy',
    modelVersion: input.model.version,
  };
  if (slotMin !== undefined) breakdown.slotMin = slotMin;
  return breakdown;
}

export function candidatesOf(input: ScoreInput): Item[] {
  const candidates: Item[] = [];
  for (const entry of input.timeline.unplaced) {
    const item = entry.item;
    if (item.deletedAt) continue;
    if (item.status === 'done' || item.status === 'dropped') continue;
    candidates.push(item);
  }
  for (const block of input.timeline.blocks) {
    if (block.locked) continue;
    const item = input.data.items[block.itemId];
    if (!item || item.deletedAt || item.status === 'done') continue;
    if (!candidates.some((candidate) => candidate.id === item.id)) candidates.push(item);
  }
  return candidates.slice(0, POLICY.engine.utility.candidateCap);
}

/**
 * 오늘 카드 3장 — 개별 효용 정렬 + 그리디 + 하드 제약 (4.5).
 * 동점은 id 사전순이라 기기 간 결과가 같다.
 */
export function selectFocus(input: ScoreInput): Selection {
  const capacity = input.data.settings.maxFocusCards || POLICY.maxFocusCards;
  const items = candidatesOf(input);
  const breakdowns = items
    .map((item) => scoreItem(item, input))
    .sort((a, b) => (b.total === a.total ? (a.itemId < b.itemId ? -1 : 1) : b.total - a.total));

  const picks: ScoreBreakdown[] = [];
  const contextCount = new Map<string, number>();
  let usedMinutes = 0;

  for (const breakdown of breakdowns) {
    if (picks.length >= capacity) break;
    const item = input.data.items[breakdown.itemId];
    if (!item) continue;
    const context = item.contextId;
    const count = contextCount.get(context) ?? 0;
    if (count >= POLICY.engine.utility.maxSameContext) continue;
    const nextUsed = usedMinutes + breakdown.estimate.correctedMin;
    if (nextUsed > Math.max(15, input.timeline.freeFromNow)) continue;
    contextCount.set(context, count + 1);
    usedMinutes = nextUsed;
    picks.push(breakdown);
  }

  return { picks, breakdowns, method: 'greedy' };
}

/** 지금 가장 추천하는 한 장 + 이유 (4.8 표시 규칙: 요청 시에만 내역). */
export function recommendOne(input: ScoreInput): Recommendation | null {
  const items = candidatesOf(input);
  if (items.length === 0) return null;
  const scored = items
    .map((item) => scoreItem(item, input))
    .sort((a, b) => (b.total === a.total ? (a.itemId < b.itemId ? -1 : 1) : b.total - a.total));
  const top = scored[0];
  if (!top) return null;

  const positive = top.terms.filter((term) => term.contribution > 0);
  const sum = positive.reduce((total, term) => total + term.contribution, 0);
  const reasons: ReasonChip[] = positive
    .slice()
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((term) => ({
      key: term.key,
      label: term.label,
      percent: sum > 0 ? Math.round((term.contribution / sum) * 100) : 0,
    }));

  return { itemId: top.itemId, breakdown: top, reasons };
}

/** 주어진 빈 시간 안에 끝낼 확률 (4.6) */
export function pDone(item: Item, gapMin: number, input: ScoreInput): number {
  const estimate = estimateItem(item, input.model);
  const start = startProbability(item, input);
  const energyNow = energyAt(
    input.nowMinute,
    input.model,
    input.energy,
    input.data.settings.dayStartHour,
  );
  const fatigue = fatigueAt(input.data, input.today, input.nowMinute);
  return clamp(start * pFinish(energyNow, fatigue) * timeFit(estimate, gapMin), 0, 1);
}

/**
 * 확률 기반 분해 제안 (4.6). 데이터가 모자라면(`n_eff < 3`) 아무 말도 하지 않는다 —
 * 확률은 규칙보다 정확해질 때만 앞선다.
 */
export function suggestSplit(
  item: Item,
  maxGapMin: number,
  input: ScoreInput,
): { chunks: number; chunkMin: number; current: number; after: number } | null {
  const estimate = estimateItem(item, input.model);
  if (estimate.cellN < POLICY.engine.time.exploreMinSamples) return null;
  const current = pDone(item, maxGapMin, input);
  if (current >= POLICY.engine.completion.doneCutoff) return null;
  const chunkMin = Math.max(
    POLICY.engine.completion.minChunkMin,
    round5(estimate.correctedMin / Math.max(2, Math.ceil(estimate.correctedMin / POLICY.engine.completion.chunkMin))),
  );
  const chunks = Math.max(2, Math.ceil(estimate.correctedMin / chunkMin));
  const after = clamp(
    pDone(item, chunkMin, input) * 1.0,
    0,
    1,
  );
  if (after < POLICY.engine.completion.splitTarget) return null;
  return { chunks, chunkMin, current, after };
}

export function recommendationContext(
  data: AppDataV1,
  today: LocalDate,
  nowMinute: number,
  energy: Energy,
  model: ModelState,
  timeline: TimelineView,
): ScoreInput {
  return {
    data,
    today,
    nowMinute,
    energy,
    model,
    timeline,
    areas: selectAreaMinutes(data, today),
  };
}

export const AREA_LABELS: Record<AreaKey, string> = {
  study: STRINGS.insight.areaStudy,
  errand: STRINGS.insight.areaErrand,
  workout: STRINGS.insight.areaWorkout,
};

export const INBOX_ID = INBOX_CONTEXT_ID;
