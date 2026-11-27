import { describe, expect, it } from 'vitest';
import { createAppStore } from '@app/store';
import { createMemoryKeyValue, createPersistedStore, DEFAULT_DATA_KEY } from '@sync';
import { NOW } from '../support/fixtures';

const DAY_START = '2026-11-27T04:00:00+09:00';

function makeStore(kv = createMemoryKeyValue()) {
  let seq = 0;
  return {
    kv,
    store: createAppStore({
      storage: createPersistedStore(kv, { stamp: () => 'stamp' }),
      now: () => NOW,
      id: () => {
        seq += 1;
        return `item-${seq}`;
      },
      timezone: 'Asia/Seoul',
    }),
  };
}

describe('store — 명령과 영속화 (F1)', () => {
  it('입력·승격·완료가 저장되고 새로고침(새 store) 후에도 남는다', () => {
    const { kv, store } = makeStore();

    const first = store.capture('인하대 논술 2번 재작성 /공부 1시간');
    expect(first.ok).toBe(true);
    expect(first.placedOnBoard).toBe(false);

    const second = store.capture('수학 기출 30분 오늘');
    expect(second.ok).toBe(true);
    expect(second.placedOnBoard).toBe(true);

    expect(store.promote(first.itemId!)).toMatchObject({ ok: true });
    expect(store.complete(second.itemId!)).toMatchObject({ ok: true });

    expect(kv.get(DEFAULT_DATA_KEY)).toBeTruthy();

    const reloaded = makeStore(kv).store;
    const items = Object.values(reloaded.getState().items);
    expect(items).toHaveLength(2);
    expect(items.find((item) => item.id === first.itemId)?.status).toBe('planned');
    expect(items.find((item) => item.id === second.itemId)?.status).toBe('done');
    expect(reloaded.getState().snapshots['2026-11-27']?.completed).toEqual([second.itemId]);
  });

  it('되돌리기는 마지막 명령을 취소한다', () => {
    const { store } = makeStore();
    const captured = store.capture('장학금 서류');
    expect(store.complete(captured.itemId!)).toMatchObject({ ok: true });
    expect(store.getState().items[captured.itemId!]?.status).toBe('done');

    expect(store.undo()).toBe(true);
    expect(store.getState().items[captured.itemId!]?.status).toBe('inbox');
    expect(store.undo()).toBe(false);
  });

  it('오늘 카드가 꽉 차면 저장은 되고 인박스에 담긴다', () => {
    const { store } = makeStore();
    for (let i = 0; i < 3; i += 1) {
      const result = store.capture(`오늘 일 ${i + 1}`);
      expect(result.placedOnBoard).toBe(true);
    }
    const fourth = store.capture('오늘 일 4');
    expect(fourth.ok).toBe(true);
    expect(fourth.placedOnBoard).toBe(false);
    expect(fourth.reason).toBe('full');
    expect(Object.values(store.getState().items)).toHaveLength(4);
  });

  it('깨진 저장 데이터는 격리하고 빈 상태로 시작한다', () => {
    const kv = createMemoryKeyValue({ [DEFAULT_DATA_KEY]: '{ broken json' });
    const { store } = makeStore(kv);
    expect(Object.keys(store.getState().items)).toHaveLength(0);
    expect(kv.get(`${DEFAULT_DATA_KEY}.corrupt.stamp`)).toBe('{ broken json');
  });

  it('하루 경계가 지나면 어제 카드를 인박스로 되돌린다', () => {
    let clock = DAY_START;
    const kv = createMemoryKeyValue();
    let seq = 0;
    const store = createAppStore({
      storage: createPersistedStore(kv, { stamp: () => 'stamp' }),
      now: () => clock,
      id: () => {
        seq += 1;
        return `item-${seq}`;
      },
      timezone: 'Asia/Seoul',
    });

    const captured = store.capture('어제 하던 일 30분 오늘');
    expect(captured.placedOnBoard).toBe(true);

    clock = '2026-11-28T04:00:05+09:00';
    expect(store.syncDay()).toBe(true);
    expect(store.getToday()).toBe('2026-11-28');
    expect(store.getState().items[captured.itemId!]?.status).toBe('inbox');
    expect(store.getState().items[captured.itemId!]?.carryCount).toBe(1);
  });
});
