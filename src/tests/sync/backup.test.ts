import { describe, expect, it } from 'vitest';
import { createAppData, createSettings } from '@core/schema/factory';
import {
  backupFileName,
  createBackup,
  parseBackup,
  serializeBackup,
} from '@sync/backup';

function sampleData() {
  const data = createAppData(createSettings({ deviceId: 'device-1' }));
  return {
    ...data,
    engineCache: {
      version: 'e1.2',
      replayedEvents: 0,
      global: { nEff: 0, muLog: 0, sigmaLog: 0.6, interruptRate: 0.5 },
      byContext: {},
      energy: { blocks: [], days: 0 },
      start: {},
    },
  };
}

describe('backup — 1탭 파일 내보내기/복원 (6.7)', () => {
  it('백업에는 재계산 가능한 엔진 캐시를 넣지 않는다 (D2)', () => {
    const backup = createBackup(sampleData(), '2026-11-27T19:52:00+09:00');
    expect(backup.data).not.toHaveProperty('engineCache');
    expect(backup.app).toBe('timekeeper');
    expect(backup.schemaVersion).toBe(1);
  });

  it('직렬화 → 복원이 원본과 같다', () => {
    const original = createAppData(createSettings({ deviceId: 'device-1' }));
    const text = serializeBackup(original, '2026-11-27T19:52:00+09:00');
    const restored = parseBackup(text);

    expect(restored.schemaVersion).toBe(1);
    expect(restored.settings.deviceId).toBe('device-1');
    expect(restored.contexts).toEqual(original.contexts);
  });

  it('래핑 없는 원본 데이터도 마이그레이션을 거쳐 복원한다', () => {
    const original = createAppData(createSettings({ deviceId: 'device-2' }));
    expect(parseBackup(JSON.stringify(original)).settings.deviceId).toBe('device-2');
  });

  it('깨진 파일은 덮어쓰지 않고 오류로 멈춘다', () => {
    expect(() => parseBackup('{ not json')).toThrow(/valid JSON/);
    expect(() => parseBackup('null')).toThrow(/empty/);
  });

  it('파일 이름은 시각에서 만든다', () => {
    expect(backupFileName('2026-11-27T19:52:00+09:00')).toBe(
      'timekeeper-backup-2026-11-27T19-52-00+09-00.json',
    );
  });
});
