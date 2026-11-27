import { describe, expect, it } from 'vitest';
import type { AppDataV1, Item } from '@core/schema/current';
import { createSnapshot, runRollover } from '@core';
import { TODAY, emptyData, fixedDeps, makeItem } from '../support/fixtures';

const YESTERDAY = '2026-11-26';

function scenario() {
  const deps = fixedDeps('2026-11-27T04:00:10+09:00');
  const planned = makeItem(deps, {
    kind: 'task',
    title: '논술 초안',
    status: 'planned',
    estimateMin: 60,
  });
  const done = makeItem(deps, { kind: 'task', title: '수학 기출', status: 'done', estimateMin: 30 });
  const demoted = makeItem(deps, { kind: 'task', title: '마트', status: 'inbox', estimateMin: 20 });

  const items: Record<string, Item> = {};
  for (const item of [planned, done, demoted]) items[item.id] = item;

  const snapshot = {
    ...createSnapshot(YESTERDAY, '2026-11-26T20:00:00+09:00'),
    focusPicks: [planned, done, demoted].map((item) => ({
      itemId: item.id,
      pickedAt: '2026-11-26T09:00:00+09:00',
    })),
  };

  const data: AppDataV1 = {
    ...emptyData(),
    items,
    snapshots: { [YESTERDAY]: snapshot },
  };
  return { deps, data, planned, done, demoted };
}

describe('rollover — 04:00 하루 경계 (3.6 규칙①)', () => {
  it('지난 날짜의 미완료 카드만 조용히 인박스로 되돌린다', () => {
    const { deps, data, planned, done, demoted } = scenario();
    const result = runRollover({ data, today: TODAY, deps });

    expect(result.didRun).toBe(true);
    expect(result.carried).toEqual([planned.id]);
    expect(result.data.items[planned.id]?.status).toBe('inbox');
    expect(result.data.items[planned.id]?.carryCount).toBe(1);
    expect(result.data.items[planned.id]?.carriedFrom).toEqual([YESTERDAY]);
    expect(result.data.items[done.id]?.status).toBe('done');
    expect(result.data.items[demoted.id]?.status).toBe('inbox');
    expect(result.data.items[demoted.id]?.carryCount).toBeUndefined();
  });

  it('시스템 처리는 updatedAt 을 건드리지 않는다 (6.6)', () => {
    const { deps, data, planned } = scenario();
    const before = data.items[planned.id]?.updatedAt;
    const result = runRollover({ data, today: TODAY, deps });
    expect(result.data.items[planned.id]?.updatedAt).toBe(before);
  });

  it('실행 사실을 시스템 이벤트로 남기고, 같은 날 다시 돌지 않는다', () => {
    const { deps, data } = scenario();
    const first = runRollover({ data, today: TODAY, deps });
    const events = Object.values(first.data.events);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('rollover');
    expect(events[0]?.actor).toBe('system');
    expect(events[0]?.date).toBe(TODAY);
    expect(events[0]?.note).toBe('carried:1');

    const second = runRollover({ data: first.data, today: TODAY, deps });
    expect(second.didRun).toBe(false);
    expect(second.carried).toEqual([]);
  });

  it('이월 카운터는 화면 문구에 쓰이지 않는다 — 데이터에만 남는다', () => {
    const { deps, data, planned } = scenario();
    const result = runRollover({ data, today: TODAY, deps });
    const item = result.data.items[planned.id];
    expect(item?.carryCount).toBe(1);
    expect(JSON.stringify(item)).not.toMatch(/rolloverCount|carryLabel/);
  });
});
