/**
 * ui — 레이어 3의 공개 API. 화면은 여기서만 나간다.
 */
export { TodayScreen, type TodayScreenProps } from './screens/TodayScreen';
export { ThemeStudio, type ThemeStudioProps } from './features/theme/ThemeStudio';
export type { StudioState } from './features/theme/types';
export { ViewSwitcher, type ViewMode, type ViewSwitcherProps } from './features/views/ViewSwitcher';
export { QuickCapture, type QuickCaptureProps } from './features/capture/QuickCapture';
export { TodayBoard, type TodayBoardProps } from './features/focus-board/TodayBoard';
export { CompletedPanel, type CompletedPanelProps } from './features/focus-board/CompletedPanel';
export { InboxList, type InboxListProps } from './features/inbox/InboxList';
export { ItemCard, type ItemCardProps } from './patterns/ItemCard';
export { Icon, type IconName, type IconProps } from './primitives/Icon';
export { Card, type CardProps } from './primitives/Card';
export { Chip, type ChipProps } from './primitives/Chip';
export { Button, type ButtonProps } from './primitives/Button';
export { Toast, type ToastProps } from './primitives/Toast';
export { Overlay, type OverlayProps } from './primitives/Overlay';
export { EmptyState, type EmptyStateProps } from './patterns/EmptyState';
export { EnergySwitch, type EnergySwitchProps } from './features/energy/EnergySwitch';
export { RecommendStrip, type RecommendStripProps } from './features/recommend/RecommendStrip';
export {
  TimelinePanel,
  type PendingPlacement,
  type TimelinePanelProps,
  type TimelineSuggestion,
} from './features/timeline/TimelinePanel';
export { InsightsPanel, type InsightsPanelProps } from './features/insights/InsightsPanel';
export { FocusOverlay, type FocusOverlayProps } from './features/focus/FocusOverlay';
export { ProbeOverlay, type ProbeOverlayProps } from './features/probe/ProbeOverlay';
export { ExplainSheet, type ExplainSheetProps } from './features/explain/ExplainSheet';
