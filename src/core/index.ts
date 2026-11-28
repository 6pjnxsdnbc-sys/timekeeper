/**
 * core — 레이어 2의 공개 API. 바깥 레이어는 이 배럴을 통해서만 core 를 만난다.
 * (내부 파일끼리는 직접 import 해도 된다 — 경계는 레이어 사이에만 있다.)
 */
export { POLICY, engineWeightSum, resolveFocusCards, selectionWeights, type Policy } from './policy';
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

// ── F2·F3 엔진·메커니즘 ────────────────────────────
export { replay, ENGINE_CELLS } from './engine/replay';
export {
  estimateItem,
  estimateKind,
  actualOrCorrected,
} from './engine/durationModel';
export {
  blockIndex,
  energyAt,
  focusCurve,
  pFinish,
  recoveryDelta,
  requiredEnergy,
  switchValue,
} from './engine/energyModel';
export {
  AREA_LABELS,
  areaOf,
  balanceScore,
  candidatesOf,
  pDone,
  recommendOne,
  recommendationContext,
  scoreItem,
  selectAreaMinutes,
  selectFocus,
  suggestSplit,
  type AreaKey,
  type AreaMinutes,
  type ScoreInput,
} from './engine/recommender';
export {
  selectStats,
  type AccuracyStat,
  type AreaStat,
  type DayStat,
  type StatsView,
} from './engine/statsModel';
export type {
  ReasonChip,
  ScoreBreakdown,
  ScoreTerm,
  ScoreTermKey,
  Selection,
} from './engine/types';
export { clamp, normalCdf, round5, sigmoid, toPercent } from './engine/math';

export {
  applyProbeVerdict,
  autoMvsFor,
  completeFocus,
  completeWorkout,
  abandonFocus,
  currentEnergy,
  dismissProbe,
  ensureWorkoutItem,
  extendFocus,
  loadSampleDay,
  markStarted,
  pauseFocus,
  resumeFocus,
  scheduleItem,
  setEnergyLevel,
  setEstimate,
  setMvsLabel,
  setWorkoutPlan,
  shouldOfferProbe,
  startFocus,
  startProbe,
  unscheduleItem,
  type AdhdCtx,
  type AdhdFailure,
  type AdhdResult,
} from './rules/adhd';

export {
  composeMvs,
  extractObject,
  mvsKindOf,
  mvsTargetMin,
  MVS_PATTERNS,
  type ComposedMvs,
  type MvsKind,
} from './data/mvs';

export {
  formatTimelineClock,
  gapAt,
  normalizeMinute,
  selectTimeline,
  type TimelineBlock,
  type TimelineGap,
  type TimelineView,
  type UnplacedItem,
} from './selectors/timeline';
export {
  selectInsight,
  type InsightView,
  type MvsView,
  type WorkoutView,
} from './selectors/insight';
