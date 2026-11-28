/**
 * selectInsight — 엔진·규칙·항목을 화면 데이터로 묶는다 (설계서 3.8 · 4.10).
 *
 * 화면은 점수를 저장하지 않고, 그릴 때마다 여기서 다시 계산한다(D2).
 * 파생값은 전부 순수 함수의 출력이다 — 같은 입력이면 같은 화면.
 */
import type {
  AppDataV1,
  Energy,
  Estimate,
  Item,
  ItemId,
  LocalDate,
  ModelState,
} from '../schema/current';
import { composeMvs } from '../data/mvs';
import { POLICY } from '../policy';
import { daysBetween } from '../rules/day';
import { replay } from '../engine/replay';
import { estimateItem } from '../engine/durationModel';
import { blockIndex, energyAt, focusCurve } from '../engine/energyModel';
import { recommendOne, recommendationContext, selectFocus, type AreaMinutes, selectAreaMinutes } from '../engine/recommender';
import { selectStats, type StatsView } from '../engine/statsModel';
import type { Recommendation, ScoreBreakdown, Selection } from '../engine/types';
import { selectTimeline, type TimelineView } from './timeline';
import { autoMvsFor, currentEnergy, shouldOfferProbe } from '../rules/adhd';

export interface MvsView {
  label: string;
  targetMin: number;
  /** 사용자가 고친 문구인지 — 화면은 "다시 받기"를 이때만 보여준다 */
  edited: boolean;
}

export interface WorkoutView {
  item: Item | null;
  plan: 'full' | 'planB';
  minutes: number;
  doneMinutes: number | null;
  intensity: 'full' | 'reduced' | 'minimum' | 'skipped';
}

export interface InsightView {
  model: ModelState;
  timeline: TimelineView;
  selection: Selection;
  recommendation: Recommendation | null;
  estimates: Record<ItemId, Estimate>;
  scores: Record<ItemId, ScoreBreakdown>;
  stats: StatsView;
  areas: AreaMinutes;
  energy: {
    level: Energy;
    curve: number[];
    now: number;
    blockIndex: number;
  };
  probeOffers: ItemId[];
  mvs: Record<ItemId, MvsView>;
  workout: WorkoutView;
}

function workoutView(data: AppDataV1, today: LocalDate, model: ModelState): WorkoutView {
  const open = Object.values(data.items).find(
    (item) => item.kind === 'workout' && !item.deletedAt && item.status !== 'done' && item.status !== 'dropped',
  );
  const done = Object.values(data.items).find(
    (item) =>
      item.kind === 'workout' &&
      !item.deletedAt &&
      item.status === 'done' &&
      (item.completedAt ?? '').slice(0, 10) >= today,
  );
  const snapshot = data.snapshots[today]?.workout;
  const item = open ?? done ?? null;
  if (!item) {
    return {
      item: null,
      plan: 'planB',
      minutes: POLICY.workoutMinimum.minutes,
      doneMinutes: snapshot && snapshot.intensity !== 'skipped' ? snapshot.minutes : null,
      intensity: snapshot?.intensity ?? 'skipped',
    };
  }
  if (item.kind !== 'workout') {
    return {
      item,
      plan: 'planB',
      minutes: POLICY.workoutMinimum.minutes,
      doneMinutes: null,
      intensity: 'skipped',
    };
  }
  const full = Math.max(20, item.plannedMinutes);
  const plan = item.intensity === 'full' ? 'full' : 'planB';
  return {
    item,
    plan,
    minutes: Math.max(5, Math.round(estimateItem(item, model).correctedMin)),
    doneMinutes:
      snapshot && snapshot.intensity !== 'skipped'
        ? snapshot.minutes
        : item.status === 'done'
          ? (item.actualMin ?? full)
          : null,
    intensity: item.intensity,
  };
}

export function selectInsight(
  data: AppDataV1,
  today: LocalDate,
  nowMinute: number,
  energyLevel?: Energy,
): InsightView {
  const model = replay(data);
  const level = energyLevel ?? currentEnergy(data, today);
  const timeline = selectTimeline(data, today, nowMinute, model);
  const areas = selectAreaMinutes(data, today);
  const input = { ...recommendationContext(data, today, nowMinute, level, model, timeline), areas };
  const selection = selectFocus(input);
  const recommendation = recommendOne(input);
  const stats = selectStats(data, today);

  const estimates: Record<ItemId, Estimate> = {};
  const scores: Record<ItemId, ScoreBreakdown> = {};
  for (const item of Object.values(data.items)) {
    if (item.deletedAt) continue;
    estimates[item.id] = estimateItem(item, model);
  }
  for (const breakdown of selection.breakdowns) scores[breakdown.itemId] = breakdown;

  // MVS — 같은 보드에서 같은 문장이 겹치지 않게 (5.10 로테이션 규칙)
  const mvs: Record<ItemId, MvsView> = {};
  const boardTitles: string[] = [];
  const dayIndex = Math.abs(daysBetween('2020-01-01' as LocalDate, today));
  const boardIds = (data.snapshots[today]?.focusPicks ?? []).map((pick) => pick.itemId);
  const ordered: Item[] = [];
  for (const id of [
    ...selection.picks.map((pick) => pick.itemId),
    ...boardIds,
    ...timeline.unplaced.map((entry) => entry.item.id),
    ...timeline.blocks.filter((block) => !block.locked).map((block) => block.itemId),
  ]) {
    const item = data.items[id];
    if (item && !ordered.some((entry) => entry.id === item.id)) ordered.push(item);
  }
  for (const item of ordered) {
    if (item.kind === 'anchor' || item.deletedAt || item.status === 'done') continue;
    if (mvs[item.id]) continue;
    const estimate = estimates[item.id] ?? estimateItem(item, model);
    if (item.mvsLabel && item.mvsAcceptedAt) {
      mvs[item.id] = { label: item.mvsLabel, targetMin: item.mvsTargetMin ?? 7, edited: true };
      boardTitles.push(item.mvsLabel);
      continue;
    }
    if (!autoMvsFor(item, estimate, level)) continue;
    const composed = composeMvs(item, dayIndex, boardTitles);
    mvs[item.id] = { label: composed.label, targetMin: composed.targetMin, edited: false };
    boardTitles.push(composed.label);
  }

  const probeOffers: ItemId[] = Object.values(data.items)
    .filter((item) => !item.deletedAt && item.status !== 'done')
    .filter((item) => shouldOfferProbe(item, estimates[item.id] ?? estimateItem(item, model), today))
    .map((item) => item.id);

  const curve = focusCurve(model, level);

  return {
    model,
    timeline,
    selection,
    recommendation,
    estimates,
    scores,
    stats,
    areas,
    energy: {
      level,
      curve,
      now: energyAt(nowMinute, model, level, data.settings.dayStartHour),
      blockIndex: blockIndex(nowMinute, data.settings.dayStartHour),
    },
    probeOffers,
    mvs,
    workout: workoutView(data, today, model),
  };
}
