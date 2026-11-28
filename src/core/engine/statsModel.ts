/**
 * statsModel — 7일 영역 균형과 완료 통계 (설계서 3.9 · 4.12).
 *
 * 화면에는 비율과 시간만 나간다. 점수·등급·연속일수 같은 압박은 없다(P4 · E6).
 * 7일 창을 쓰는 이유: 하루 단위로 맞추면 "오늘 운동 안 했으니 공부를 빼자"가 된다.
 */
import type { AppDataV1, LocalDate } from '../schema/current';
import { POLICY } from '../policy';
import { STRINGS } from '../content/strings.ko';
import { addDays } from '../rules/day';
import type { AreaKey } from './recommender';
import { areaOf, selectAreaMinutes, type AreaMinutes } from './recommender';

export interface AreaStat {
  key: AreaKey;
  label: string;
  minutes: number;
  ratio: number;
  target: number;
}

export interface DayStat {
  date: LocalDate;
  minutes: number;
  completed: number;
}

export interface AccuracyStat {
  samples: number;
  /** 실제/계획의 평균 배율 — 표본이 없으면 null */
  ratio: number | null;
  mape: number | null;
  label: string;
}

export interface StatsView {
  areas: AreaStat[];
  totalMinutes: number;
  completedCount: number;
  accuracy: AccuracyStat;
  days: DayStat[];
  /** 오늘 운동 — 없으면 null */
  workout: { minutes: number; intensity: 'full' | 'reduced' | 'minimum' | 'skipped' } | null;
}

const AREA_KEYS: readonly AreaKey[] = ['study', 'errand', 'workout'];

function accuracyOf(data: AppDataV1, today: LocalDate): AccuracyStat {
  const ratios: number[] = [];
  const errors: number[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(today, -offset);
    for (const event of Object.values(data.events)) {
      if (event.date !== date) continue;
      if (event.actor !== 'user') continue;
      if (event.type !== 'complete' && event.type !== 'abandon') continue;
      const planned = event.plannedMin ?? 0;
      const actual = event.actualMin;
      if (!actual || actual < 3 || planned <= 0) continue;
      ratios.push(actual / planned);
      errors.push(Math.abs(planned - actual) / actual);
    }
  }
  if (ratios.length === 0) {
    return { samples: 0, ratio: null, mape: null, label: STRINGS.insight.accuracyUnknown };
  }
  const ratio = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
  const mape = errors.reduce((sum, value) => sum + value, 0) / errors.length;
  const rounded = Math.round(ratio * 10) / 10;
  return {
    samples: ratios.length,
    ratio: Math.round(ratio * 100) / 100,
    mape: Math.round(mape * 100) / 100,
    label:
      rounded >= 1.15
        ? STRINGS.insight.accuracySlower(rounded)
        : rounded <= 0.85
          ? STRINGS.insight.accuracyFaster(Math.round((1 / Math.max(0.1, rounded)) * 10) / 10)
          : STRINGS.insight.accuracyClose,
  };
}

export function selectStats(data: AppDataV1, today: LocalDate): StatsView {
  const minutes: AreaMinutes = selectAreaMinutes(data, today);
  const total = AREA_KEYS.reduce((sum, key) => sum + minutes[key], 0);

  const areas: AreaStat[] = AREA_KEYS.map((key) => ({
    key,
    label: STRINGS.insight.areas[key],
    minutes: minutes[key],
    ratio: total > 0 ? Math.round((minutes[key] / total) * 100) / 100 : 0,
    target: POLICY.engine.utility.balanceTargets[key],
  }));

  let completedCount = 0;
  const days: DayStat[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset);
    const snapshot = data.snapshots[date];
    const completed = (snapshot?.completed ?? []).filter((id) => {
      const item = data.items[id];
      return item && !item.deletedAt;
    });
    completedCount += completed.length;
    const minutesOnDay = completed.reduce((sum, id) => {
      const item = data.items[id];
      return sum + (item?.actualMin ?? item?.estimateMin ?? 0);
    }, 0);
    days.push({ date, minutes: minutesOnDay, completed: completed.length });
  }

  const workout = data.snapshots[today]?.workout ?? null;

  return {
    areas,
    totalMinutes: total,
    completedCount,
    accuracy: accuracyOf(data, today),
    days,
    workout: workout ? { minutes: workout.minutes, intensity: workout.intensity } : null,
  };
}

/** 영역 계산의 단일 출처 — 화면이 직접 세지 않게 (파생값 비저장). */
export { areaOf };
