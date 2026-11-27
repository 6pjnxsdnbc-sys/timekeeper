/**
 * store — 명령→상태, 어댑터 주입 (설계서 10.1).
 * 도메인 규칙은 `core` 에 있다. 여기서는 상태를 들고, 저장하고, 알린다.
 *
 * F1의 영속화는 키-값 어댑터(localStorage)다. F4에서 sync 어댑터만 갈아끼우면
 * 화면은 그대로 동작한다.
 */
import type { AppDataV1, Instant, ItemId, LocalDate, Settings } from '@core/schema/current';
import {
  SCHEMA_VERSION,
  captureFromText,
  completedOnBoard,
  createAppData,
  createSettings,
  defaultContextMap,
  demotedToInbox,
  logicalDate,
  postponedToTomorrow,
  promotedToToday,
  removedItem,
  resolveFocusCards,
  runRollover,
  type BoardCtx,
  type BoardFailure,
  type FactoryDeps,
} from '@core';
import type { LocalStore } from '@sync';
import { createId } from './storage';

export interface AppStoreOptions {
  storage: LocalStore;
  now?: () => Instant;
  id?: () => string;
  timezone?: string;
}

export type CommandReason = BoardFailure | 'empty';

export interface CommandOutcome {
  ok: boolean;
  reason?: CommandReason;
  undoable: boolean;
}

export interface CaptureOutcome extends CommandOutcome {
  itemId?: ItemId;
  placedOnBoard: boolean;
}

export interface StoreSnapshot {
  data: AppDataV1;
  today: LocalDate;
}

export interface AppStore {
  getState(): AppDataV1;
  getToday(): LocalDate;
  getSnapshot(): StoreSnapshot;
  subscribe(listener: () => void): () => void;
  capture(text: string): CaptureOutcome;
  promote(itemId: ItemId): CommandOutcome;
  demote(itemId: ItemId): CommandOutcome;
  complete(itemId: ItemId): CommandOutcome;
  postpone(itemId: ItemId): CommandOutcome;
  remove(itemId: ItemId): CommandOutcome;
  undo(): boolean;
  canUndo(): boolean;
  /** 하루 경계를 지났으면 롤오버. 바뀌었으면 true. */
  syncDay(): boolean;
  /** 다른 탭이 저장한 것을 다시 읽는다 (storage 이벤트). */
  reload(): boolean;
}

function resolveTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
  } catch {
    return 'Asia/Seoul';
  }
}

function normalize(stored: AppDataV1 | null, deps: FactoryDeps, timezone?: string): AppDataV1 {
  const zone = timezone ?? resolveTimeZone();
  if (!stored) {
    return createAppData(createSettings({ deviceId: deps.id(), timezone: zone }));
  }
  const fallback = createSettings({
    deviceId: stored.settings?.deviceId ?? deps.id(),
    timezone: stored.settings?.timezone ?? zone,
  });
  const settings: Settings = { ...fallback, ...(stored.settings ?? {}) };
  return {
    schemaVersion: SCHEMA_VERSION,
    settings,
    items: stored.items ?? {},
    goals: stored.goals ?? {},
    contexts: { ...defaultContextMap(), ...(stored.contexts ?? {}) },
    snapshots: stored.snapshots ?? {},
    events: stored.events ?? {},
  };
}

export function createAppStore(options: AppStoreOptions): AppStore {
  const now = options.now ?? (() => new Date().toISOString());
  const id = options.id ?? createId;
  const deps: FactoryDeps = { id, now };

  let data = normalize(options.storage.load(), deps, options.timezone);
  let today = logicalDate(now(), data.settings.dayStartHour);
  let undoData: AppDataV1 | null = null;
  let snapshot: StoreSnapshot = { data, today };
  const listeners = new Set<() => void>();

  const persist = () => options.storage.save(data);
  const publish = () => {
    snapshot = { data, today };
    for (const listener of listeners) listener();
  };

  const commit = (next: AppDataV1) => {
    data = next;
    persist();
    publish();
  };

  // 부팅 시 하루 경계 처리 — 어제의 미완료 카드는 조용히 인박스로.
  const boot = runRollover({ data, today, deps });
  if (boot.didRun) {
    data = boot.data;
    persist();
  }

  const refreshDay = (): boolean => {
    const next = logicalDate(now(), data.settings.dayStartHour);
    if (next === today) return false;
    today = next;
    const result = runRollover({ data, today, deps });
    if (result.didRun) data = result.data;
    persist();
    publish();
    return true;
  };

  const boardCtx = (): BoardCtx => ({
    data,
    today,
    deps,
    capacity: resolveFocusCards(data.settings),
  });

  const run = (
    command: (ctx: BoardCtx) => { data: AppDataV1; ok: boolean; reason?: BoardFailure },
  ): CommandOutcome => {
    refreshDay();
    const previous = data;
    const result = command(boardCtx());
    if (!result.ok) return { ok: false, reason: result.reason, undoable: false };
    undoData = previous;
    commit(result.data);
    return { ok: true, undoable: true };
  };

  return {
    getState: () => data,
    getToday: () => today,
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    capture(text) {
      const trimmed = text.trim();
      if (!trimmed) return { ok: false, reason: 'empty', undoable: false, placedOnBoard: false };
      refreshDay();
      const previous = data;
      const result = captureFromText(boardCtx(), trimmed);
      undoData = previous;
      commit(result.data);
      return {
        ok: true,
        undoable: true,
        itemId: result.item.id,
        placedOnBoard: result.placedOnBoard,
        ...(result.reason ? { reason: result.reason } : {}),
      };
    },
    promote: (itemId) => run((ctx) => promotedToToday(ctx, itemId)),
    demote: (itemId) => run((ctx) => demotedToInbox(ctx, itemId)),
    complete: (itemId) => run((ctx) => completedOnBoard(ctx, itemId)),
    postpone: (itemId) => run((ctx) => postponedToTomorrow(ctx, itemId)),
    remove: (itemId) => run((ctx) => removedItem(ctx, itemId)),
    undo() {
      if (!undoData) return false;
      data = undoData;
      undoData = null;
      persist();
      publish();
      return true;
    },
    canUndo: () => undoData !== null,
    syncDay: () => refreshDay(),
    reload() {
      const stored = options.storage.load();
      if (!stored) return false;
      data = normalize(stored, deps, options.timezone);
      today = logicalDate(now(), data.settings.dayStartHour);
      undoData = null;
      publish();
      return true;
    },
  };
}
