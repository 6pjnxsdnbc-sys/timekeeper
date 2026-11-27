/**
 * sync — 레이어 4의 공개 API. 저장소 교체는 이 레이어 안에서 끝난다.
 */
export type { ChangeSet, PullResult, SyncAdapter, SyncStatus } from './adapter';
export { createMemoryStore, type LocalStore } from './local/idb';
export {
  DEFAULT_DATA_KEY,
  createMemoryKeyValue,
  createPersistedStore,
  type KeyValue,
  type PersistedOptions,
} from './local/kv';
export {
  BACKUP_APP_ID,
  backupFileName,
  createBackup,
  parseBackup,
  serializeBackup,
  type BackupFile,
} from './backup';
