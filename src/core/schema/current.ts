/**
 * current — 앱이 지금 쓰는 스키마 버전의 공개 지점.
 * 마이그레이션이 v2 를 만들면 이 파일만 v2 를 가리키게 한다.
 * 나머지 코드는 `@core/schema/current` 만 import 한다.
 */
export { SCHEMA_VERSION } from './v1';
export type {
  AppDataV1,
  AnchorItem,
  Context,
  DailySnapshot,
  Difficulty,
  Energy,
  EngineEvent,
  EngineEventType,
  EngineWeights,
  ErrandItem,
  Estimate,
  Exploration,
  Goal,
  Instant,
  Intensity,
  Item,
  ItemBase,
  ItemId,
  ItemKind,
  ItemStatus,
  LocalDate,
  Minutes,
  ModelState,
  Placement,
  Recurrence,
  Settings,
  TaskItem,
  TimeCell,
  WorkoutItem,
  WorkoutRoutine,
} from './v1';
