/**
 * selectTodayBoard — 화면이 쓰는 파생 상태 (설계서 3.8).
 * 파생값은 저장하지 않는다(D2). 카드·후보·완료 목록은 매번 다시 계산한다.
 */
import type { AppDataV1, Context, Item, LocalDate } from '../schema/current';
import { POLICY } from '../policy';
import { STRINGS } from '../content/strings.ko';
import { INBOX_CONTEXT_ID } from '../data/contexts';
import { formatClock, formatMinutes } from '../rules/day';

export interface CardMeta {
  contextLabel: string;
  estimateLabel: string;
  estimateAssumed: boolean;
  /** 카드에 붙는 라벨 — 오늘 고정 / 19:00 / 12/5 마감 */
  labels: string[];
}

export interface CardView {
  item: Item;
  meta: CardMeta;
  /** ① ② ③ — 배열 순서가 곧 카드 번호다 */
  index: number;
}

export interface BoardView {
  today: LocalDate;
  cards: CardView[];
  capacity: number;
  emptySlots: number;
  full: boolean;
  candidates: CardView[];
  hiddenCandidateCount: number;
  completed: Item[];
  /** 카드가 다 비었고 인박스에 후보가 있을 때 한 줄 제안 (자동 추가 없음) */
  extraOffer: boolean;
  /** 꽉 찼는데 올릴 후보가 있을 때 안내 1줄 */
  fullHint: boolean;
}

export interface BoardViewOptions {
  capacity?: number;
  inboxLimit?: number;
}

function monthDay(date: LocalDate): [number, number] {
  return [Number(date.slice(5, 7)), Number(date.slice(8, 10))];
}

export function selectCardMeta(item: Item, contexts: Record<string, Context>, today: LocalDate): CardMeta {
  const labels: string[] = [];
  if (item.placement?.date === today) labels.push(formatClock(item.placement.startMin));
  const dueDate = item.kind === 'task' ? item.dueDate : undefined;
  const priority = item.kind === 'task' ? item.priority : undefined;
  if (dueDate) {
    if (priority === 1 && dueDate === today) {
      labels.push(STRINGS.card.pinned);
    } else if (dueDate === today) {
      labels.push(STRINGS.card.dueToday);
    } else {
      labels.push(STRINGS.card.due(...monthDay(dueDate)));
    }
  }
  const estimateAssumed = item.estimateAssumed === true;
  const contextLabel =
    item.contextId === INBOX_CONTEXT_ID
      ? STRINGS.card.unsorted
      : (contexts[item.contextId]?.label ?? STRINGS.card.unsorted);
  return {
    contextLabel,
    estimateLabel: item.estimateMin > 0 ? formatMinutes(item.estimateMin) : STRINGS.card.unknownEstimate,
    estimateAssumed,
    labels,
  };
}

export function selectBoardView(
  data: AppDataV1,
  today: LocalDate,
  options: BoardViewOptions = {},
): BoardView {
  const capacity = options.capacity ?? POLICY.maxFocusCards;
  const inboxLimit = options.inboxLimit ?? POLICY.inboxVisibleLimit;
  const snapshot = data.snapshots[today];

  const cards: CardView[] = [];
  for (const pick of snapshot?.focusPicks ?? []) {
    const item = data.items[pick.itemId];
    if (!item || item.deletedAt || item.status === 'done') continue;
    if (cards.some((card) => card.item.id === item.id)) continue;
    cards.push({ item, meta: selectCardMeta(item, data.contexts, today), index: cards.length });
    if (cards.length >= capacity) break;
  }

  const completed = (snapshot?.completed ?? [])
    .map((id) => data.items[id])
    .filter((item): item is Item => Boolean(item) && !item?.deletedAt);

  const candidates = Object.values(data.items)
    .filter((item) => !item.deletedAt && item.status === 'inbox')
    .filter((item) => !item.deferUntil || item.deferUntil <= today)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));

  const full = cards.length >= capacity;
  return {
    today,
    cards,
    capacity,
    emptySlots: Math.max(0, capacity - cards.length),
    full,
    candidates: candidates
      .slice(0, inboxLimit)
      .map((item) => ({ item, meta: selectCardMeta(item, data.contexts, today), index: 0 })),
    hiddenCandidateCount: Math.max(0, candidates.length - inboxLimit),
    completed,
    extraOffer: cards.length === 0 && completed.length > 0 && candidates.length > 0,
    fullHint: full && candidates.length > 0,
  };
}
