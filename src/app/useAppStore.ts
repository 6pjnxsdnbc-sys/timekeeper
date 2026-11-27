/**
 * useAppStore — store 를 React 에 구독시킨다. 화면은 store 를 모른다.
 */
import { useSyncExternalStore } from 'react';
import type { StoreSnapshot } from './store';
import type { AppStore } from './store';

export function useAppStore(store: AppStore): StoreSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
