/**
 * 마이그레이션 파이프라인 (설계서 3.5).
 *
 * 원칙 — 한 단계씩(v1→v2) / 순수 함수 / 실행 전 자동 백업 / 실패 시 격리 /
 * 상위 버전은 읽기 전용 잠금 / 실데이터 픽스처 보존.
 * v1 이 첫 버전이므로 지금 `migrations` 는 비어 있다.
 */
import { SCHEMA_VERSION } from '../schema/current';

export type PersistedData = Record<string, unknown> & { schemaVersion?: number };

export interface Migration {
  from: number;
  to: number;
  describe: string;
  migrate(input: PersistedData): PersistedData;
}

export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** 저장소가 앱보다 새로운 버전이면 아무것도 하지 않고 읽기 전용으로 잠근다. */
export class UpgradeRequiredError extends MigrationError {}

/** 중간 단계가 없으면 데이터를 건드리지 않고 멈춘다 (부분 마이그레이션 금지). */
export class MigrationGapError extends MigrationError {}

export const migrations: readonly Migration[] = [];

function readVersion(raw: unknown): number {
  if (typeof raw !== 'object' || raw === null) return 0;
  const v = (raw as PersistedData).schemaVersion;
  return typeof v === 'number' && Number.isInteger(v) ? v : 0;
}

export function migrateToLatest(raw: unknown, latest: number = SCHEMA_VERSION): PersistedData {
  if (typeof raw !== 'object' || raw === null) {
    throw new MigrationError('stored data is not an object');
  }

  let data = raw as PersistedData;
  let version = readVersion(data);

  if (version > latest) {
    throw new UpgradeRequiredError(`stored v${version} > app v${latest}`);
  }

  let guard = 0;
  while (version < latest) {
    const step = migrations.find((m) => m.from === version);
    if (!step) throw new MigrationGapError(`no migration from v${version}`);
    if (++guard > 100) throw new MigrationGapError('migration loop');
    data = { ...step.migrate(data), schemaVersion: step.to };
    version = step.to;
  }
  return data;
}

/**
 * 실행 전 백업 파일 이름 — 이 문자열을 가진 파일이 남아 있으면
 * 마이그레이션이 실패해도 원본을 되살릴 수 있다.
 */
export function preMigrationBackupName(fromVersion: number, at: Date): string {
  const stamp = at.toISOString().replace(/[:.]/g, '-').replace('Z', '');
  return `pre-migration-v${fromVersion}-${stamp}.json`;
}
