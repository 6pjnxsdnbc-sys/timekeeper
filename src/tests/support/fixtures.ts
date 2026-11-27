/**
 * 테스트 픽스처 — 시계와 id 를 고정해 결정적으로 만든다.
 */
import type { AppDataV1, Instant, Item, LocalDate } from '@core/schema/current';
import { createAppData, createItem, createSettings, type FactoryDeps, type NewItemInput } from '@core';

export const TODAY: LocalDate = '2026-11-27';
export const NOW: Instant = '2026-11-27T20:00:00+09:00';

export interface TestDeps extends FactoryDeps {
  now: () => Instant;
}

export function fixedDeps(now: Instant = NOW): TestDeps {
  let seq = 0;
  return {
    id: () => {
      seq += 1;
      return `id-${String(seq).padStart(3, '0')}`;
    },
    now: () => now,
  };
}

export function emptyData(): AppDataV1 {
  return createAppData(createSettings({ deviceId: 'test-device' }));
}

export function withItems(items: Item[]): AppDataV1 {
  const data = emptyData();
  const map: Record<string, Item> = {};
  for (const item of items) map[item.id] = item;
  return { ...data, items: map };
}

export function makeItem(deps: FactoryDeps, input: NewItemInput): Item {
  return createItem(input, deps);
}
