/**
 * rollover — 04:00 하루 경계 처리 (설계서 3.6 규칙①, M5).
 *
 * 지난 날짜들의 focusPicks 를 훑어, 완료되지 않은 카드를 조용히 인박스로 되돌린다.
 * - 이월 카운터(carryCount)는 내부에만 오른다 — 화면에 숫자로 나오지 않는다(P4).
 * - `updatedAt` 은 건드리지 않는다. 시스템 처리가 사용자의 편집을 덮어쓰면 안 된다(6.6).
 * - 그날 한 번만 돈다. 실행 사실은 시스템 이벤트(`rollover`)로 남는다.
 */
import type { AppDataV1, EngineEvent, Item, ItemId, ItemStatus, LocalDate } from '../schema/current';
import type { FactoryDeps } from '../schema/factory';
import { createEvent } from '../schema/factory';
import { ON_BOARD_STATUSES } from './todayBoard';
import { compareDate } from './day';

export interface RolloverCtx {
  data: AppDataV1;
  today: LocalDate;
  deps: FactoryDeps;
}

export interface RolloverResult {
  data: AppDataV1;
  carried: ItemId[];
  didRun: boolean;
}

export function hasRunOn(data: AppDataV1, today: LocalDate): boolean {
  return Object.values(data.events).some(
    (event: EngineEvent) => event.type === 'rollover' && event.date === today && event.actor === 'system',
  );
}

function shouldCarry(item: Item, date: LocalDate, todaysPicks: Set<ItemId>): boolean {
  if (item.deletedAt) return false;
  if (!ON_BOARD_STATUSES.includes(item.status as ItemStatus)) return false;
  if (todaysPicks.has(item.id)) return false;
  return !(item.carriedFrom ?? []).includes(date);
}

export function runRollover(ctx: RolloverCtx): RolloverResult {
  if (hasRunOn(ctx.data, ctx.today)) return { data: ctx.data, carried: [], didRun: false };

  const items: Record<ItemId, Item> = { ...ctx.data.items };
  const carried: ItemId[] = [];
  const todaysPicks = new Set(
    (ctx.data.snapshots[ctx.today]?.focusPicks ?? []).map((pick) => pick.itemId),
  );
  const pastDates = (Object.keys(ctx.data.snapshots) as LocalDate[])
    .filter((date) => compareDate(date, ctx.today) < 0)
    .sort();

  for (const date of pastDates) {
    const snapshot = ctx.data.snapshots[date];
    for (const pick of snapshot?.focusPicks ?? []) {
      const item = items[pick.itemId];
      if (!item || !shouldCarry(item, date, todaysPicks)) continue;

      const carriedFrom = item.carriedFrom ?? [];
      const next: Item = {
        ...item,
        status: 'inbox',
        carryCount: (item.carryCount ?? 0) + 1,
        carriedFrom: carriedFrom.includes(date) ? carriedFrom : [...carriedFrom, date],
      };
      if (next.placement && compareDate(next.placement.date, date) <= 0) delete next.placement;
      delete next.deferUntil;
      items[item.id] = next;
      carried.push(item.id);
    }
  }

  const event = createEvent(
    {
      date: ctx.today,
      itemId: '-',
      type: 'rollover',
      actor: 'system',
      note: `carried:${carried.length}`,
    },
    ctx.deps,
  );

  return {
    data: { ...ctx.data, items, events: { ...ctx.data.events, [event.id]: event } },
    carried,
    didRun: true,
  };
}
