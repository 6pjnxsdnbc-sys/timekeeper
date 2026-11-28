/**
 * viewMode — 상단 뷰 스위처가 고르는 세 가지 배치.
 * 값의 정의는 ui 에 있고(app 은 ui 를 쓸 수 있다), 여기서는 저장만 맡는다.
 */
import type { ViewMode } from '@ui';

export type { ViewMode };

export const VIEW_MODES: readonly ViewMode[] = ['dashboard', 'focus', 'list', 'split'];
export const VIEW_STORAGE_KEY = 'timekeeper.view';

export function isViewMode(value: unknown): value is ViewMode {
  return typeof value === 'string' && (VIEW_MODES as readonly string[]).includes(value);
}

export function readViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    return isViewMode(stored) ? stored : 'dashboard';
  } catch {
    return 'dashboard';
  }
}

export function saveViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  } catch {
    // 저장소가 막혀도 이번 세션 동안은 동작한다.
  }
}
