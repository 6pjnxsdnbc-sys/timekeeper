/**
 * 로컬 영속화 — F4(IndexedDB) 전까지의 어댑터 (설계서 6.3).
 *
 * 저장 매체(키-값)는 **app 이 주입**한다. sync 레이어는 브라우저 저장소를 직접
 * 만지지 않으므로(DOM 금지), Node 테스트에서는 메모리 구현을 그대로 쓴다.
 * 읽기는 반드시 `migrateToLatest` 를 거친다 — 옛 데이터를 그대로 덮어쓰지 않는다.
 */
import type { AppDataV1 } from '@core/schema/current';
import { MigrationError, migrateToLatest } from '@core/migrations';
import type { LocalStore } from './idb';

export interface KeyValue {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface PersistedOptions {
  /** 저장 키. 기본 `timekeeper.data.v1` */
  key?: string;
  /** 깨진 데이터를 격리할 때의 시각 표기 (기본 ISO) */
  stamp?: () => string;
}

export const DEFAULT_DATA_KEY = 'timekeeper.data.v1';

function readRaw(kv: KeyValue, key: string): string | null {
  try {
    return kv.get(key);
  } catch {
    return null;
  }
}

export function createPersistedStore(kv: KeyValue, options: PersistedOptions = {}): LocalStore {
  const key = options.key ?? DEFAULT_DATA_KEY;
  const stamp = options.stamp ?? (() => new Date().toISOString());

  const quarantine = (raw: string): void => {
    try {
      kv.set(`${key}.corrupt.${stamp()}`, raw);
      kv.remove(key);
    } catch {
      // 격리도 실패하면 원본을 그대로 둔다 — 지우는 것보다 낫다.
    }
  };

  return {
    load(): AppDataV1 | null {
      const raw = readRaw(kv, key);
      if (raw === null) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        const migrated = migrateToLatest(parsed);
        return migrated as unknown as AppDataV1;
      } catch (error) {
        if (error instanceof MigrationError || error instanceof SyntaxError) {
          quarantine(raw);
          return null;
        }
        throw error;
      }
    },
    save(data: AppDataV1): void {
      try {
        kv.set(key, JSON.stringify(data));
      } catch {
        // 용량 초과·사생활 모드 — 메모리 상태로 계속 동작한다 (6.1 원칙 3).
      }
    },
    clear(): void {
      try {
        kv.remove(key);
      } catch {
        // 무시: 다음 save 가 다시 쓴다.
      }
    },
  };
}

/** 테스트·미리보기용 메모리 키-값 */
export function createMemoryKeyValue(seed: Record<string, string> = {}): KeyValue {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}
