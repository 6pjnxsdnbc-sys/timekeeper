/**
 * capture — 한 줄 입력을 항목으로 만든다 (설계서 1.4 M1).
 *
 * 저장은 **항상 성공**한다. 파서가 못 읽으면 인박스 + 15분으로 저장하고,
 * 읽은 것은 그대로 반영한다. 오늘 보드가 꽉 찼으면 인박스에 담고 그 사실만 알린다.
 */
import type { AppDataV1, Item, LocalDate, Placement } from '../schema/current';
import type { FactoryDeps } from '../schema/factory';
import { createItem } from '../schema/factory';
import { INBOX_CONTEXT_ID } from '../data/contexts';
import { STRINGS } from '../content/strings.ko';
import { addDays } from './day';
import { parseCapture } from './parseCapture';
import { promotedToToday, type BoardFailure } from './todayBoard';

export interface CaptureCtx {
  data: AppDataV1;
  today: LocalDate;
  deps: FactoryDeps;
  capacity?: number;
}

export interface CaptureResult {
  data: AppDataV1;
  item: Item;
  placedOnBoard: boolean;
  reason?: BoardFailure;
}

export function captureFromText(ctx: CaptureCtx, text: string): CaptureResult {
  const parse = parseCapture(text, { today: ctx.today, contexts: ctx.data.contexts });
  const context = ctx.data.contexts[parse.contextId];
  const title = parse.title || STRINGS.capture.untitled;
  const wantsErrand = context?.kind === 'errand' && parse.contextId !== INBOX_CONTEXT_ID;

  const base = wantsErrand
    ? createItem(
        {
          kind: 'errand',
          title,
          contextId: parse.contextId,
          energy: parse.energy,
          estimateMin: parse.estimateMin,
          status: 'inbox',
        },
        ctx.deps,
      )
    : createItem(
        {
          kind: 'task',
          title,
          contextId: parse.contextId,
          energy: parse.energy,
          estimateMin: parse.estimateMin,
          status: 'inbox',
          priority: parse.pinned ? 1 : 2,
          ...(parse.dueDate ? { dueDate: parse.dueDate } : {}),
        },
        ctx.deps,
      );

  const item: Item = { ...base };
  if (parse.estimateAssumed) item.estimateAssumed = true;
  if (parse.startMin !== undefined) {
    const placement: Placement = {
      date: ctx.today,
      startMin: parse.startMin,
      durationMin: parse.estimateMin,
      source: 'manual',
    };
    item.placement = placement;
  }
  if (parse.when === 'tomorrow') item.deferUntil = addDays(ctx.today, 1);

  const data: AppDataV1 = { ...ctx.data, items: { ...ctx.data.items, [item.id]: item } };

  if (parse.when !== 'today') return { data, item, placedOnBoard: false };

  const promoted = promotedToToday({ ...ctx, data }, item.id);
  if (promoted.ok) {
    return {
      data: promoted.data,
      item: promoted.data.items[item.id] ?? item,
      placedOnBoard: true,
    };
  }
  return { data, item, placedOnBoard: false, reason: promoted.reason };
}
