/**
 * replay — 사실(EngineEvent)에서 ModelState 를 다시 계산한다 (설계서 4.2 · 4.10).
 *
 * 부팅 시 1회 전체 replay. 증분은 하지 않는다 — 이벤트 3년이 80ms 안이므로
 * "항상 같은 입력에서 같은 모델"이 더 값싸다(E1).
 *
 * 학습은 `actor === 'user'` 이벤트만 쓴다. 시스템 처리(rollover)는 섞지 않는다.
 */
import type { AppDataV1, EngineEvent, ItemKind, ModelState, TimeCell } from '../schema/current';
import { POLICY } from '../policy';
import { minutesOfDay } from '../rules/day';
import { clamp, weightedStats } from './math';

const AREA_BLOCKS = 4;
const AREA_CONTEXT_IDS = ['study', 'work', 'errand', 'workout'] as const;

interface Observation {
  cell: string;
  x: number;
  weight: number;
}

interface Attempt {
  date: string;
  itemId: string;
  kind: ItemKind;
  block: number;
}

function eventOrder(a: EngineEvent, b: EngineEvent): number {
  if (a.at !== b.at) return a.at < b.at ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function blockOf(minute: number, dayStartHour: number, blockHours: number): number {
  const offset = ((minute - dayStartHour * 60) % (24 * 60) + 24 * 60) % (24 * 60);
  return Math.min(AREA_BLOCKS - 1, Math.floor(offset / (blockHours * 60)));
}

function emptyCell(nEff = 0, muLog = 0, sigmaLog = POLICY.engine.time.priorSdLog): TimeCell {
  return { nEff, muLog, sigmaLog, interruptRate: 0.5 };
}

export function replay(data: AppDataV1): ModelState {
  const timePolicy = POLICY.engine.time;
  const blockHours = POLICY.engine.energy.blockHours;
  const dayStartHour = data.settings.dayStartHour ?? POLICY.dayStartHour;
  const events = Object.values(data.events).sort(eventOrder);
  const kindOf = (itemId: string): ItemKind => data.items[itemId]?.kind ?? 'task';

  const observations: Observation[] = [];
  const attempts = new Map<string, Attempt>();
  const successes = new Set<string>();
  const activeDays = new Set<string>();

  for (const event of events) {
    if (event.actor !== 'user') continue;
    activeDays.add(event.date);

    if (event.itemId === '-') continue;
    const key = `${event.date}:${event.itemId}`;
    const block = blockOf(minutesOfDay(event.at), dayStartHour, blockHours);

    if (event.type === 'start' || event.type === 'started') {
      if (!attempts.has(key)) {
        attempts.set(key, { date: event.date, itemId: event.itemId, kind: kindOf(event.itemId), block });
      }
    }

    if (event.type === 'complete') {
      const existing = attempts.get(key);
      if (!existing) {
        attempts.set(key, { date: event.date, itemId: event.itemId, kind: kindOf(event.itemId), block });
      }
      successes.add(key);
    }

    if (event.type === 'complete' || event.type === 'abandon') {
      const planned = event.plannedMin ?? 0;
      const actual = event.actualMin;
      // 3분 미만 세션은 착수 이벤트로만 쓰고 시간 보정에서 뺀다 (4.3 엣지).
      if (typeof actual === 'number' && actual >= 3 && planned > 0) {
        const ratio = clamp(actual / planned, timePolicy.minFactor, timePolicy.maxFactor);
        observations.push({
          cell: event.cell && event.cell.length > 0 ? event.cell : 'global',
          x: Math.log(ratio),
          weight: 1,
        });
      }
    }

    // 재보기 결과는 "작은 분산 관측" — 같은 무게로 세지 않는다 (4.3 · 4.10 표).
    if (event.type === 'explore') {
      const planned = event.plannedMin ?? 0;
      const revised = event.revisedMin;
      if (typeof revised === 'number' && revised > 0 && planned > 0) {
        const ratio = clamp(revised / planned, timePolicy.minFactor, timePolicy.maxFactor);
        observations.push({
          cell: event.cell && event.cell.length > 0 ? event.cell : 'global',
          x: Math.log(ratio),
          weight: 0.5,
        });
      }
    }
  }

  // ── 1) 시간 보정: 셀별 EWMA + 2단 축소 ────────────────
  const byCellValues = new ObservationCollector();
  for (const observation of observations) {
    byCellValues.push(observation.cell, observation);
  }

  const cellAggregate = new Map<string, { mean: number; variance: number; nEff: number }>();
  let allNEff = 0;
  let allWeightedSum = 0;
  for (const [cell, list] of byCellValues.entries()) {
    const stats = weightedStats(
      list.map((entry) => entry.x),
      timePolicy.ewmaAlpha,
      list.map((entry) => entry.weight),
    );
    cellAggregate.set(cell, stats);
    allNEff += stats.nEff;
    allWeightedSum += stats.nEff * stats.mean;
  }

  const kappa = timePolicy.priorStrength;
  const sigma0 = timePolicy.priorSdLog;
  const muAll = allNEff > 0 ? allWeightedSum / (kappa + allNEff) : 0;

  const byContext: Record<string, TimeCell> = {};
  for (const [cell, stats] of cellAggregate.entries()) {
    const mu = (kappa * muAll + stats.nEff * stats.mean) / (kappa + stats.nEff);
    const variance = (kappa * sigma0 * sigma0 + stats.nEff * stats.variance) / (kappa + stats.nEff);
    const sigma = clamp(Math.sqrt(Math.max(variance, 0.0025)), 0.05, sigma0);
    byContext[cell] = {
      nEff: stats.nEff,
      muLog: mu,
      sigmaLog: sigma,
      interruptRate: 0.5,
    };
  }

  // 중단율 — Beta(2+중단, 2+완료) 사후 평균. 화면 숫자 아님(4.3 4).
  const interruptionsByCell = new Map<string, { done: number; abandoned: number }>();
  for (const event of events) {
    if (event.actor !== 'user') continue;
    if (event.type !== 'complete' && event.type !== 'abandon') continue;
    const cell = event.cell && event.cell.length > 0 ? event.cell : 'global';
    const current = interruptionsByCell.get(cell) ?? { done: 0, abandoned: 0 };
    if (event.type === 'complete') current.done += 1;
    else current.abandoned += 1;
    interruptionsByCell.set(cell, current);
  }
  for (const [cell, counts] of interruptionsByCell.entries()) {
    const entry = byContext[cell];
    if (entry) entry.interruptRate = (2 + counts.abandoned) / (4 + counts.abandoned + counts.done);
  }

  const globalStats = weightedStats(
    observations.map((entry) => entry.x),
    timePolicy.ewmaAlpha,
    observations.map((entry) => entry.weight),
  );
  const globalVariance =
    (kappa * sigma0 * sigma0 + globalStats.nEff * globalStats.variance) /
    (kappa + globalStats.nEff);
  const global: TimeCell =
    observations.length === 0
      ? emptyCell()
      : {
          nEff: globalStats.nEff,
          muLog: muAll,
          sigmaLog: clamp(Math.sqrt(Math.max(globalVariance, 0.0025)), 0.05, sigma0),
          interruptRate:
            (2 + (interruptionsByCell.get('global')?.abandoned ?? 0)) /
            (4 +
              (interruptionsByCell.get('global')?.abandoned ?? 0) +
              (interruptionsByCell.get('global')?.done ?? 0)),
        };

  // ── 2) 집중 곡선: 4블록 Beta 사후 ─────────────────────
  const blockAttempts = new Array<number>(AREA_BLOCKS).fill(0);
  const blockSuccess = new Array<number>(AREA_BLOCKS).fill(0);
  for (const [key, attempt] of attempts.entries()) {
    const index = clamp(attempt.block, 0, AREA_BLOCKS - 1);
    blockAttempts[index] = (blockAttempts[index] ?? 0) + 1;
    if (successes.has(key)) blockSuccess[index] = (blockSuccess[index] ?? 0) + 1;
  }
  const blocks = blockAttempts.map(
    (count, index) => (POLICY.engine.energy.priorAlpha + (blockSuccess[index] ?? 0)) /
      (POLICY.engine.energy.priorAlpha +
        POLICY.engine.energy.priorBeta +
        count),
  );

  // ── 3) 착수 확률 P_start: kind 4셀 → 전체 축소 ───────
  const startGlobalAttempts = attempts.size;
  const startGlobalSuccess = successes.size;
  const globalStart =
    (POLICY.engine.start.priorAlpha + startGlobalSuccess) /
    (POLICY.engine.start.priorAlpha + POLICY.engine.start.priorBeta + startGlobalAttempts);

  const startByKind: Record<string, { p: number; n: number }> = {};
  const kinds: ItemKind[] = ['anchor', 'task', 'errand', 'workout'];
  for (const kind of kinds) {
    let n = 0;
    let success = 0;
    for (const [key, attempt] of attempts.entries()) {
      if (attempt.kind !== kind) continue;
      n += 1;
      if (successes.has(key)) success += 1;
    }
    const raw =
      (POLICY.engine.start.priorAlpha + success) /
      (POLICY.engine.start.priorAlpha + POLICY.engine.start.priorBeta + n);
    const shrunk =
      n === 0
        ? globalStart
        : (POLICY.engine.start.shrink * globalStart + n * raw) / (POLICY.engine.start.shrink + n);
    startByKind[kind] = { p: clamp(shrunk, 0.05, 0.95), n };
  }

  return {
    version: POLICY.engine.version,
    replayedEvents: Object.keys(data.events).length,
    global,
    byContext,
    energy: { blocks, days: activeDays.size },
    start: startByKind,
    calibration: { brier: 0, samples: 0 },
  };
}

/** Map 대신 쓰는 작은 수집기 — 배열 순서를 보존해 셀 계산이 결정적이다. */
class ObservationCollector {
  private readonly map = new Map<string, Observation[]>();

  push(cell: string, value: Observation): void {
    const list = this.map.get(cell);
    if (list) list.push(value);
    else this.map.set(cell, [value]);
  }

  entries(): IterableIterator<[string, Observation[]]> {
    return this.map.entries();
  }
}

/** 카드가 아닌 앵커도 학습 대상 셀을 갖는다 — 화면에는 쓰지 않는다. */
export const ENGINE_CELLS = AREA_CONTEXT_IDS;
