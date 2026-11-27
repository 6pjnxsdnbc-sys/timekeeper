/**
 * todayBoard — 오늘 카드 3장의 규칙 (설계서 1.4 M2 · 3.6 규칙①).
 *
 * 카드 구성은 `DailySnapshot.focusPicks` 에 날짜별로 남는다(파생값이 아니라 그날의 사실).
 * 모든 함수는 순수하고, 데이터를 직접 바꾸지 않고 새 `AppDataV1` 을 돌려준다.
 * `updatedAt` 은 **사용자 행동**에서만 올린다 — 시스템 이월은 올리지 않는다(6.6).
 */
import type { AppDataV1, DailySnapshot, Instant, Item, ItemId, ItemStatus, LocalDate } from '../schema/current';
import type { FactoryDeps } from '../schema/factory';
import { createEvent, createSnapshot } from '../schema/factory';
import { POLICY } from '../policy';
import { addDays } from './day';

export type BoardFailure = 'full' | 'missing' | 'not-on-board' | 'already-done' | 'empty';

export interface BoardCtx {
  data: AppDataV1;
  today: LocalDate;
  deps: FactoryDeps;
  /** 설정이 이기고, 없으면 정책값 (설계서 3.2 주석) */
  capacity?: number;
}

export interface BoardResult {
  data: AppDataV1;
  ok: boolean;
  reason?: BoardFailure;
}

/** 오늘 보드에 설 수 있는 상태 — 'started' 는 완료가 아니므로 남는다 (M7). */
export const ON_BOARD_STATUSES: readonly ItemStatus[] = ['planned', 'doing', 'started'];

function capacityOf(ctx: BoardCtx): number {
  return ctx.capacity ?? POLICY.maxFocusCards;
}

export function todaySnapshot(data: AppDataV1, today: LocalDate, now: Instant): DailySnapshot {
  return data.snapshots[today] ?? createSnapshot(today, now);
}

function withSnapshot(
  data: AppDataV1,
  today: LocalDate,
  snapshot: DailySnapshot,
): AppDataV1 {
  return { ...data, snapshots: { ...data.snapshots, [today]: snapshot } };
}

function fail(data: AppDataV1, reason: BoardFailure): BoardResult {
  return { data, ok: false, reason };
}

export function activeCards(data: AppDataV1, today: LocalDate): Item[] {
  const picks = data.snapshots[today]?.focusPicks ?? [];
  const cards: Item[] = [];
  for (const pick of picks) {
    const item = data.items[pick.itemId];
    if (!item || item.deletedAt) continue;
    if (!ON_BOARD_STATUSES.includes(item.status)) continue;
    if (cards.some((card) => card.id === item.id)) continue;
    cards.push(item);
  }
  return cards;
}

export function promotedToToday(ctx: BoardCtx, itemId: ItemId): BoardResult {
  const item = ctx.data.items[itemId];
  if (!item || item.deletedAt) return fail(ctx.data, 'missing');
  if (item.status === 'done') return fail(ctx.data, 'already-done');

  const snapshot = todaySnapshot(ctx.data, ctx.today, ctx.deps.now());
  if (snapshot.focusPicks.some((pick) => pick.itemId === itemId)) return { data: ctx.data, ok: true };
  if (activeCards(ctx.data, ctx.today).length >= capacityOf(ctx)) return fail(ctx.data, 'full');

  const now = ctx.deps.now();
  const next: Item = { ...item, status: 'planned', updatedAt: now };
  delete next.deferUntil;

  const focusPicks = [...snapshot.focusPicks, { itemId, pickedAt: now }];
  const data = withSnapshot(
    { ...ctx.data, items: { ...ctx.data.items, [itemId]: next } },
    ctx.today,
    { ...snapshot, focusPicks },
  );
  return { data, ok: true };
}

export function demotedToInbox(ctx: BoardCtx, itemId: ItemId): BoardResult {
  const item = ctx.data.items[itemId];
  if (!item || item.deletedAt) return fail(ctx.data, 'missing');
  const snapshot = ctx.data.snapshots[ctx.today];
  if (!snapshot?.focusPicks.some((pick) => pick.itemId === itemId)) {
    return fail(ctx.data, 'not-on-board');
  }

  const now = ctx.deps.now();
  const next: Item = { ...item, updatedAt: now };
  if (item.status === 'planned') next.status = 'inbox';
  const focusPicks = snapshot.focusPicks.filter((pick) => pick.itemId !== itemId);
  const data = withSnapshot(
    { ...ctx.data, items: { ...ctx.data.items, [itemId]: next } },
    ctx.today,
    { ...snapshot, focusPicks },
  );
  return { data, ok: true };
}

export function completedOnBoard(ctx: BoardCtx, itemId: ItemId): BoardResult {
  const item = ctx.data.items[itemId];
  if (!item || item.deletedAt) return fail(ctx.data, 'missing');
  if (item.status === 'done') return fail(ctx.data, 'already-done');

  const now = ctx.deps.now();
  const snapshot = todaySnapshot(ctx.data, ctx.today, now);
  const next: Item = { ...item, status: 'done', completedAt: now, updatedAt: now };
  const completed = snapshot.completed.includes(itemId)
    ? snapshot.completed
    : [...snapshot.completed, itemId];
  const event = createEvent(
    {
      date: ctx.today,
      itemId,
      type: 'complete',
      actor: 'user',
      cell: item.contextId,
      plannedMin: item.estimateMin,
      at: now,
    },
    ctx.deps,
  );

  const data = withSnapshot(
    {
      ...ctx.data,
      items: { ...ctx.data.items, [itemId]: next },
      events: { ...ctx.data.events, [event.id]: event },
    },
    ctx.today,
    { ...snapshot, completed },
  );
  return { data, ok: true };
}

/** '내일로' — 카드에서 조용히 내려 다음 날 후보로. 횟수는 내부에만 남는다 (M5 · P4). */
export function postponedToTomorrow(ctx: BoardCtx, itemId: ItemId): BoardResult {
  const item = ctx.data.items[itemId];
  if (!item || item.deletedAt) return fail(ctx.data, 'missing');
  if (item.status === 'done') return fail(ctx.data, 'already-done');

  const now = ctx.deps.now();
  const snapshot = todaySnapshot(ctx.data, ctx.today, now);
  const carriedFrom = item.carriedFrom ?? [];
  const next: Item = {
    ...item,
    status: 'inbox',
    carryCount: (item.carryCount ?? 0) + 1,
    carriedFrom: carriedFrom.includes(ctx.today) ? carriedFrom : [...carriedFrom, ctx.today],
    deferUntil: addDays(ctx.today, 1),
    updatedAt: now,
  };
  if (next.placement && next.placement.date === ctx.today) delete next.placement;

  const focusPicks = snapshot.focusPicks.filter((pick) => pick.itemId !== itemId);
  const event = createEvent(
    {
      date: ctx.today,
      itemId,
      type: 'carry',
      actor: 'user',
      cell: item.contextId,
      plannedMin: item.estimateMin,
      at: now,
    },
    ctx.deps,
  );

  const data = withSnapshot(
    {
      ...ctx.data,
      items: { ...ctx.data.items, [itemId]: next },
      events: { ...ctx.data.events, [event.id]: event },
    },
    ctx.today,
    { ...snapshot, focusPicks },
  );
  return { data, ok: true };
}

/** 소프트 삭제 — tombstone 만 남긴다 (S6). 되돌리기는 app 의 undo 가 맡는다. */
export function removedItem(ctx: BoardCtx, itemId: ItemId): BoardResult {
  const item = ctx.data.items[itemId];
  if (!item || item.deletedAt) return fail(ctx.data, 'missing');
  const now = ctx.deps.now();
  const next: Item = { ...item, deletedAt: now, updatedAt: now };
  return { data: { ...ctx.data, items: { ...ctx.data.items, [itemId]: next } }, ok: true };
}

export function restoredItem(ctx: BoardCtx, itemId: ItemId): BoardResult {
  const item = ctx.data.items[itemId];
  if (!item) return fail(ctx.data, 'missing');
  const now = ctx.deps.now();
  const next: Item = { ...item, updatedAt: now };
  delete next.deletedAt;
  return { data: { ...ctx.data, items: { ...ctx.data.items, [itemId]: next } }, ok: true };
}
