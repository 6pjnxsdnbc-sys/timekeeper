/**
 * factory — 기본값 생성 (설계서 10.1: 타입 계약은 v1.ts, 기본값은 여기).
 * UI 문구 없음, 로직 없음, 시계 없음 — `id`·`now` 는 주입받는다.
 */
import type {
  AnchorItem,
  AppDataV1,
  DailySnapshot,
  Difficulty,
  Energy,
  EngineEvent,
  ErrandItem,
  Instant,
  Item,
  ItemBase,
  ItemKind,
  ItemStatus,
  LocalDate,
  Settings,
  TaskItem,
  WorkoutItem,
} from './current';
import { SCHEMA_VERSION } from './current';
import { defaultContextMap, INBOX_CONTEXT_ID } from '../data/contexts';
import { findRoutine } from '../data/routines';
import { POLICY } from '../policy';

export interface FactoryDeps {
  id: () => string;
  now: () => Instant;
}

/** M1: 애매하면 묻지 않고 15분으로 저장한다. */
export const DEFAULT_ESTIMATE_MIN = 15;

export function roundEstimateMin(
  min: number,
  step: number = POLICY.engine.time.roundMin,
): number {
  const safe = Number.isFinite(min) ? min : DEFAULT_ESTIMATE_MIN;
  const clamped = Math.min(Math.max(safe, step), 24 * 60);
  return Math.round(clamped / step) * step;
}

interface NewItemCommon {
  title: string;
  contextId?: string;
  energy?: Energy;
  estimateMin?: number;
  goalId?: string;
  note?: string;
  status?: ItemStatus;
  difficulty?: Difficulty;
  firstOfKind?: boolean;
}

export type NewItemInput =
  | (NewItemCommon & {
      kind: 'anchor';
      startAt: Instant;
      endAt: Instant;
      rigidity?: AnchorItem['rigidity'];
      location?: string;
      allDay?: boolean;
    })
  | (NewItemCommon & {
      kind: 'task';
      dueDate?: LocalDate;
      priority?: TaskItem['priority'];
    })
  | (NewItemCommon & {
      kind: 'errand';
      place?: string;
      batchKey?: string;
      window?: ErrandItem['window'];
    })
  | (NewItemCommon & {
      kind: 'workout';
      routineId: string;
      plannedMinutes?: number;
      intensity?: WorkoutItem['intensity'];
    });

interface KindDefaults {
  energy: Energy;
  estimateMin: number;
  status: ItemStatus;
}

function defaultsForKind(kind: ItemKind): KindDefaults {
  switch (kind) {
    case 'anchor':
      // 고정 일정은 이미 정해진 시간이 있으므로 '계획됨'이다.
      return { energy: 'mid', estimateMin: 60, status: 'planned' };
    case 'workout':
      return { energy: 'mid', estimateMin: 30, status: 'planned' };
    case 'errand':
      return { energy: 'low', estimateMin: 20, status: 'inbox' };
    case 'task':
      return { energy: 'mid', estimateMin: DEFAULT_ESTIMATE_MIN, status: 'inbox' };
  }
}

function buildBase(
  input: NewItemCommon,
  kind: ItemKind,
  deps: FactoryDeps,
  estimateMin?: number,
): ItemBase {
  const now = deps.now();
  const defaults = defaultsForKind(kind);
  return {
    id: deps.id(),
    kind,
    title: input.title,
    ...(input.note === undefined ? {} : { note: input.note }),
    contextId: input.contextId ?? INBOX_CONTEXT_ID,
    ...(input.goalId === undefined ? {} : { goalId: input.goalId }),
    energy: input.energy ?? defaults.energy,
    estimateMin: roundEstimateMin(estimateMin ?? input.estimateMin ?? defaults.estimateMin),
    status: input.status ?? defaults.status,
    createdAt: now,
    updatedAt: now,
    ...(input.difficulty === undefined ? {} : { difficulty: input.difficulty }),
    ...(input.firstOfKind === undefined ? {} : { firstOfKind: input.firstOfKind }),
  };
}

export function createItem(input: NewItemInput, deps: FactoryDeps): Item {
  switch (input.kind) {
    case 'anchor': {
      const minutes = estimateFromRange(input.startAt, input.endAt);
      const item: AnchorItem = {
        ...buildBase(input, 'anchor', deps, minutes),
        kind: 'anchor',
        startAt: input.startAt,
        endAt: input.endAt,
        rigidity: input.rigidity ?? 'soft',
        ...(input.location === undefined ? {} : { location: input.location }),
        ...(input.allDay === undefined ? {} : { allDay: input.allDay }),
      };
      return item;
    }
    case 'task': {
      const item: TaskItem = {
        ...buildBase(input, 'task', deps),
        kind: 'task',
        priority: input.priority ?? 2,
        ...(input.dueDate === undefined ? {} : { dueDate: input.dueDate }),
      };
      return item;
    }
    case 'errand': {
      const item: ErrandItem = {
        ...buildBase(input, 'errand', deps),
        kind: 'errand',
        window: input.window ?? 'any',
        ...(input.place === undefined ? {} : { place: input.place }),
        ...(input.batchKey === undefined ? {} : { batchKey: input.batchKey }),
      };
      return item;
    }
    case 'workout': {
      const routine = findRoutine(input.routineId);
      const item: WorkoutItem = {
        ...buildBase(input, 'workout', deps, input.plannedMinutes ?? routine?.reducedMinutes),
        kind: 'workout',
        routineId: input.routineId,
        plannedMinutes: input.plannedMinutes ?? routine?.reducedMinutes ?? 20,
        intensity: input.intensity ?? 'reduced',
      };
      return item;
    }
  }
}

/** 앵커의 소요는 시작·끝에서 계산한다. 형식이 깨져 있으면 기본값으로 저장한다. */
function estimateFromRange(startAt: Instant, endAt: Instant): number | undefined {
  const start = Date.parse(startAt);
  const end = Date.parse(endAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;
  return (end - start) / 60_000;
}

export interface NewSettingsInput {
  deviceId: string;
  timezone?: string;
  theme?: Settings['theme'];
  /** 기본값을 명시적으로 덮어쓸 때만 쓴다 (설정 화면은 F5). */
  overrides?: Partial<
    Pick<Settings, 'dayStartHour' | 'weekStart' | 'maxFocusCards' | 'onboardingDone'>
  >;
}

export function createSettings(input: NewSettingsInput): Settings {
  return {
    schemaVersion: SCHEMA_VERSION,
    deviceId: input.deviceId,
    timezone: input.timezone ?? 'Asia/Seoul',
    theme: input.theme ?? 'system',
    dayStartHour: input.overrides?.dayStartHour ?? POLICY.dayStartHour,
    weekStart: input.overrides?.weekStart ?? 1,
    maxFocusCards: input.overrides?.maxFocusCards ?? POLICY.maxFocusCards,
    sync: { provider: 'none' },
    onboardingDone: input.overrides?.onboardingDone ?? false,
    engine: { enabled: POLICY.engine.enabled },
  };
}

export function createAppData(settings: Settings): AppDataV1 {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings,
    items: {},
    goals: {},
    contexts: defaultContextMap(),
    snapshots: {},
    events: {},
  };
}

export function createSnapshot(date: LocalDate, now: Instant): DailySnapshot {
  return {
    date,
    createdAt: now,
    energyLog: [],
    anchorMinutes: 0,
    densityScore: 0,
    focusPicks: [],
    completed: [],
    started: [],
    explored: [],
    carried: [],
    workout: { intensity: 'skipped', minutes: 0 },
  };
}

export function createEvent(
  input: Omit<EngineEvent, 'id' | 'at'> & { at?: Instant },
  deps: FactoryDeps,
): EngineEvent {
  return {
    ...input,
    id: deps.id(),
    at: input.at ?? deps.now(),
  };
}
