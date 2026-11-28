/**
 * adhd — ADHD 0→1 메커니즘의 명령 (설계서 1.4 · 5.9 · 5.10).
 *
 * 규칙은 여기, 숫자는 policy, 문구는 data/mvs · content/strings.
 * 모든 함수는 순수하고 새 `AppDataV1` 을 돌려준다. 저장은 app 만 한다.
 *
 * 핵심 원칙:
 *  - 착수(started)와 완료(complete)는 다른 사건이다(M7). 착수는 실패가 아니다.
 *  - 재보기(5분)는 완료가 아니다. 준비이고, 기록만 남긴다(M6).
 *  - 타이머를 켠 세션만 시간 관측이 된다(D14).
 */
import type {
  AppDataV1,
  DailySnapshot,
  Energy,
  Estimate,
  FocusSession,
  Instant,
  Item,
  ItemId,
  ItemStatus,
  LocalDate,
  Minutes,
  Placement,
} from '../schema/current';
import type { FactoryDeps } from '../schema/factory';
import { createEvent, createItem, createSnapshot } from '../schema/factory';
import { POLICY } from '../policy';
import { INBOX_CONTEXT_ID } from '../data/contexts';
import { findRoutine } from '../data/routines';
import { STRINGS } from '../content/strings.ko';
import { addDays, daysBetween } from './day';

export interface AdhdCtx {
  data: AppDataV1;
  today: LocalDate;
  deps: FactoryDeps;
}

export type AdhdFailure =
  | 'missing'
  | 'already-done'
  | 'no-session'
  | 'session-busy'
  | 'not-empty'
  | 'no-workout';

export interface AdhdResult {
  data: AppDataV1;
  ok: boolean;
  reason?: AdhdFailure;
  itemId?: ItemId;
}

const ON_BOARD: readonly ItemStatus[] = ['planned', 'doing', 'started'];

function fail(data: AppDataV1, reason: AdhdFailure): AdhdResult {
  return { data, ok: false, reason };
}

function withSnapshot(data: AppDataV1, today: LocalDate, snapshot: DailySnapshot): AppDataV1 {
  return { ...data, snapshots: { ...data.snapshots, [today]: snapshot } };
}

function snapshotOf(data: AppDataV1, today: LocalDate, now: Instant): DailySnapshot {
  return data.snapshots[today] ?? createSnapshot(today, now);
}

function withItem(data: AppDataV1, item: Item): AppDataV1 {
  return { ...data, items: { ...data.items, [item.id]: item } };
}

function withEvent(data: AppDataV1, event: ReturnType<typeof createEvent>): AppDataV1 {
  return { ...data, events: { ...data.events, [event.id]: event } };
}

function clearSession(data: AppDataV1): AppDataV1 {
  if (!data.focusSession) return data;
  const next = { ...data };
  delete next.focusSession;
  return next;
}

function minutesSince(startedAt: Instant, now: Instant, pausedTotalMs = 0): number {
  const start = Date.parse(startedAt);
  const end = Date.parse(now);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start - pausedTotalMs) / 60_000));
}

function plusMinutes(now: Instant, minutes: number): Instant {
  const base = Date.parse(now);
  return new Date(base + minutes * 60_000).toISOString();
}

// ── 조건 ─────────────────────────────────────────────
/** 재보기 버튼 노출 — `u ≥ 0.45` · 이 유형 처음 · 닫은 뒤 7일 (4.3 · 5.10). */
export function shouldOfferProbe(
  item: Item,
  estimate: Estimate,
  today: LocalDate,
): boolean {
  if (item.status === 'done' || item.deletedAt) return false;
  if (item.exploration) return false;
  if (item.probeDismissedAt) {
    const dismissed = item.probeDismissedAt.slice(0, 10) as LocalDate;
    if (daysBetween(dismissed, today) < POLICY.engine.time.probeCooldownDays) return false;
  }
  return (
    estimate.u >= 0.45 ||
    estimate.cellN < POLICY.engine.time.exploreMinSamples ||
    item.firstOfKind === true
  );
}

/** MVS 자동 생성 조건 — 높은 에너지 · 한 번도 시작 안 함 · 불확실 (4.11 mvs.autoFor). */
export function autoMvsFor(item: Item, estimate: Estimate, energy: Energy): boolean {
  if (item.kind === 'anchor') return false;
  if (item.mvsAcceptedAt) return false;
  if (item.status === 'done') return false;
  return (
    energy === 'high' ||
    (!item.startedAt && (item.startedCount ?? 0) === 0) ||
    estimate.u >= 0.45
  );
}

// ── 집중 세션 ─────────────────────────────────────────
export function startFocus(ctx: AdhdCtx, itemId: ItemId, minutes?: number): AdhdResult {
  const item = ctx.data.items[itemId];
  if (!item || item.deletedAt) return fail(ctx.data, 'missing');
  if (item.status === 'done') return fail(ctx.data, 'already-done');
  if (ctx.data.focusSession) return fail(ctx.data, 'session-busy');

  const now = ctx.deps.now();
  const planned = minutes ?? POLICY.starterTimerMin;
  const session: FocusSession = {
    itemId,
    mode: 'focus',
    startedAt: now,
    plannedMin: planned,
    endsAt: plusMinutes(now, planned),
    plannedEstimateMin: item.estimateMin,
  };

  const next: Item = {
    ...item,
    status: 'doing',
    startedAt: item.startedAt ?? now,
    startedCount: (item.startedCount ?? 0) + 1,
    updatedAt: now,
  };

  const event = createEvent(
    {
      date: ctx.today,
      itemId,
      type: 'start',
      actor: 'user',
      cell: item.contextId,
      plannedMin: item.estimateMin,
      at: now,
    },
    ctx.deps,
  );

  const data = withEvent(withItem({ ...ctx.data, focusSession: session }, next), event);
  return { data, ok: true, itemId };
}

export function pauseFocus(ctx: AdhdCtx): AdhdResult {
  const session = ctx.data.focusSession;
  if (!session || session.pausedAt) return fail(ctx.data, 'no-session');
  const now = ctx.deps.now();
  const next: FocusSession = { ...session, pausedAt: now };
  const event = createEvent(
    { date: ctx.today, itemId: session.itemId, type: 'pause', actor: 'user', at: now },
    ctx.deps,
  );
  return { data: withEvent({ ...ctx.data, focusSession: next }, event), ok: true, itemId: session.itemId };
}

export function resumeFocus(ctx: AdhdCtx): AdhdResult {
  const session = ctx.data.focusSession;
  if (!session || !session.pausedAt) return fail(ctx.data, 'no-session');
  const now = ctx.deps.now();
  const pausedMs = Math.max(0, Date.parse(now) - Date.parse(session.pausedAt));
  const next: FocusSession = {
    ...session,
    pausedTotalMs: (session.pausedTotalMs ?? 0) + pausedMs,
    endsAt: plusMinutes(now, Math.max(1, Math.round((Date.parse(session.endsAt) - Date.parse(session.pausedAt)) / 60_000))),
  };
  delete next.pausedAt;
  const event = createEvent(
    { date: ctx.today, itemId: session.itemId, type: 'resume', actor: 'user', at: now },
    ctx.deps,
  );
  return { data: withEvent({ ...ctx.data, focusSession: next }, event), ok: true, itemId: session.itemId };
}

export function extendFocus(ctx: AdhdCtx, minutes: number): AdhdResult {
  const session = ctx.data.focusSession;
  if (!session) return fail(ctx.data, 'no-session');
  const base = session.pausedAt ?? ctx.deps.now();
  const next: FocusSession = {
    ...session,
    plannedMin: session.plannedMin + minutes,
    endsAt: plusMinutes(base, Math.max(1, Math.round((Date.parse(session.endsAt) - Date.parse(base)) / 60_000)) + minutes),
  };
  return { data: { ...ctx.data, focusSession: next }, ok: true, itemId: session.itemId };
}

/** 완료 — 실제 소요가 기록되고 그 자리에서 시간 모델의 관측이 된다. */
export function completeFocus(ctx: AdhdCtx): AdhdResult {
  const session = ctx.data.focusSession;
  if (!session) return fail(ctx.data, 'no-session');
  return completeWithSession(ctx, session, 'complete');
}

/** 중단 — 실패가 아니라 한 줄의 사실이다. 타이머가 3분 이상 돌았으면 관측이 된다. */
export function abandonFocus(ctx: AdhdCtx): AdhdResult {
  const session = ctx.data.focusSession;
  if (!session) return fail(ctx.data, 'no-session');
  return completeWithSession(ctx, session, 'abandon');
}

function completeWithSession(ctx: AdhdCtx, session: FocusSession, type: 'complete' | 'abandon'): AdhdResult {
  const item = ctx.data.items[session.itemId];
  if (!item) return fail(ctx.data, 'missing');
  const now = ctx.deps.now();
  const actualMin = Math.max(0, minutesSince(session.startedAt, now, session.pausedTotalMs ?? 0));
  const snapshot = snapshotOf(ctx.data, ctx.today, now);

  const event = createEvent(
    {
      date: ctx.today,
      itemId: item.id,
      type,
      actor: 'user',
      cell: item.contextId,
      plannedMin: session.plannedEstimateMin ?? item.estimateMin,
      ...(actualMin > 0 ? { actualMin } : {}),
      at: now,
    },
    ctx.deps,
  );

  let data: AppDataV1 = clearSession(ctx.data);
  if (type === 'complete') {
    const next: Item = {
      ...item,
      status: 'done',
      completedAt: now,
      updatedAt: now,
      ...(actualMin > 0 ? { actualMin } : {}),
    };
    data = withItem(data, next);
    const completed = snapshot.completed.includes(item.id)
      ? snapshot.completed
      : [...snapshot.completed, item.id];
    const workout =
      item.kind === 'workout'
        ? { intensity: item.intensity, minutes: actualMin > 0 ? actualMin : item.estimateMin }
        : snapshot.workout;
    data = withSnapshot(data, ctx.today, { ...snapshot, completed, workout });
  } else {
    const next: Item = {
      ...item,
      status: ON_BOARD.includes(item.status) ? 'planned' : 'inbox',
      interruptions: (item.interruptions ?? 0) + 1,
      updatedAt: now,
    };
    data = withItem(data, next);
  }

  data = withEvent(data, event);
  return { data, ok: true, itemId: item.id };
}

/** [착수 성공] — 0→1 만 찍는다. 완료도 실패도 아니다(M7). */
export function markStarted(ctx: AdhdCtx, itemId: ItemId): AdhdResult {
  const item = ctx.data.items[itemId];
  if (!item || item.deletedAt) return fail(ctx.data, 'missing');
  if (item.status === 'done') return fail(ctx.data, 'already-done');
  const now = ctx.deps.now();

  const next: Item = {
    ...item,
    status: 'started',
    startedAt: item.startedAt ?? now,
    startedCount: (item.startedCount ?? 0) + 1,
    updatedAt: now,
  };
  const event = createEvent(
    { date: ctx.today, itemId, type: 'started', actor: 'user', cell: item.contextId, plannedMin: item.estimateMin, at: now },
    ctx.deps,
  );

  let data = withEvent(withItem(ctx.data, next), event);
  if (data.focusSession?.itemId === itemId) data = clearSession(data);
  return { data, ok: true, itemId };
}

// ── 에너지 스위치 ─────────────────────────────────────
export function setEnergyLevel(ctx: AdhdCtx, level: Energy): AdhdResult {
  const now = ctx.deps.now();
  const snapshot = snapshotOf(ctx.data, ctx.today, now);
  const energyLog = [...snapshot.energyLog, { at: now, level }];
  const event = createEvent(
    { date: ctx.today, itemId: '-', type: 'energy', actor: 'user', energyAt: level, at: now },
    ctx.deps,
  );
  const data = withEvent(withSnapshot(ctx.data, ctx.today, { ...snapshot, energyLog }), event);
  return { data, ok: true };
}

export function currentEnergy(data: AppDataV1, today: LocalDate): Energy {
  const log = data.snapshots[today]?.energyLog ?? [];
  const last = log[log.length - 1];
  return last?.level ?? 'mid';
}

// ── MVS · 추정 편집 ───────────────────────────────────
export function setMvsLabel(ctx: AdhdCtx, itemId: ItemId, label: string): AdhdResult {
  const item = ctx.data.items[itemId];
  if (!item) return fail(ctx.data, 'missing');
  const now = ctx.deps.now();
  const trimmed = label.trim();
  const next: Item = {
    ...item,
    updatedAt: now,
    ...(trimmed.length > 0
      ? { mvsLabel: trimmed, mvsAcceptedAt: now, mvsTargetMin: POLICY.engine.mvs.targetMin }
      : {}),
  };
  if (trimmed.length === 0) {
    delete next.mvsLabel;
    delete next.mvsAcceptedAt;
  }
  return { data: withItem(ctx.data, next), ok: true, itemId };
}

export function setEstimate(ctx: AdhdCtx, itemId: ItemId, minutes: number): AdhdResult {
  const item = ctx.data.items[itemId];
  if (!item) return fail(ctx.data, 'missing');
  const now = ctx.deps.now();
  const next: Item = {
    ...item,
    estimateMin: Math.max(5, Math.round(minutes / 5) * 5),
    updatedAt: now,
  };
  delete next.estimateAssumed;
  return { data: withItem(ctx.data, next), ok: true, itemId };
}

// ── 5분 재보기 ────────────────────────────────────────
export function startProbe(ctx: AdhdCtx, itemId: ItemId): AdhdResult {
  const item = ctx.data.items[itemId];
  if (!item || item.deletedAt) return fail(ctx.data, 'missing');
  if (ctx.data.focusSession) return fail(ctx.data, 'session-busy');
  const now = ctx.deps.now();
  const session: FocusSession = {
    itemId,
    mode: 'probe',
    startedAt: now,
    plannedMin: POLICY.engine.explore.minutes,
    endsAt: plusMinutes(now, POLICY.engine.explore.minutes),
    plannedEstimateMin: item.estimateMin,
  };
  return { data: { ...ctx.data, focusSession: session }, ok: true, itemId };
}

export function dismissProbe(ctx: AdhdCtx, itemId: ItemId, at?: Instant): AdhdResult {
  const item = ctx.data.items[itemId];
  if (!item) return fail(ctx.data, 'missing');
  const now = ctx.deps.now();
  const next: Item = { ...item, probeDismissedAt: at ?? now, updatedAt: now };
  let data = withItem(ctx.data, next);
  if (data.focusSession?.itemId === itemId) data = clearSession(data);
  return { data, ok: true, itemId };
}

/**
 * 재보기 판정 — [예상대로] 는 분산을 좁히고, [더 큼] 은 추정을 고친다.
 * 어느 쪽이든 **완료로 세지 않는다.**
 */
export function applyProbeVerdict(
  ctx: AdhdCtx,
  itemId: ItemId,
  verdict: 'kept' | 'bigger',
  revisedMin?: number,
  actualMin?: number,
): AdhdResult {
  const item = ctx.data.items[itemId];
  if (!item) return fail(ctx.data, 'missing');
  const now = ctx.deps.now();
  const revised = verdict === 'bigger' ? Math.max(5, Math.round((revisedMin ?? item.estimateMin) / 5) * 5) : item.estimateMin;
  const elapsed =
    actualMin ?? (ctx.data.focusSession?.itemId === itemId
      ? minutesSince(ctx.data.focusSession.startedAt, now, ctx.data.focusSession.pausedTotalMs ?? 0)
      : POLICY.engine.explore.minutes);

  const next: Item = {
    ...item,
    exploration: { doneAt: now, actualMin: elapsed, revisedEstimateMin: revised, verdict },
    updatedAt: now,
    ...(verdict === 'bigger' ? { estimateMin: revised } : {}),
  };

  const event = createEvent(
    {
      date: ctx.today,
      itemId,
      type: 'explore',
      actor: 'user',
      cell: item.contextId,
      plannedMin: item.estimateMin,
      revisedMin: revised,
      at: now,
    },
    ctx.deps,
  );

  let data = withEvent(withItem(ctx.data, next), event);
  if (data.focusSession?.itemId === itemId) data = clearSession(data);
  return { data, ok: true, itemId };
}

// ── 타임라인 배치 ─────────────────────────────────────
export function scheduleItem(
  ctx: AdhdCtx,
  itemId: ItemId,
  startMin: Minutes,
  durationMin?: number,
): AdhdResult {
  const item = ctx.data.items[itemId];
  if (!item || item.deletedAt) return fail(ctx.data, 'missing');
  if (item.kind === 'anchor') return fail(ctx.data, 'missing');
  const now = ctx.deps.now();
  const placement: Placement = {
    date: ctx.today,
    startMin: Math.max(0, Math.round(startMin / 5) * 5) % (24 * 60),
    durationMin: Math.max(5, Math.round((durationMin ?? item.estimateMin) / 5) * 5),
    source: 'manual',
  };
  const next: Item = {
    ...item,
    placement,
    status: item.status === 'inbox' ? 'planned' : item.status,
    updatedAt: now,
  };
  delete next.deferUntil;

  let data = withItem(ctx.data, next);
  // 오늘 보드에 없으면 빈 자리가 있을 때 함께 올린다.
  const snapshot = snapshotOf(data, ctx.today, now);
  if (!snapshot.focusPicks.some((pick) => pick.itemId === itemId)) {
    const capacity = data.settings.maxFocusCards || POLICY.maxFocusCards;
    const onBoard = snapshot.focusPicks
      .map((pick) => data.items[pick.itemId])
      .filter((entry): entry is Item => entry !== undefined && !entry.deletedAt && ON_BOARD.includes(entry.status))
      .length;
    if (onBoard < capacity) {
      data = withSnapshot(data, ctx.today, {
        ...snapshot,
        focusPicks: [...snapshot.focusPicks, { itemId, pickedAt: now }],
      });
    }
  }
  return { data, ok: true, itemId };
}

export function unscheduleItem(ctx: AdhdCtx, itemId: ItemId): AdhdResult {
  const item = ctx.data.items[itemId];
  if (!item) return fail(ctx.data, 'missing');
  const next: Item = { ...item, updatedAt: ctx.deps.now() };
  delete next.placement;
  return { data: withItem(ctx.data, next), ok: true, itemId };
}

// ── 운동: 플랜 B ──────────────────────────────────────
/** 오늘의 운동 목표를 강도로 바꾼다 — 40분 루틴 ↔ 플랜 B 10분. */
export function setWorkoutPlan(ctx: AdhdCtx, itemId: ItemId, plan: 'full' | 'planB'): AdhdResult {
  const item = ctx.data.items[itemId];
  if (!item || item.kind !== 'workout') return fail(ctx.data, 'missing');
  const routine = findRoutine(item.routineId);
  const now = ctx.deps.now();
  const intensity = plan === 'full' ? 'full' : 'minimum';
  const plannedMinutes =
    plan === 'full'
      ? Math.max(20, routine?.fullMinutes ?? 40)
      : POLICY.workoutMinimum.minutes;
  const next: Item = {
    ...item,
    intensity,
    plannedMinutes,
    estimateMin: plannedMinutes,
    updatedAt: now,
  };
  return { data: withItem(ctx.data, next), ok: true, itemId };
}

export function completeWorkout(ctx: AdhdCtx, itemId: ItemId, minutes?: number): AdhdResult {
  const item = ctx.data.items[itemId];
  if (!item || item.kind !== 'workout') return fail(ctx.data, 'no-workout');
  if (item.status === 'done') return fail(ctx.data, 'already-done');
  const now = ctx.deps.now();
  const snapshot = snapshotOf(ctx.data, ctx.today, now);
  const next: Item = { ...item, status: 'done', completedAt: now, updatedAt: now };
  const event = createEvent(
    {
      date: ctx.today,
      itemId,
      type: 'workout',
      actor: 'user',
      cell: item.contextId,
      plannedMin: item.estimateMin,
      actualMin: minutes ?? item.plannedMinutes,
      at: now,
    },
    ctx.deps,
  );
  const completed = snapshot.completed.includes(itemId) ? snapshot.completed : [...snapshot.completed, itemId];
  const data = withEvent(
    withSnapshot(withItem(ctx.data, next), ctx.today, {
      ...snapshot,
      completed,
      workout: { intensity: item.intensity, minutes: minutes ?? item.plannedMinutes },
    }),
    event,
  );
  return { data, ok: true, itemId };
}

// ── 샘플 하루 ─────────────────────────────────────────
/**
 * 빈 화면에서 바로 만져볼 수 있는 하루. **기존 사용자 데이터는 건드리지 않는다** —
 * 항목이 하나라도 있으면 거절한다.
 */
export function loadSampleDay(ctx: AdhdCtx): AdhdResult {
  const existing = Object.values(ctx.data.items).filter((item) => !item.deletedAt);
  if (existing.length > 0) return fail(ctx.data, 'not-empty');

  const now = ctx.deps.now();
  const nowMs = Date.parse(now);
  const at = (offsetMin: number): Instant => new Date(nowMs + offsetMin * 60_000).toISOString();
  const past = (daysAgo: number, hour = 20): Instant => {
    const base = new Date(nowMs - daysAgo * 86_400_000);
    base.setHours(hour, 0, 0, 0);
    return base.toISOString();
  };

  let data: AppDataV1 = { ...ctx.data, items: {}, events: {}, snapshots: {}, sampleLoadedAt: now };

  // 1) 지난 7일의 완료 이력 — 시간 모델이 "계획보다 1.3배" 를 배우는 재료.
  const history: Array<{ title: string; contextId: string; planned: number; actual: number; day: number }> = [
    { title: '국어 기출 3번 풀기', contextId: 'study', planned: 40, actual: 52, day: 1 },
    { title: '영어 독해 2지문', contextId: 'study', planned: 30, actual: 41, day: 1 },
    { title: '논술 첨삭 정리', contextId: 'study', planned: 50, actual: 62, day: 2 },
    { title: '마트 장보기', contextId: 'errand', planned: 25, actual: 30, day: 2 },
    { title: '전신 스트레칭', contextId: 'workout', planned: 20, actual: 22, day: 2 },
    { title: '수학 오답 정리', contextId: 'study', planned: 35, actual: 48, day: 3 },
    { title: '장학금 서류 확인', contextId: 'study', planned: 20, actual: 26, day: 3 },
    { title: '국어 문학 1지문', contextId: 'study', planned: 30, actual: 38, day: 4 },
    { title: '빠르게 걷기', contextId: 'workout', planned: 30, actual: 34, day: 4 },
    { title: '방 청소', contextId: 'errand', planned: 20, actual: 24, day: 5 },
    { title: '사회문화 2단원', contextId: 'study', planned: 45, actual: 58, day: 5 },
    { title: '영어 단어 복습', contextId: 'study', planned: 20, actual: 25, day: 6 },
  ];

  for (const entry of history) {
    const date = addDays(ctx.today, -entry.day);
    const completedAt = past(entry.day, 21);
    const startedAt = new Date(Date.parse(completedAt) - entry.actual * 60_000).toISOString();
    const item = createItem(
      {
        kind: entry.contextId === 'errand' ? 'errand' : 'task',
        title: entry.title,
        contextId: entry.contextId,
        estimateMin: entry.planned,
        status: 'done',
        energy: 'mid',
      },
      ctx.deps,
    );
    const done: Item = {
      ...item,
      status: 'done',
      createdAt: startedAt,
      updatedAt: completedAt,
      completedAt,
      startedAt,
      startedCount: 1,
      actualMin: entry.actual,
      estimateMin: entry.planned,
    };
    data = withItem(data, done);
    const snapshot = snapshotOf(data, date, completedAt);
    data = withSnapshot(data, date, {
      ...snapshot,
      completed: [...snapshot.completed, done.id],
      focusPicks: [{ itemId: done.id, pickedAt: startedAt }],
      workout:
        entry.contextId === 'workout'
          ? { intensity: 'reduced', minutes: entry.actual }
          : snapshot.workout,
    });
    for (const [type, when] of [
      ['start', startedAt],
      ['complete', completedAt],
    ] as const) {
      const event = createEvent(
        {
          date,
          itemId: done.id,
          type,
          actor: 'user',
          cell: entry.contextId,
          plannedMin: entry.planned,
          ...(type === 'complete' ? { actualMin: entry.actual } : {}),
          at: when,
        },
        { id: ctx.deps.id, now: () => when },
      );
      data = withEvent(data, event);
    }
  }

  // 2) 오늘 — 카드 3장 + 인박스 후보 + 고정 일정 + 배치
  const todayItems: Array<{
    title: string;
    contextId: string;
    kind: 'task' | 'errand' | 'workout';
    estimate: number;
    energy: Energy;
    startMin?: number;
    onBoard: boolean;
    due?: LocalDate;
    priority?: 1 | 2 | 3;
    routineId?: string;
  }> = [
    {
      title: '인하대 논술 2번 문항 재작성',
      contextId: 'study',
      kind: 'task',
      estimate: 60,
      energy: 'high',
      startMin: 19 * 60,
      onBoard: true,
      due: addDays(ctx.today, 7),
      priority: 1,
    },
    {
      title: '빠르게 걷기',
      contextId: 'workout',
      kind: 'workout',
      estimate: 20,
      energy: 'mid',
      startMin: 18 * 60,
      onBoard: true,
      routineId: 'walk',
    },
    {
      title: '장학금 서류 준비',
      contextId: 'study',
      kind: 'task',
      estimate: 15,
      energy: 'mid',
      onBoard: true,
      due: addDays(ctx.today, 2),
      priority: 1,
    },
    { title: '국어 기출 12번 풀기', contextId: 'study', kind: 'task', estimate: 30, energy: 'high', onBoard: false },
    { title: '마트 장보기', contextId: 'errand', kind: 'errand', estimate: 20, energy: 'low', onBoard: false },
    { title: '책상 정리', contextId: 'errand', kind: 'errand', estimate: 15, energy: 'low', onBoard: false },
  ];

  const board: Item[] = [];
  for (const entry of todayItems) {
    const item = createItem(
      entry.kind === 'workout'
        ? {
            kind: 'workout',
            title: entry.title,
            contextId: entry.contextId,
            energy: entry.energy,
            estimateMin: entry.estimate,
            routineId: entry.routineId ?? 'walk',
            plannedMinutes: entry.estimate,
            intensity: 'minimum',
            status: entry.onBoard ? 'planned' : 'inbox',
          }
        : entry.kind === 'errand'
          ? {
              kind: 'errand',
              title: entry.title,
              contextId: entry.contextId,
              energy: entry.energy,
              estimateMin: entry.estimate,
              status: 'inbox',
            }
          : {
              kind: 'task',
              title: entry.title,
              contextId: entry.contextId,
              energy: entry.energy,
              estimateMin: entry.estimate,
              status: entry.onBoard ? 'planned' : 'inbox',
              ...(entry.due ? { dueDate: entry.due } : {}),
              ...(entry.priority ? { priority: entry.priority } : {}),
            },
      ctx.deps,
    );
    const placement: Item =
      entry.startMin === undefined
        ? item
        : { ...item, placement: { date: ctx.today, startMin: entry.startMin, durationMin: entry.estimate, source: 'manual' } };
    data = withItem(data, placement);
    if (entry.onBoard) board.push(placement);
  }

  // 고정 일정 — 20:30 학원
  const anchor = createItem(
    {
      kind: 'anchor',
      title: '수학 학원',
      startAt: at(0).replace(/T.*/, `T${String(20).padStart(2, '0')}:30:00`) as Instant,
      endAt: at(0).replace(/T.*/, `T${String(22).padStart(2, '0')}:00:00`) as Instant,
      rigidity: 'hard',
      contextId: INBOX_CONTEXT_ID,
      energy: 'mid',
    },
    ctx.deps,
  );
  const anchorItem: Item = { ...anchor, status: 'planned' };
  data = withItem(data, anchorItem);

  const snapshot = snapshotOf(data, ctx.today, now);
  data = withSnapshot(data, ctx.today, {
    ...snapshot,
    focusPicks: board.map((item) => ({ itemId: item.id, pickedAt: now })),
    energyLog: [{ at: now, level: 'mid' }],
  });

  return { data, ok: true };
}

/** 운동 카드가 없으면 오늘 하나 만든다 — 상단 스위치 옆 플랜 B 의 대상. */
export function ensureWorkoutItem(ctx: AdhdCtx, routineId = 'walk'): AdhdResult {
  const existing = Object.values(ctx.data.items).find(
    (item) => item.kind === 'workout' && !item.deletedAt && item.status !== 'done' && item.status !== 'dropped',
  );
  if (existing) return { data: ctx.data, ok: true, itemId: existing.id };
  const routine = findRoutine(routineId);
  const item = createItem(
    {
      kind: 'workout',
      title: routine?.label ?? STRINGS.workout.defaultTitle,
      contextId: 'workout',
      routineId,
      plannedMinutes: POLICY.workoutMinimum.minutes,
      intensity: 'minimum',
      status: 'inbox',
      energy: 'mid',
    },
    ctx.deps,
  );
  return { data: withItem(ctx.data, item), ok: true, itemId: item.id };
}
