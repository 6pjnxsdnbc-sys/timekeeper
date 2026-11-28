/**
 * selectTimeline — 하루의 시간축 (설계서 5.7 미니 타임라인 · 5.8).
 *
 * 04:00 을 0시로 두고 28:00 까지를 하루로 본다. 시각이 지정된 앵커와
 * 배치된 항목이 블록이 되고, 남은 구간이 "지금 쓸 수 있는 시간"이다.
 * 파생값이므로 저장하지 않는다(D2).
 */
import type { AppDataV1, Estimate, Item, ItemId, LocalDate } from '../schema/current';
import { POLICY } from '../policy';
import { wallClock } from '../rules/day';
import { estimateItem } from '../engine/durationModel';
import type { ModelState } from '../schema/current';

export interface TimelineBlock {
  key: string;
  itemId: ItemId;
  title: string;
  startMin: number;
  endMin: number;
  kind: Item['kind'];
  contextId: string;
  /** 'done' = 오늘 이미 끝남(흐리게), 'active' = 지금 진행 중, 'planned' = 예정 */
  state: 'done' | 'active' | 'planned';
  /** 앵커(고정 일정)는 옮길 수 없다 */
  locked: boolean;
}

export interface TimelineGap {
  startMin: number;
  endMin: number;
  minutes: number;
}

export interface UnplacedItem {
  item: Item;
  estimate: Estimate;
}

export interface TimelineView {
  dayStartMin: number;
  dayEndMin: number;
  /** 하루 경계 기준으로 편 시각 — 04:00 이전이면 +24h */
  nowMin: number;
  startHour: number;
  endHour: number;
  blocks: TimelineBlock[];
  gaps: TimelineGap[];
  unplaced: UnplacedItem[];
  /** 지금부터 하루 끝까지 비어 있는 분 */
  freeFromNow: number;
  /** 다음 고정 일정까지 남은 분 (없으면 하루 끝) */
  untilNextBlock: number;
  density: number;
}

export function normalizeMinute(minute: number, dayStartHour: number): number {
  const dayStart = dayStartHour * 60;
  return minute < dayStart ? minute + 24 * 60 : minute;
}

function anchorMinutes(item: Item, today: LocalDate, dayStartHour: number): { start: number; end: number } | null {
  if (item.kind !== 'anchor') return null;
  const start = wallClock(item.startAt);
  const end = wallClock(item.endAt);
  if (!start || start.date !== today) return null;
  const startMin = normalizeMinute(start.hour * 60 + start.minute, dayStartHour);
  const endMin = normalizeMinute(end ? end.hour * 60 + end.minute : startMin + item.estimateMin, dayStartHour);
  return { start: startMin, end: Math.max(startMin + 5, endMin) };
}

export function selectTimeline(
  data: AppDataV1,
  today: LocalDate,
  nowMinute: number,
  model: ModelState,
): TimelineView {
  const dayStartHour = data.settings.dayStartHour ?? POLICY.dayStartHour;
  const dayStartMin = dayStartHour * 60;
  const dayEndMin = dayStartMin + 24 * 60;
  const nowMin = normalizeMinute(nowMinute, dayStartHour);

  const blocks: TimelineBlock[] = [];
  const unplaced: UnplacedItem[] = [];

  for (const item of Object.values(data.items)) {
    if (item.deletedAt || item.status === 'dropped') continue;

    const anchor = anchorMinutes(item, today, dayStartHour);
    if (anchor) {
      blocks.push({
        key: `anchor:${item.id}`,
        itemId: item.id,
        title: item.title,
        startMin: Math.max(dayStartMin, anchor.start),
        endMin: Math.min(dayEndMin, anchor.end),
        kind: item.kind,
        contextId: item.contextId,
        state: 'planned',
        locked: true,
      });
      continue;
    }

    const placement = item.placement;
    if (placement && placement.date === today && item.status !== 'done') {
      const startMin = normalizeMinute(placement.startMin, dayStartHour);
      blocks.push({
        key: `placement:${item.id}`,
        itemId: item.id,
        title: item.title,
        startMin,
        endMin: Math.min(dayEndMin, startMin + Math.max(5, placement.durationMin)),
        kind: item.kind,
        contextId: item.contextId,
        state: startMin <= nowMin && nowMin < startMin + Math.max(5, placement.durationMin) ? 'active' : 'planned',
        locked: false,
      });
      continue;
    }

    if (
      item.status === 'inbox' ||
      item.status === 'planned' ||
      item.status === 'doing' ||
      item.status === 'started'
    ) {
      if (item.deferUntil && item.deferUntil > today) continue;
      unplaced.push({ item, estimate: estimateItem(item, model) });
    }
  }

  blocks.sort((a, b) => (a.startMin === b.startMin ? (a.key < b.key ? -1 : 1) : a.startMin - b.startMin));

  const gaps: TimelineGap[] = [];
  let cursor = dayStartMin;
  for (const block of blocks) {
    if (block.startMin > cursor) {
      gaps.push({ startMin: cursor, endMin: block.startMin, minutes: block.startMin - cursor });
    }
    cursor = Math.max(cursor, block.endMin);
  }
  if (cursor < dayEndMin) {
    gaps.push({ startMin: cursor, endMin: dayEndMin, minutes: dayEndMin - cursor });
  }

  const nextBlock = blocks.find((block) => block.startMin > nowMin);
  const untilNextBlock = nextBlock ? nextBlock.startMin - nowMin : Math.max(0, dayEndMin - nowMin);
  const freeFromNow = gaps
    .filter((gap) => gap.endMin > nowMin)
    .reduce((sum, gap) => sum + (gap.endMin - Math.max(gap.startMin, nowMin)), 0);

  const plannedMinutes = blocks.reduce((sum, block) => sum + (block.endMin - block.startMin), 0);

  return {
    dayStartMin,
    dayEndMin,
    nowMin,
    startHour: dayStartHour,
    endHour: dayStartHour + 24,
    blocks,
    gaps,
    unplaced,
    freeFromNow,
    untilNextBlock,
    density: Math.round((plannedMinutes / (dayEndMin - dayStartMin)) * 100) / 100,
  };
}

/** 지금 시각에서 다음 블록까지의 빈 구간(분). 후보의 시간 적합 계산에 쓴다. */
export function gapAt(timeline: TimelineView, minute: number): number {
  for (const block of timeline.blocks) {
    if (block.startMin > minute) return Math.max(0, block.startMin - minute);
    if (block.startMin <= minute && minute < block.endMin) return 0;
  }
  return Math.max(0, timeline.dayEndMin - minute);
}

export function formatTimelineClock(minute: number): string {
  const whole = ((Math.round(minute) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(whole / 60);
  const min = whole % 60;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
