/**
 * 백업 — 1탭 파일 내보내기/복원 (6.7). 브라우저 저장소가 정리돼도 우리 손 밖에 사본이 남는다.
 *
 * - `engineCache` 는 이벤트에서 재계산되는 캐시이므로 백업에 넣지 않는다 (D2).
 * - 복원은 반드시 `migrateToLatest` 를 거친다 — 옛 파일을 그대로 덮어쓰지 않는다.
 */
import type { AppDataV1, Instant } from '@core/schema/current';
import { migrateToLatest, MigrationError } from '@core/migrations';

export const BACKUP_APP_ID = 'timekeeper';

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: Instant;
  data: AppDataV1;
}

/** 캐시를 제외한 사본을 만든다. */
export function createBackup(data: AppDataV1, exportedAt: Instant): BackupFile {
  const persisted: AppDataV1 = { ...data };
  delete persisted.engineCache;
  return {
    app: BACKUP_APP_ID,
    schemaVersion: data.schemaVersion,
    exportedAt,
    data: persisted,
  };
}

export function serializeBackup(data: AppDataV1, exportedAt: Instant): string {
  return JSON.stringify(createBackup(data, exportedAt), null, 2);
}

export function backupFileName(at: Instant): string {
  return `timekeeper-backup-${at.replace(/[:]/g, '-')}.json`;
}

export function parseBackup(text: string): AppDataV1 {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new MigrationError('backup is not valid JSON');
  }
  if (typeof raw !== 'object' || raw === null) throw new MigrationError('backup is empty');

  const file = raw as Partial<BackupFile>;
  const payload = file.app === BACKUP_APP_ID ? file.data : raw;
  if (typeof payload !== 'object' || payload === null) {
    throw new MigrationError('backup has no data');
  }

  const migrated = migrateToLatest(payload);
  return migrated as unknown as AppDataV1;
}
