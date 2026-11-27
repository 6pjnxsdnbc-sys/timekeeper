import { describe, expect, it } from 'vitest';
import type { AppDataV1, Item } from '@core/schema/current';
import {
  completedOnBoard,
  demotedToInbox,
  postponedToTomorrow,
  promotedToToday,
  removedItem,
  selectBoardView,
} from '@core';
import { NOW, TODAY, emptyData, fixedDeps, makeItem } from '../support/fixtures';

function boardOf(count: number) {
  const deps = fixedDeps();
  const items: Item[] = [];
  for (let i = 0; i < count; i += 1) {
    items.push(
      makeItem(deps, { kind: 'task', title: `일 ${i + 1}`, status: 'inbox', estimateMin: 15 }),
    );
  }
  const data: AppDataV1 = emptyData();
  const map: Record<string, Item> = {};
  for (const item of items) map[item.id] = item;
  return { deps, items, data: { ...data, items: map } };
}

describe('todayBoard — 오늘 카드 최대 3장 (M2)', () => {
  it('인박스에서 3장까지 올리고, 4장째는 거절한다', () => {
    const { deps, items, data } = boardOf(4);
    let next = data;
    for (let i = 0; i < 3; i += 1) {
      const result = promotedToToday({ data: next, today: TODAY, deps }, items[i]!.id);
      expect(result.ok).toBe(true);
      next = result.data;
    }
    const fourth = promotedToToday({ data: next, today: TODAY, deps }, items[3]!.id);
    expect(fourth.ok).toBe(false);
    expect(fourth.reason).toBe('full');

    const view = selectBoardView(next, TODAY, { capacity: 3 });
    expect(view.cards).toHaveLength(3);
    expect(view.emptySlots).toBe(0);
    expect(view.full).toBe(true);
    expect(view.fullHint).toBe(true);
  });

  it('카드에는 분류·예상 시간·라벨이 붙는다', () => {
    const { deps, items, data } = boardOf(1);
    const pinned = makeItem(deps, {
      kind: 'task',
      title: '원서 제출',
      contextId: 'study',
      estimateMin: 30,
      status: 'inbox',
      priority: 1,
      dueDate: TODAY,
    });
    const next = promotedToToday(
      { data: { ...data, items: { ...data.items, [pinned.id]: pinned } }, today: TODAY, deps },
      pinned.id,
    ).data;
    const view = selectBoardView(next, TODAY, { capacity: 3 });
    expect(view.cards).toHaveLength(1);
    expect(view.cards[0]?.meta.contextLabel).toBe('공부');
    expect(view.cards[0]?.meta.estimateLabel).toBe('30분');
    expect(view.cards[0]?.meta.labels).toContain('오늘 고정');
    expect(items).toHaveLength(1);
  });

  it('내리면 인박스로 돌아가고 자리가 빈다', () => {
    const { deps, items, data } = boardOf(1);
    const promoted = promotedToToday({ data, today: TODAY, deps }, items[0]!.id);
    const demoted = demotedToInbox({ data: promoted.data, today: TODAY, deps }, items[0]!.id);
    expect(demoted.ok).toBe(true);
    expect(demoted.data.items[items[0]!.id]?.status).toBe('inbox');
    expect(selectBoardView(demoted.data, TODAY, { capacity: 3 }).cards).toHaveLength(0);
  });

  it('완료하면 보드에서 내려오고 "오늘 한 것" 에 남는다', () => {
    const { deps, items, data } = boardOf(2);
    const promoted = promotedToToday({ data, today: TODAY, deps }, items[0]!.id);
    const done = completedOnBoard({ data: promoted.data, today: TODAY, deps }, items[0]!.id);
    expect(done.ok).toBe(true);
    expect(done.data.items[items[0]!.id]?.status).toBe('done');
    expect(done.data.items[items[0]!.id]?.completedAt).toBe(NOW);
    expect(Object.values(done.data.events).some((event) => event.type === 'complete')).toBe(true);

    const view = selectBoardView(done.data, TODAY, { capacity: 3 });
    expect(view.cards).toHaveLength(0);
    expect(view.completed.map((item) => item.id)).toEqual([items[0]!.id]);
  });

  it("'내일로' 는 카운터만 내부에서 올리고 오늘 후보에서 감춘다", () => {
    const { deps, items, data } = boardOf(2);
    const promoted = promotedToToday({ data, today: TODAY, deps }, items[0]!.id);
    const postponed = postponedToTomorrow({ data: promoted.data, today: TODAY, deps }, items[0]!.id);
    expect(postponed.ok).toBe(true);

    const item = postponed.data.items[items[0]!.id];
    expect(item?.status).toBe('inbox');
    expect(item?.carryCount).toBe(1);
    expect(item?.deferUntil).toBe('2026-11-28');
    expect(item?.carriedFrom).toEqual([TODAY]);

    const view = selectBoardView(postponed.data, TODAY, { capacity: 3 });
    expect(view.cards).toHaveLength(0);
    expect(view.candidates.map((candidate) => candidate.item.id)).not.toContain(items[0]!.id);

    const tomorrow = selectBoardView(postponed.data, '2026-11-28', { capacity: 3 });
    expect(tomorrow.candidates.map((candidate) => candidate.item.id)).toContain(items[0]!.id);
  });

  it('삭제는 tombstone 이고 복구 전까지 어디에도 없다', () => {
    const { deps, items, data } = boardOf(1);
    const removed = removedItem({ data, today: TODAY, deps }, items[0]!.id);
    expect(removed.ok).toBe(true);
    expect(removed.data.items[items[0]!.id]?.deletedAt).toBe(NOW);
    const view = selectBoardView(removed.data, TODAY, { capacity: 3 });
    expect(view.candidates).toHaveLength(0);
  });
});
