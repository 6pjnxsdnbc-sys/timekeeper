import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ESTIMATE_MIN,
  createAppData,
  createItem,
  createSettings,
  roundEstimateMin,
  type FactoryDeps,
} from '@core/schema/factory';
import { INBOX_CONTEXT_ID } from '@core/data/contexts';

function deps(start = 1): FactoryDeps & { calls: () => number } {
  let n = start;
  const calls = () => n - start;
  return {
    id: () => `01937b1e-0000-7000-8000-${String(n++).padStart(12, '0')}`,
    now: () => '2026-11-27T19:12:00+09:00',
    calls,
  };
}

describe('factory — 기본값 (M1: 저장은 항상 성공한다)', () => {
  it('제목만 준 task 는 인박스 · 15분 · 보통 우선순위로 저장된다', () => {
    const d = deps();
    const item = createItem({ kind: 'task', title: '논술 2번 다시 쓰기' }, d);

    expect(item.kind).toBe('task');
    expect(item.status).toBe('inbox');
    expect(item.contextId).toBe(INBOX_CONTEXT_ID);
    expect(item.estimateMin).toBe(DEFAULT_ESTIMATE_MIN);
    expect(item.energy).toBe('mid');
    expect(item.createdAt).toBe('2026-11-27T19:12:00+09:00');
    expect(item.updatedAt).toBe(item.createdAt);
    if (item.kind === 'task') expect(item.priority).toBe(2);
  });

  it('추정은 5분 단위로 반올림되고 하한 5분을 지킨다', () => {
    expect(roundEstimateMin(63)).toBe(65);
    expect(roundEstimateMin(2)).toBe(5);
    expect(roundEstimateMin(Number.NaN)).toBe(DEFAULT_ESTIMATE_MIN);
  });

  it('앵커는 계획됨 상태이고 소요를 시작·끝에서 계산한다', () => {
    const item = createItem(
      {
        kind: 'anchor',
        title: '인하대 논술',
        startAt: '2026-12-05T10:00:00+09:00',
        endAt: '2026-12-05T11:30:00+09:00',
        rigidity: 'hard',
      },
      deps(),
    );

    expect(item.kind).toBe('anchor');
    expect(item.status).toBe('planned');
    expect(item.estimateMin).toBe(90);
    if (item.kind === 'anchor') expect(item.rigidity).toBe('hard');
  });

  it('운동은 루틴의 축소 시간을 기본으로 쓴다', () => {
    const item = createItem({ kind: 'workout', title: '스트레칭', routineId: 'stretch' }, deps());

    expect(item.kind).toBe('workout');
    if (item.kind === 'workout') {
      expect(item.plannedMinutes).toBe(10);
      expect(item.intensity).toBe('reduced');
    }
  });

  it('id · now 는 주입된 값만 쓴다 (시계를 직접 읽지 않는다)', () => {
    const d = deps();
    const a = createItem({ kind: 'task', title: 'a' }, d);
    const b = createItem({ kind: 'task', title: 'b' }, d);

    expect(a.id).not.toBe(b.id);
    expect(d.calls()).toBe(2);
  });
});

describe('factory — 앱 데이터', () => {
  it('v1 데이터에는 4개 분류 + 인박스가 있고 저장소는 비어 있다', () => {
    const settings = createSettings({ deviceId: 'device-1' });
    const data = createAppData(settings);

    expect(data.schemaVersion).toBe(1);
    expect(Object.keys(data.contexts).sort()).toEqual(['errand', 'inbox', 'study', 'work', 'workout']);
    expect(data.items).toEqual({});
    expect(data.events).toEqual({});
    expect(data.settings.engine.enabled).toBe(true);
    expect(data.settings.dayStartHour).toBe(4);
    expect(data.settings.maxFocusCards).toBe(3);
  });
});
