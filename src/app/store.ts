/**
 * store — 명령→상태, 어댑터 주입 (설계서 10.1).
 * 도메인 규칙은 여기 없다. F0에서는 초기 AppData 를 만들고 로컬 저장소를 붙인다.
 */
import type { AppDataV1 } from '@core/schema/current';
import { createAppData, createSettings, type FactoryDeps } from '@core';
import { createMemoryStore, type LocalStore } from '@sync';

export interface AppStore {
  data: AppDataV1;
  local: LocalStore;
  deps: FactoryDeps;
}

export function createAppStore(deps?: Partial<FactoryDeps>): AppStore {
  const resolvedDeps: FactoryDeps = {
    id: deps?.id ?? (() => crypto.randomUUID()),
    now: deps?.now ?? (() => new Date().toISOString()),
  };

  const settings = createSettings({
    deviceId: resolvedDeps.id(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const data = createAppData(settings);

  return { data, local: createMemoryStore(data), deps: resolvedDeps };
}
