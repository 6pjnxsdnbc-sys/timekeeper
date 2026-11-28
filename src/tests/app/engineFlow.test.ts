import { describe, expect, it } from 'vitest';
import type { Instant } from '@core/schema/current';
import { createAppStore } from '@app/store';
import { createMemoryKeyValue, createPersistedStore } from '@sync';

const T0: Instant = '2026-11-27T09:00:00+09:00';

function machine(start: Instant = T0) {
  const kv = createMemoryKeyValue();
  let clock = start;
  let seq = 0;
  const make = () =>
    createAppStore({
      storage: createPersistedStore(kv, { stamp: () => 'stamp' }),
      now: () => clock,
      id: () => {
        seq += 1;
        return `flow-${String(seq).padStart(3, '0')}`;
      },
      timezone: 'Asia/Seoul',
    });
  return {
    kv,
    store: make(),
    remake: make,
    set: (next: Instant) => {
      clock = next;
    },
    advance: (minutes: number) => {
      clock = new Date(Date.parse(clock) + minutes * 60_000).toISOString();
    },
  };
}

describe('통합 흐름 — 샘플 → 집중 타이머 → 보정 → 에너지 → 재보기 (F2·F3)', () => {
  it('샘플 하루를 불러오고 바로 타이머를 돌려 실제 소요를 학습한다', () => {
    const { store, advance, remake, set } = machine();
    expect(store.loadSample()).toMatchObject({ ok: true });

    const state = store.getState();
    const items = Object.values(state.items);
    expect(items.length).toBeGreaterThanOrEqual(12);

    const essay = items.find((item) => item.title === '인하대 논술 2번 문항 재작성');
    expect(essay).toBeDefined();

    const started = store.startFocus(essay!.id, 25);
    expect(started).toMatchObject({ ok: true });
    expect(store.getState().focusSession?.itemId).toBe(essay!.id);

    // 앱을 닫았다 열어도 세션이 살아 있다.
    const reopened = remake();
    expect(reopened.getState().focusSession?.itemId).toBe(essay!.id);

    advance(32);
    set('2026-11-27T09:32:00+09:00');
    expect(store.completeFocus()).toMatchObject({ ok: true });
    const done = store.getState().items[essay!.id];
    expect(done?.status).toBe('done');
    expect(done?.actualMin).toBe(32);
    expect(store.getState().focusSession).toBeUndefined();

    const events = Object.values(store.getState().events);
    const complete = events.find(
      (event) => event.type === 'complete' && event.itemId === essay!.id,
    );
    expect(complete?.actualMin).toBe(32);
  });

  it('에너지 스위치·배치·재보기가 명령으로 저장된다', () => {
    const { store } = machine();
    store.loadSample();

    expect(store.setEnergy('low')).toMatchObject({ ok: true });
    expect(store.getState().snapshots['2026-11-27']?.energyLog.at(-1)?.level).toBe('low');

    const target = Object.values(store.getState().items).find((item) => item.kind === 'task');
    expect(target).toBeDefined();
    expect(store.schedule(target!.id, 15 * 60, 30)).toMatchObject({ ok: true });
    expect(store.getState().items[target!.id]?.placement?.startMin).toBe(900);

    expect(store.unschedule(target!.id)).toMatchObject({ ok: true });
    expect(store.getState().items[target!.id]?.placement).toBeUndefined();

    expect(store.startProbe(target!.id)).toMatchObject({ ok: true });
    expect(store.getState().focusSession?.mode).toBe('probe');
    expect(store.applyProbe(target!.id, 'bigger', 45)).toMatchObject({ ok: true });
    expect(store.getState().items[target!.id]?.estimateMin).toBe(45);
    expect(store.getState().focusSession).toBeUndefined();
  });

  it('운동 플랜 B 와 완료 기록', () => {
    const { store } = machine();
    const created = store.ensureWorkout();
    expect(created).toMatchObject({ ok: true });
    const workout = Object.values(store.getState().items).find((item) => item.kind === 'workout');
    expect(workout).toBeDefined();

    expect(store.setWorkoutPlan(workout!.id, 'planB')).toMatchObject({ ok: true });
    expect(store.completeWorkout(workout!.id, 10)).toMatchObject({ ok: true });
    expect(store.getState().snapshots['2026-11-27']?.workout).toMatchObject({
      intensity: 'minimum',
      minutes: 10,
    });
  });
});
