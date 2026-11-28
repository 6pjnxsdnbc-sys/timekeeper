import { describe, expect, it } from 'vitest';
import type { AppDataV1, Instant, Item, LocalDate, WorkoutItem } from '@core/schema/current';
import {
  abandonFocus,
  applyProbeVerdict,
  completeFocus,
  createItem,
  currentEnergy,
  dismissProbe,
  estimateItem,
  extendFocus,
  focusCurve,
  loadSampleDay,
  markStarted,
  pauseFocus,
  replay,
  resumeFocus,
  scheduleItem,
  selectInsight,
  selectTimeline,
  setEnergyLevel,
  setMvsLabel,
  setWorkoutPlan,
  shouldOfferProbe,
  startFocus,
  startProbe,
  unscheduleItem,
} from '@core';
import { NOW, TODAY, emptyData } from '../support/fixtures';

function clock(start: Instant = NOW) {
  let current = start;
  let seq = 0;
  return {
    id: () => {
      seq += 1;
      return `t-${String(seq).padStart(3, '0')}`;
    },
    now: () => current,
    set: (next: Instant) => {
      current = next;
    },
    advance: (minutes: number) => {
      current = new Date(Date.parse(current) + minutes * 60_000).toISOString();
    },
  };
}

function baseData(deps: ReturnType<typeof clock>): { data: AppDataV1; item: Item } {
  const item = createItem(
    { kind: 'task', title: '논술 2번 다시 쓰기', contextId: 'study', estimateMin: 30, status: 'inbox', energy: 'high' },
    deps,
  );
  return { data: { ...emptyData(), items: { [item.id]: item } }, item };
}

describe('집중 세션 — M7 (5.9)', () => {
  it('시작하면 doing + 세션이 남고, 완료하면 실제 소요가 기록되어 학습된다', () => {
    const deps = clock();
    const { data, item } = baseData(deps);
    const started = startFocus({ data, today: TODAY, deps }, item.id, 25);
    expect(started.ok).toBe(true);
    expect(started.data.items[item.id]?.status).toBe('doing');
    expect(started.data.focusSession?.itemId).toBe(item.id);
    expect(Object.values(started.data.events).some((event) => event.type === 'start')).toBe(true);

    const busy = startFocus({ data: started.data, today: TODAY, deps }, item.id);
    expect(busy.ok).toBe(false);
    expect(busy.reason).toBe('session-busy');

    deps.advance(42);
    const completed = completeFocus({ data: started.data, today: TODAY, deps });
    expect(completed.ok).toBe(true);
    expect(completed.data.focusSession).toBeUndefined();
    expect(completed.data.items[item.id]?.status).toBe('done');
    expect(completed.data.items[item.id]?.actualMin).toBe(42);

    const complete = Object.values(completed.data.events).find((event) => event.type === 'complete');
    expect(complete?.actualMin).toBe(42);
    expect(complete?.plannedMin).toBe(30);

    // 실제 42분 / 계획 30분 → 새 항목의 보정 추정이 계획보다 커진다.
    const model = replay(completed.data);
    const next = createItem(
      { kind: 'task', title: '또 하나', contextId: 'study', estimateMin: 30 },
      deps,
    );
    expect(estimateItem(next, model).factor).toBeGreaterThan(1);
  });

  it('일시정지 시간은 실제 소요에서 빠진다', () => {
    const deps = clock();
    const { data, item } = baseData(deps);
    const started = startFocus({ data, today: TODAY, deps }, item.id, 25).data;
    deps.advance(10);
    const paused = pauseFocus({ data: started, today: TODAY, deps });
    expect(paused.ok).toBe(true);
    deps.advance(20);
    const resumed = resumeFocus({ data: paused.data, today: TODAY, deps });
    expect(resumed.ok).toBe(true);
    deps.advance(5);
    const completed = completeFocus({ data: resumed.data, today: TODAY, deps });
    expect(completed.data.items[item.id]?.actualMin).toBe(15);
  });

  it('중단은 실패가 아니라 한 줄의 사실이고, 착수 흔적은 남는다', () => {
    const deps = clock();
    const { data, item } = baseData(deps);
    const started = startFocus({ data, today: TODAY, deps }, item.id, 25).data;
    deps.advance(8);
    const abandoned = abandonFocus({ data: started, today: TODAY, deps });
    expect(abandoned.ok).toBe(true);
    const after = abandoned.data.items[item.id];
    expect(after?.status).toBe('planned');
    expect(after?.startedAt).toBe(NOW);
    expect(after?.interruptions).toBe(1);
    expect(Object.values(abandoned.data.events).some((event) => event.type === 'abandon')).toBe(true);
  });

  it('[착수 성공] 은 완료가 아니다 — started 상태로 보드에 남는다', () => {
    const deps = clock();
    const { data, item } = baseData(deps);
    const started = markStarted({ data, today: TODAY, deps }, item.id);
    expect(started.ok).toBe(true);
    expect(started.data.items[item.id]?.status).toBe('started');
    expect(started.data.items[item.id]?.completedAt).toBeUndefined();
    expect(started.data.snapshots[TODAY]?.completed ?? []).toHaveLength(0);
  });

  it('연장하면 끝나는 시각이 밀린다', () => {
    const deps = clock();
    const { data, item } = baseData(deps);
    const started = startFocus({ data, today: TODAY, deps }, item.id, 25).data;
    const extended = extendFocus({ data: started, today: TODAY, deps }, 25);
    expect(extended.data.focusSession?.plannedMin).toBe(50);
    expect(Date.parse(extended.data.focusSession?.endsAt ?? '')).toBeGreaterThan(
      Date.parse(started.focusSession?.endsAt ?? ''),
    );
  });
});

describe('재보기 — M6 (5.10)', () => {
  it('5분 재보기는 완료가 아니고, [더 큼] 은 추정을 고친다', () => {
    const deps = clock();
    const { data, item } = baseData(deps);
    const probing = startProbe({ data, today: TODAY, deps }, item.id);
    expect(probing.data.focusSession?.mode).toBe('probe');
    deps.advance(5);
    const verdict = applyProbeVerdict({ data: probing.data, today: TODAY, deps }, item.id, 'bigger', 60);
    expect(verdict.ok).toBe(true);
    expect(verdict.data.items[item.id]?.estimateMin).toBe(60);
    expect(verdict.data.items[item.id]?.exploration?.verdict).toBe('bigger');
    expect(verdict.data.items[item.id]?.status).toBe('inbox');
    const explore = Object.values(verdict.data.events).find((event) => event.type === 'explore');
    expect(explore?.revisedMin).toBe(60);
  });

  it('닫으면 7일 동안 버튼이 붙지 않는다', () => {
    const deps = clock();
    const { data, item } = baseData(deps);
    const model = replay(data);
    const estimate = estimateItem(item, model);
    expect(shouldOfferProbe(item, estimate, TODAY)).toBe(true);

    const dismissed = dismissProbe({ data, today: TODAY, deps }, item.id);
    const nextItem = dismissed.data.items[item.id];
    expect(shouldOfferProbe(nextItem as Item, estimate, TODAY)).toBe(false);
    expect(shouldOfferProbe(nextItem as Item, estimate, '2026-12-05' as LocalDate)).toBe(true);
  });
});

describe('에너지 스위치 (5.7 · 4.4)', () => {
  it('누르면 스냅샷·이벤트에 남고 곡선이 바뀐다', () => {
    const deps = clock();
    const { data } = baseData(deps);
    const high = setEnergyLevel({ data, today: TODAY, deps }, 'high');
    expect(currentEnergy(high.data, TODAY)).toBe('high');
    expect(high.data.snapshots[TODAY]?.energyLog.at(-1)?.level).toBe('high');
    expect(Object.values(high.data.events).some((event) => event.type === 'energy')).toBe(true);

    const low = setEnergyLevel({ data: high.data, today: TODAY, deps }, 'low');
    const model = replay(low.data);
    const highCurve = focusCurve(model, 'high');
    const lowCurve = focusCurve(model, 'low');
    expect(highCurve[0]).toBeGreaterThan(lowCurve[0] ?? 0);
  });
});

describe('타임라인 배치 (5.7)', () => {
  it('19:00 에 놓으면 블록이 되고, 남은 시간이 계산된다', () => {
    const deps = clock();
    const { data, item } = baseData(deps);
    const scheduled = scheduleItem({ data, today: TODAY, deps }, item.id, 19 * 60, 60);
    expect(scheduled.data.items[item.id]?.placement?.startMin).toBe(1140);
    expect(scheduled.data.items[item.id]?.status).toBe('planned');

    const model = replay(scheduled.data);
    const timeline = selectTimeline(scheduled.data, TODAY, 18 * 60 + 33, model);
    const block = timeline.blocks.find((entry) => entry.itemId === item.id);
    expect(block?.startMin).toBe(1140);
    expect(block?.endMin).toBe(1200);
    expect(timeline.freeFromNow).toBeGreaterThan(0);
    expect(timeline.untilNextBlock).toBe(27);

    const unscheduled = unscheduleItem({ data: scheduled.data, today: TODAY, deps }, item.id);
    expect(unscheduled.data.items[item.id]?.placement).toBeUndefined();
  });

  it('자정을 넘긴 배치는 하루 경계 기준으로 편다', () => {
    const deps = clock();
    const { data, item } = baseData(deps);
    const scheduled = scheduleItem({ data, today: TODAY, deps }, item.id, 30, 60);
    const model = replay(scheduled.data);
    const timeline = selectTimeline(scheduled.data, TODAY, 23 * 60, model);
    const block = timeline.blocks.find((entry) => entry.itemId === item.id);
    expect(block?.startMin).toBe(24 * 60 + 30);
  });
});

describe('운동 플랜 B (1.4 M8)', () => {
  it('40분 루틴 ↔ 플랜 B 15분을 한 번에 바꾼다', () => {
    const deps = clock();
    const workout = createItem(
      { kind: 'workout', title: '빠르게 걷기', routineId: 'walk', plannedMinutes: 40, intensity: 'full', contextId: 'workout' },
      deps,
    );
    const data: AppDataV1 = { ...emptyData(), items: { [workout.id]: workout } };
    const planB = setWorkoutPlan({ data, today: TODAY, deps }, workout.id, 'planB');
    expect((planB.data.items[workout.id] as WorkoutItem).intensity).toBe('minimum');
    expect(planB.data.items[workout.id]?.estimateMin).toBe(15);

    const planA = setWorkoutPlan({ data: planB.data, today: TODAY, deps }, workout.id, 'full');
    expect((planA.data.items[workout.id] as WorkoutItem).intensity).toBe('full');
    expect((planA.data.items[workout.id] as WorkoutItem).plannedMinutes).toBeGreaterThanOrEqual(40);
  });
});

describe('샘플 하루 (온보딩)', () => {
  it('빈 데이터에만 채우고, 엔진이 바로 배울 수 있는 이력을 만든다', () => {
    const deps = clock();
    const empty = emptyData();
    const result = loadSampleDay({ data: empty, today: TODAY, deps });
    expect(result.ok).toBe(true);

    const items = Object.values(result.data.items);
    expect(items.length).toBeGreaterThanOrEqual(12);
    expect(Object.keys(result.data.events).length).toBeGreaterThanOrEqual(20);
    expect(result.data.snapshots[TODAY]?.focusPicks.length).toBe(3);

    const insight = selectInsight(result.data, TODAY, 12 * 60);
    expect(insight.selection.picks.length).toBe(3);
    expect(insight.stats.accuracy.samples).toBeGreaterThanOrEqual(10);
    expect(insight.timeline.blocks.length).toBeGreaterThanOrEqual(3);
    expect(insight.mvs[insight.selection.picks[0]?.itemId ?? '']).toBeDefined();
    // 오늘 보드에 선 카드는 추천 3장이 아니어도 첫 동작 한 줄을 갖는다.
    for (const pick of result.data.snapshots[TODAY]?.focusPicks ?? []) {
      expect(insight.mvs[pick.itemId]?.label.length ?? 0).toBeGreaterThan(0);
    }

    const again = loadSampleDay({ data: result.data, today: TODAY, deps });
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('not-empty');
  });

  it('사용자가 고친 MVS 는 이후 자동 생성이 덮지 않는다', () => {
    const deps = clock();
    const { data, item } = baseData(deps);
    const edited = setMvsLabel({ data, today: TODAY, deps }, item.id, '제목만 쓰기');
    expect(edited.data.items[item.id]?.mvsLabel).toBe('제목만 쓰기');
    expect(edited.data.items[item.id]?.mvsAcceptedAt).toBe(NOW);

    const insight = selectInsight(edited.data, TODAY, 12 * 60);
    expect(insight.mvs[item.id]?.label).toBe('제목만 쓰기');
    expect(insight.mvs[item.id]?.edited).toBe(true);
  });
});
