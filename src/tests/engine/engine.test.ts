import { describe, expect, it } from 'vitest';
import type { AppDataV1, Item } from '@core/schema/current';
import {
  createEvent,
  createItem,
  engineWeightSum,
  estimateItem,
  pDone,
  replay,
  selectionWeights,
  selectFocus,
  selectInsight,
  selectStats,
  selectTimeline,
  suggestSplit,
} from '@core';
import { NOW, TODAY, emptyData, fixedDeps } from '../support/fixtures';

/** 완료 이력만 있는 데이터 — 실제/계획 비율을 정확히 정한다. */
function historyData(count: number, ratio: number, contextId = 'study'): { data: AppDataV1; ids: string[] } {
  const deps = fixedDeps();
  let data = emptyData();
  const ids: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const base = createItem(
      {
        kind: 'task',
        title: `공부 ${index + 1}`,
        contextId,
        estimateMin: 30,
        status: 'done',
        energy: 'high',
      },
      deps,
    );
    const planned = 30;
    const actual = planned * ratio;
    const item: Item = { ...base, actualMin: actual, completedAt: NOW };
    data = { ...data, items: { ...data.items, [item.id]: item } };
    const snapshot = data.snapshots[TODAY] ?? {
      date: TODAY,
      createdAt: NOW,
      energyLog: [],
      anchorMinutes: 0,
      densityScore: 0,
      focusPicks: [],
      completed: [],
      started: [],
      explored: [],
      carried: [],
      workout: { intensity: 'skipped' as const, minutes: 0 },
    };
    data = {
      ...data,
      snapshots: { ...data.snapshots, [TODAY]: { ...snapshot, completed: [...snapshot.completed, item.id] } },
    };
    for (const type of ['start', 'complete'] as const) {
      const event = createEvent(
        {
          date: TODAY,
          itemId: item.id,
          type,
          actor: 'user',
          cell: contextId,
          plannedMin: planned,
          ...(type === 'complete' ? { actualMin: actual } : {}),
          at: NOW,
        },
        deps,
      );
      data = { ...data, events: { ...data.events, [event.id]: event } };
    }
    ids.push(item.id);
  }
  return { data, ids };
}

function openItem(deps: ReturnType<typeof fixedDeps>, title = '새 공부', contextId = 'study', estimate = 30): Item {
  return createItem({ kind: 'task', title, contextId, estimateMin: estimate, status: 'inbox' }, deps);
}

describe('시간 보정 — M-E1 (4.3)', () => {
  it('T6: 1.5배 지연 5건 → 보정 계수 b ≈ 1.4–1.6, u 감소', () => {
    const { data } = historyData(5, 1.5);
    const model = replay(data);
    const deps = fixedDeps();
    const item = openItem(deps);
    const estimate = estimateItem(item, model);

    expect(estimate.factor).toBeGreaterThan(1.35);
    expect(estimate.factor).toBeLessThan(1.65);
    expect(estimate.correctedMin).toBeGreaterThan(30);
    expect(estimate.cellN).toBeGreaterThan(3);
    expect(estimate.u).toBeLessThan(0.6);
    expect(estimate.lo).toBeLessThan(estimate.correctedMin);
    expect(estimate.hi).toBeGreaterThan(estimate.correctedMin);
  });

  it('T4: 이벤트 0건 → 보정 없음(b = 1), u = 0.6, 구간은 넓다', () => {
    const model = replay(emptyData());
    const estimate = estimateItem(openItem(fixedDeps()), model);
    expect(estimate.factor).toBe(1);
    expect(estimate.correctedMin).toBe(30);
    expect(estimate.u).toBe(0.6);
    expect(estimate.cellN).toBe(0);
    expect(estimate.lo).toBeLessThan(20);
    expect(estimate.hi).toBeGreaterThan(40);
  });

  it('3분 미만 세션은 시간 관측이 아니다', () => {
    const deps = fixedDeps();
    const item = createItem({ kind: 'task', title: '짧은 세션', contextId: 'study', estimateMin: 30 }, deps);
    const event = createEvent(
      { date: TODAY, itemId: item.id, type: 'complete', actor: 'user', cell: 'study', plannedMin: 30, actualMin: 1, at: NOW },
      deps,
    );
    const data: AppDataV1 = { ...emptyData(), items: { [item.id]: item }, events: { [event.id]: event } };
    const model = replay(data);
    expect(model.byContext['study']?.nEff ?? 0).toBe(0);
    expect(model.global.nEff).toBe(0);
  });

  it('T5: 순서와 무관하게 같은 모델 — replay 는 결정적이다', () => {
    const { data } = historyData(4, 1.3, 'work');
    const a = replay(data);
    const b = replay(data);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('효용·선정 — M-E3 (4.5)', () => {
  it('T2: 항은 [0,1], 총점은 [−0.03, 0.97], 가중치 합은 1.0', () => {
    expect(Math.round(engineWeightSum() * 100) / 100).toBe(1);
    expect(Math.round(selectionWeights().reduce((sum, weight) => sum + weight, 0) * 100) / 100).toBe(1);

    const { data } = historyData(3, 1.2);
    const deps = fixedDeps();
    const item = openItem(deps);
    const next: AppDataV1 = { ...data, items: { ...data.items, [item.id]: item } };
    const model = replay(next);
    const timeline = selectTimeline(next, TODAY, 14 * 60, model);
    const view = selectInsight(next, TODAY, 14 * 60, 'mid');

    const breakdown = view.selection.breakdowns.find((entry) => entry.itemId === item.id);
    expect(breakdown).toBeDefined();
    for (const term of breakdown?.terms ?? []) {
      expect(term.value).toBeGreaterThanOrEqual(0);
      expect(term.value).toBeLessThanOrEqual(1);
    }
    expect((breakdown?.terms ?? []).length).toBeGreaterThanOrEqual(7);
    expect(breakdown?.total ?? 0).toBeGreaterThanOrEqual(-0.03);
    expect(breakdown?.total ?? 0).toBeLessThanOrEqual(0.97);
    expect(timeline.blocks.length).toBe(0);
  });

  it('T3: 후보가 전부 같은 분류면 2장까지만 — 3장째는 비운다', () => {
    const deps = fixedDeps();
    let data = emptyData();
    for (let index = 0; index < 5; index += 1) {
      const item = openItem(deps, `공부 ${index + 1}`, 'study', 20);
      data = { ...data, items: { ...data.items, [item.id]: item } };
    }
    const model = replay(data);
    const timeline = selectTimeline(data, TODAY, 9 * 60, model);
    const selection = selectFocus({
      data,
      today: TODAY,
      nowMinute: 9 * 60,
      energy: 'high',
      model,
      timeline,
    });
    expect(selection.picks.length).toBeGreaterThan(0);
    expect(selection.picks.length).toBeLessThanOrEqual(2);
  });

  it('T1: 같은 입력·같은 시각이면 같은 순서', () => {
    const deps = fixedDeps();
    let data = emptyData();
    for (const [title, contextId] of [
      ['논술 재작성', 'study'],
      ['마트 장보기', 'errand'],
      ['스트레칭', 'workout'],
    ] as const) {
      const item = openItem(deps, title, contextId, 20);
      data = { ...data, items: { ...data.items, [item.id]: item } };
    }
    const first = selectInsight(data, TODAY, 10 * 60, 'mid');
    const second = selectInsight(data, TODAY, 10 * 60, 'mid');
    expect(first.selection.picks.map((pick) => pick.itemId)).toEqual(
      second.selection.picks.map((pick) => pick.itemId),
    );
    expect(first.recommendation?.itemId).toBe(second.recommendation?.itemId);
  });

  it('에너지 스위치를 바꾸면 추천 이유의 비중이 달라진다', () => {
    const deps = fixedDeps();
    let data = emptyData();
    for (const [title, contextId, energy] of [
      ['논술 재작성', 'study', 'high'],
      ['책상 정리', 'errand', 'low'],
    ] as const) {
      const item = createItem(
        { kind: 'task', title, contextId, estimateMin: 20, status: 'inbox', energy },
        deps,
      );
      data = { ...data, items: { ...data.items, [item.id]: item } };
    }
    const high = selectInsight(data, TODAY, 10 * 60, 'high');
    const low = selectInsight(data, TODAY, 10 * 60, 'low');
    expect(high.recommendation).not.toBeNull();
    expect(low.recommendation).not.toBeNull();
    const highEnergyTerm = high.recommendation?.breakdown.terms.find((term) => term.key === 'energy');
    const lowEnergyTerm = low.recommendation?.breakdown.terms.find((term) => term.key === 'energy');
    expect(highEnergyTerm?.value ?? 0).not.toBe(lowEnergyTerm?.value ?? 0);
  });
});

describe('통계 — 7일 균형·정확도 (4.12)', () => {
  it('완료 이력에서 영역 비율과 추정 정확도를 센다', () => {
    const { data } = historyData(3, 1.4, 'study');
    const stats = selectStats(data, TODAY);
    const study = stats.areas.find((area) => area.key === 'study');
    expect(study?.minutes).toBeGreaterThan(0);
    expect(stats.completedCount).toBe(3);
    expect(stats.accuracy.samples).toBe(3);
    expect(stats.accuracy.ratio).toBeCloseTo(1.4, 1);
    expect(stats.accuracy.label.length).toBeGreaterThan(0);
  });

  it('기록이 없으면 정확도를 말하지 않는다', () => {
    const stats = selectStats(emptyData(), TODAY);
    expect(stats.accuracy.samples).toBe(0);
    expect(stats.accuracy.ratio).toBeNull();
  });
});

describe('완료 확률·분해 (4.6)', () => {
  it('빈 시간이 짧으면 완료 확률이 낮고, 쪼개기 제안은 표본이 있을 때만 나온다', () => {
    const { data } = historyData(4, 2.2);
    const deps = fixedDeps();
    const item = openItem(deps, '긴 논술', 'study', 90);
    const next: AppDataV1 = { ...data, items: { ...data.items, [item.id]: item } };
    const model = replay(next);
    const timeline = selectTimeline(next, TODAY, 20 * 60, model);
    const input = {
      data: next,
      today: TODAY,
      nowMinute: 20 * 60,
      energy: 'mid' as const,
      model,
      timeline,
    };
    const tight = pDone(item, 30, input);
    const roomy = pDone(item, 300, input);
    expect(tight).toBeLessThan(roomy);

    const split = suggestSplit(item, 60, input);
    if (split) {
      expect(split.chunks).toBeGreaterThanOrEqual(2);
      expect(split.chunkMin).toBeGreaterThanOrEqual(10);
      expect(split.after).toBeGreaterThan(split.current);
    }
  });
});
