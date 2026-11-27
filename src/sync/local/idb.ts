/**
 * 로컬 저장소 (F0: 메모리 구현 → F4에서 IndexedDB 로 교체).
 *
 * 인터페이스를 먼저 고정해 두면 F4는 이 파일 안에서만 끝난다.
 * `app/store.ts` 가 이 저장소를 주입받고, `ui` 는 존재조차 모른다.
 */
import type { AppDataV1 } from '@core/schema/current';

export interface LocalStore {
  load(): AppDataV1 | null;
  save(data: AppDataV1): void;
  clear(): void;
}

export function createMemoryStore(initial: AppDataV1 | null = null): LocalStore {
  let data = initial;
  return {
    load: () => data,
    save: (next) => {
      data = next;
    },
    clear: () => {
      data = null;
    },
  };
}
