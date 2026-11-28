/**
 * 스키마 v1 — 설계서 3.2 그대로.
 *
 * 이 파일은 **타입 계약만** 담는다. 기본값 생성은 factory.ts, 숫자는 policy.ts.
 * v1.2 필드(started, exploration, mvsLabel, probeDismissedAt, EngineEvent …)는
 * 코드가 아직 없으므로 v1 안에서 expand-only 로 흡수한다 (SCHEMA_VERSION = 1).
 */

export const SCHEMA_VERSION = 1 as const;

export type LocalDate = `${number}-${number}-${number}`;
export type Instant = string; // ISO 8601 + 오프셋
export type Minutes = number; // 자정 기준 0–1439
export type ItemId = string; // UUIDv7 (생성 시각 순 정렬)

export type ItemKind = 'anchor' | 'task' | 'errand' | 'workout';
export type Energy = 'high' | 'mid' | 'low';
/** 'started' = 0→1 만 찍은 상태. 완료가 아니고, 실패도 아니다 (M7). */
export type ItemStatus = 'inbox' | 'planned' | 'doing' | 'started' | 'done' | 'dropped';
export type Difficulty = 1 | 2 | 3; // 1 쉬움 · 2 보통 · 3 어려움 (없으면 2)
export type Intensity = 'full' | 'reduced' | 'minimum';

export interface Placement {
  date: LocalDate;
  startMin: Minutes;
  durationMin: number;
  source: 'manual' | 'suggested';
}

/**
 * 집중 세션 — 타이머가 도는 동안의 사실 (F2, M7 · 5.9).
 * 파생값이 아니라 "지금 돌고 있는 세션"이라 저장한다. 앱을 닫아도 살아남는다.
 */
export interface FocusSession {
  itemId: ItemId;
  /** 'focus' = 집중 타이머, 'probe' = 5분 재보기 */
  mode: 'focus' | 'probe';
  startedAt: Instant;
  /** 계획한 길이(분). 연장하면 늘어난다. */
  plannedMin: number;
  endsAt: Instant;
  pausedAt?: Instant;
  pausedTotalMs?: number;
  /** 세션을 시작할 때의 보정 추정 — 완료 시 실제/계획 비율의 분모 */
  plannedEstimateMin?: number;
}

/** 5분 재보기 결과 (M6). 판정은 2종이고, 쪼개기는 판정이 아니라 별도 제안이다. */
export interface Exploration {
  doneAt: Instant;
  actualMin: number; // 실제로 걸린 시간 (3–10분)
  revisedEstimateMin: number; // 재본 뒤의 추정 (변경 없으면 원래 값)
  verdict: 'kept' | 'bigger';
}

export interface ItemBase {
  id: ItemId;
  kind: ItemKind;
  title: string;
  note?: string;
  contextId: string; // Context 참조 — 엔진 v1의 셀 단위
  goalId?: string;
  energy: Energy; // 요구 에너지
  estimateMin: number; // 예상 소요 (5분 단위)
  status: ItemStatus;
  placement?: Placement;
  createdAt: Instant;
  updatedAt: Instant; // 충돌 판정 기준
  deletedAt?: Instant; // tombstone (tombstoneDays 후 purge)
  carryCount?: number; // 내부용 이월 카운터(rolloverCount). 화면에 숫자로 노출하지 않는다
  deferUntil?: LocalDate; // '내일로' 로 미룬 항목 — 이 날짜 전까지 인박스 후보에 오르지 않는다 (F1)
  pinnedOn?: LocalDate; // '!' 로 오늘 고정한 날 — 그날의 보드에서만 '오늘 고정' 라벨
  estimateAssumed?: boolean; // 시간을 말하지 않고 저장된 기본 추정 (M1) — 카드에 '미정'으로 표시
  carriedFrom?: LocalDate[];
  splitDeclined?: boolean;

  // ── 난이도·불확실성 (M6) ──────────────────────────────
  difficulty?: Difficulty; // 피로 부하 입력. v1 셀 축은 아니다
  firstOfKind?: boolean; // 이 유형을 처음 — 사전 분산을 키운다
  exploration?: Exploration; // 재보기 결과. 있으면 작은 분산으로 반영
  probeDismissedAt?: Instant; // '5분만 재보기'를 닫은 시각 (7일간 재노출 금지)

  // ── 착수와 완료의 분리 (M7) ───────────────────────────
  mvsLabel?: string; // 0→1 기준 문구
  mvsTargetMin?: number; // 목표 시간(분). 기본 7
  mvsAcceptedAt?: Instant; // 사용자가 수락·수정한 시각 (이후 자동 생성 금지)
  startedAt?: Instant; // 첫 착수 시각 (0→1)
  startedCount?: number;
  completedAt?: Instant;
  actualMin?: number; // 타이머를 켠 세션에서만 기록 (D14)
  interruptions?: number;
}

export interface AnchorItem extends ItemBase {
  kind: 'anchor';
  startAt: Instant;
  endAt: Instant;
  allDay?: boolean;
  location?: string;
  rigidity: 'hard' | 'soft'; // hard = 이동 불가 (시험·수업)
  recurrence?: Recurrence;
}

export interface TaskItem extends ItemBase {
  kind: 'task';
  dueDate?: LocalDate;
  priority: 1 | 2 | 3; // 1 = 오늘 반드시
  subtasks?: { id: string; title: string; done: boolean }[];
  splitFrom?: ItemId;
  parkedSplit?: boolean;
}

export interface ErrandItem extends ItemBase {
  kind: 'errand';
  place?: string;
  batchKey?: string; // 같은 외출로 묶기
  window?: 'morning' | 'afternoon' | 'evening' | 'any';
}

export interface WorkoutItem extends ItemBase {
  kind: 'workout';
  routineId: string; // core/data/routines.ts 키
  plannedMinutes: number;
  intensity: Intensity;
  autoAdjusted?: { date: LocalDate; from: Intensity; reason: string } | null;
}

export type Item = AnchorItem | TaskItem | ErrandItem | WorkoutItem;

export interface Recurrence {
  freq: 'daily' | 'weekly';
  byWeekday?: number[];
  until?: LocalDate;
}

export interface Goal {
  id: string;
  title: string; // '인하대 논술 12/5'
  horizon: 'exam' | 'term' | 'quarter' | 'open';
  dueDate?: LocalDate;
  weight?: Partial<Record<ItemKind, number>>; // 종류별 에너지 배분 의도
  note?: string;
}

/** 분류 — 사용자가 늘릴 수 있는 데이터. 엔진 v1의 셀 단위이기도 하다. */
export interface Context {
  id: string; // 'study' | 'work' | 'errand' | 'workout'
  label: string; // '공부'
  kind: ItemKind | 'mixed';
  defaultEnergy: Energy;
  preferredWindows?: ('morning' | 'afternoon' | 'evening')[];
  accent?: 'neutral' | 'accent';
}

export interface WorkoutRoutine {
  id: string;
  label: string;
  fullMinutes: number;
  reducedMinutes: number;
  steps: string[];
  equipment?: 'none' | 'gym';
}

/** 그날의 사실 기록 — 파생값 비저장 원칙의 유일한 예외 */
export interface DailySnapshot {
  date: LocalDate;
  createdAt: Instant;
  energyLog: { at: Instant; level: Energy }[];
  anchorMinutes: number;
  densityScore: number; // 기록용 — 화면은 항상 재계산
  focusPicks: { itemId: ItemId; pickedAt: Instant; replacedBy?: ItemId }[];
  completed: ItemId[];
  started: ItemId[];
  explored: ItemId[];
  carried: ItemId[];
  workout: { intensity: Intensity | 'skipped'; minutes: number };
  fatigueEnd?: number; // 그날 마감 시점 0–1 (기록용)
  engineVersion?: string;
  mood?: 1 | 2 | 3 | 4 | 5; // v2 예고
  sleepMinutes?: number; // v2 예고 — v1은 기록하지도, 쓰지도 않는다
  note?: string;
}

export interface Settings {
  schemaVersion: number;
  deviceId: string;
  timezone: string;
  theme: 'dark' | 'light' | 'system';
  dayStartHour: number; // 기본 4
  weekStart: 0 | 1;
  maxFocusCards: number;
  sync: {
    provider: 'none' | 'gist' | 'supabase';
    lastSyncedAt?: Instant;
    lastRemoteRev?: number;
    tokenExpiresAt?: Instant; // PAT 만료일 (D−7 리마인드)
  };
  lastFileBackupAt?: Instant;
  onboardingDone: boolean;
  engine: { enabled: boolean; overrides?: Partial<EngineWeights> };
}

export type EngineWeights = {
  wUrgency: number;
  wBalance: number;
  wEnergy: number;
  wFit: number;
  wStart: number;
  wSwitch: number;
  wRecovery: number; // v1.2: recovery 7번째 항
};

export interface AppDataV1 {
  schemaVersion: 1;
  settings: Settings;
  items: Record<ItemId, Item>;
  goals: Record<string, Goal>;
  contexts: Record<string, Context>;
  snapshots: Record<LocalDate, DailySnapshot>;
  events: Record<string, EngineEvent>; // 엔진의 유일한 학습 입력 (append-only)
  engineCache?: ModelState; // 재계산 가능한 캐시 — 동기화·백업 제외

  // ── v1.2 흡수 (expand-only) ────────────────────────
  /** 지금 돌고 있는 집중 타이머·재보기. 없으면 필드 자체가 없다. */
  focusSession?: FocusSession;
  /** 샘플 하루를 마지막으로 불러온 시각 — 기존 사용자 데이터 보존 표시 */
  sampleLoadedAt?: Instant;
}

/** 발생한 사실. 수정·삭제하지 않는다. */
export type EngineEventType =
  | 'start' // 타이머 시작 (선택 사항 — 없어도 된다)
  | 'started' // 0→1 착수 (완료가 아님)
  | 'complete'
  | 'pause'
  | 'resume'
  | 'abandon'
  | 'explore'
  | 'carry'
  | 'energy'
  | 'workout'
  | 'rollover'; // 하루 경계 처리 (actor: system)

export interface EngineEvent {
  id: string; // UUIDv7 — 병합은 id 합집합
  at: Instant;
  date: LocalDate;
  itemId: ItemId | '-'; // 'rollover' 는 '-'
  type: EngineEventType;
  actor: 'user' | 'system'; // 학습은 'user' 만
  cell?: string; // v1: contextId. v2: 'study:3'
  plannedMin?: number;
  actualMin?: number; // 타이머가 돈 세션에서만 채워진다
  energyAt?: Energy;
  fatigueAt?: number;
  revisedMin?: number; // explore 결과
  note?: string;
}

/** 이벤트에서 재계산 가능한 캐시 — 저장하되 동기화·백업 제외 (D2) */
export interface ModelState {
  version: string; // 'e1.2' — 모델 코드가 바뀌면 재계산
  replayedEvents: number; // events 수와 다르면 폐기·replay
  global: TimeCell;
  byContext: Record<string, TimeCell>; // v1: 셀 4개
  byCell?: Record<string, TimeCell>; // v2 예약 — 'study:3'
  energy: { blocks: number[]; days: number }; // v1: 4블록
  start: Record<string, { p: number; n: number }>; // v1: kind 단위
  calibration?: { brier: number; samples: number }; // v2
}

export interface TimeCell {
  nEff: number; // Kish 유효 표본 수
  muLog: number; // 로그 비율 사후 평균
  sigmaLog: number; // 사후 표준편차 = 불확실성 u
  interruptRate: number; // 중단율 (Beta 사후 평균)
}

/** 화면이 쓰는 보정 추정 — 카드에는 구간만 보인다 */
export interface Estimate {
  plannedMin: number; // t̂
  correctedMin: number; // t̃ (5분 단위)
  lo: number; // 80% 구간
  hi: number;
  u: number; // 불확실성 = σ̂
  cellN: number;
  factor: number; // b
}
