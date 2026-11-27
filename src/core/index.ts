/**
 * core — 레이어 2의 공개 API. 바깥 레이어는 이 배럴을 통해서만 core 를 만난다.
 * (내부 파일끼리는 직접 import 해도 된다 — 경계는 레이어 사이에만 있다.)
 */
export { POLICY, engineWeightSum, resolveFocusCards, type Policy } from './policy';
export * from './schema/current';
export * from './schema/factory';
export * from './migrations';
export * from './data/contexts';
export * from './data/routines';
export * from './content/strings.ko';

// ── F1 규칙·셀렉터 ────────────────────────────────
export {
  addDays,
  compareDate,
  formatClock,
  formatMinutes,
  isBefore,
  localDateOf,
  logicalDate,
  makeDate,
  minutesOfDay,
  wallClock,
  type WallClock,
} from './rules/day';
export {
  parseCapture,
  type CaptureParse,
  type CaptureParseInput,
  type CaptureWhen,
} from './rules/parseCapture';
export { captureFromText, type CaptureCtx, type CaptureResult } from './rules/capture';
export {
  activeCards,
  completedOnBoard,
  demotedToInbox,
  postponedToTomorrow,
  promotedToToday,
  removedItem,
  restoredItem,
  todaySnapshot,
  ON_BOARD_STATUSES,
  type BoardCtx,
  type BoardFailure,
  type BoardResult,
} from './rules/todayBoard';
export { hasRunOn, runRollover, type RolloverCtx, type RolloverResult } from './rules/rollover';
export {
  selectBoardView,
  selectCardMeta,
  type BoardView,
  type BoardViewOptions,
  type CardMeta,
  type CardView,
} from './selectors/todayBoard';
