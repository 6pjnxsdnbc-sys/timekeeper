import { describe, expect, it } from 'vitest';
import {
  MigrationError,
  MigrationGapError,
  UpgradeRequiredError,
  migrateToLatest,
  migrations,
  preMigrationBackupName,
} from '@core/migrations';

describe('migrations — 무손실 · 한 단계씩 (3.5)', () => {
  it('v1 데이터는 그대로 통과한다', () => {
    const data = { schemaVersion: 1, items: {}, settings: { deviceId: 'd1' } };
    expect(migrateToLatest(data)).toEqual(data);
  });

  it('v1이 첫 버전이므로 등록된 마이그레이션이 없다', () => {
    expect(migrations).toHaveLength(0);
  });

  it('저장소가 앱보다 새 버전이면 읽기 전용 잠금 오류다', () => {
    expect(() => migrateToLatest({ schemaVersion: 2 })).toThrow(UpgradeRequiredError);
  });

  it('버전이 없거나 중간 단계가 비면 데이터를 건드리지 않고 멈춘다', () => {
    expect(() => migrateToLatest({ items: {} })).toThrow(MigrationGapError);
    expect(() => migrateToLatest(null)).toThrow(MigrationError);
  });

  it('백업 파일 이름은 버전과 시각을 담는다', () => {
    const name = preMigrationBackupName(1, new Date('2026-11-27T19:52:00.000Z'));
    expect(name).toBe('pre-migration-v1-2026-11-27T19-52-00-000.json');
  });
});
