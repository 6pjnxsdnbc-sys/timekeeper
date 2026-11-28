/**
 * energyModel — M-E2 일중 에너지·피로도 (설계서 4.4).
 *
 * 두 상태만 둔다: **집중 곡선 E(t)**(하루 주기, 4블록)와 **피로 F**(누적·회복).
 * v1은 수면을 측정하지 않으므로 04:00 하루 경계에서 F를 0으로 리셋한다.
 * 측정하지 않는 변수로 수식을 세우지 않는다.
 */
import type { AppDataV1, Energy, EngineEvent, LocalDate, ModelState } from '../schema/current';
import { POLICY } from '../policy';
import { minutesOfDay } from '../rules/day';
import { clamp, sigmoid } from './math';

export const BLOCK_COUNT = 4;

/** 자기보고 스위치의 값 — 학습 0일에는 곡선 대신 이 값이 그대로 쓰인다. */
export function switchValue(level: Energy): number {
  switch (level) {
    case 'high':
      return 0.75;
    case 'low':
      return 0.35;
    default:
      return 0.55;
  }
}

function switchBias(level: Energy): number {
  switch (level) {
    case 'high':
      return 0.15;
    case 'low':
      return -0.15;
    default:
      return 0;
  }
}

/** 블록 경계 = 04:00 부터 6시간씩: 04–10 · 10–16 · 16–22 · 22–04 */
export function blockIndex(minute: number, dayStartHour: number): number {
  const offset = ((minute - dayStartHour * 60) % (24 * 60) + 24 * 60) % (24 * 60);
  return clamp(Math.floor(offset / (POLICY.engine.energy.blockHours * 60)), 0, BLOCK_COUNT - 1);
}

/**
 * E(t) 곡선. 학습일이 3일 미만이면 스위치 값을 그대로 쓴다(콜드 스타트).
 * 그 뒤에는 블록 Beta 사후 평균에 스위치를 **사전을 미는 관측**으로만 더한다(±0.15).
 */
export function focusCurve(model: ModelState, level: Energy): number[] {
  if (model.energy.days < 3) {
    return new Array(BLOCK_COUNT).fill(switchValue(level));
  }
  const bias = switchBias(level);
  return model.energy.blocks.map((value) => clamp(value + bias, 0.05, 1));
}

export function energyAt(minute: number, model: ModelState, level: Energy, dayStartHour: number): number {
  const curve = focusCurve(model, level);
  return curve[blockIndex(minute, dayStartHour)] ?? switchValue(level);
}

/** 요구 에너지의 기준점 — 상 .85 / 중 .60 / 하 .35 */
export function requiredEnergy(level: Energy): number {
  switch (level) {
    case 'high':
      return 0.85;
    case 'low':
      return 0.35;
    default:
      return 0.6;
  }
}

function fatigueLoad(minutes: number, difficulty: number | undefined): number {
  const level = difficulty ?? 2;
  return (level / 3) * (minutes / 60);
}

/**
 * 지금의 피로 F. 오늘 이벤트를 하루 경계부터 순서대로 훑는다.
 * 숫자는 화면에 쓰지 않는다 — 완료 확률과 운동 회복 항의 입력일 뿐이다(A1 · 4.4).
 */
export function fatigueAt(data: AppDataV1, today: LocalDate, nowMinute: number): number {
  const policy = POLICY.engine.energy;
  const dayStartHour = data.settings.dayStartHour ?? POLICY.dayStartHour;
  const dayStartMin = dayStartHour * 60;
  const now = nowMinute < dayStartMin ? nowMinute + 24 * 60 : nowMinute;

  const events = Object.values(data.events)
    .filter((event) => event.date === today && event.actor === 'user')
    .filter((event) => event.type === 'complete' || event.type === 'abandon')
    .sort((a: EngineEvent, b: EngineEvent) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

  let fatigue = 0;
  let cursor = dayStartMin;
  for (const event of events) {
    const raw = minutesOfDay(event.at);
    const minute = raw < dayStartMin ? raw + 24 * 60 : raw;
    if (minute < cursor) continue;
    fatigue *= Math.exp(-(minute - cursor) / policy.restTauMin);

    const item = event.itemId === '-' ? undefined : data.items[event.itemId];
    const minutes = event.actualMin ?? event.plannedMin ?? 0;
    fatigue += policy.fatiguePerHour * fatigueLoad(minutes, item?.difficulty);
    if (item?.kind === 'workout') fatigue *= 1 - policy.exerciseRecovery;
    cursor = minute;
  }

  fatigue *= Math.exp(-Math.max(0, now - cursor) / policy.restTauMin);
  return clamp(fatigue, 0, 1);
}

/** P_finish|start — 세션 구간의 E 평균과 F 평균으로 (4.4 (3)). */
export function pFinish(energyMean: number, fatigue: number): number {
  return clamp(sigmoid(1.1 + 2.0 * energyMean - 1.6 * fatigue), 0.02, 0.98);
}

/**
 * 운동의 회복 효용 ΔU_recovery ∈ [0,1] (4.4 (4)).
 * "운동 한 번이 하루를 지배"하지 못하게 **평균 + 상한**이다.
 */
export function recoveryDelta(candidates: number, energyMean: number, fatigue: number): number {
  const scale = POLICY.engine.recovery.scale;
  if (candidates <= 0) return 0;
  const after = pFinish(energyMean, fatigue * (1 - POLICY.engine.energy.exerciseRecovery));
  const before = pFinish(energyMean, fatigue);
  const raw = Math.max(0, after - before);
  return clamp(raw / scale, 0, 1);
}
