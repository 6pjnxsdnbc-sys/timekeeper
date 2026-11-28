import { describe, expect, it } from 'vitest';
import type { Item } from '@core/schema/current';
import { composeMvs, extractObject, mvsKindOf } from '@core';

function itemOf(title: string, kind: Item['kind'] = 'task'): Item {
  const base = {
    id: 'item-fixed',
    title,
    contextId: kind === 'workout' ? 'workout' : 'study',
    energy: 'mid' as const,
    estimateMin: 30,
    status: 'inbox' as const,
    createdAt: '2026-11-27T10:00:00+09:00',
    updatedAt: '2026-11-27T10:00:00+09:00',
  };
  if (kind === 'workout') {
    return { ...base, kind: 'workout', routineId: 'walk', plannedMinutes: 20, intensity: 'reduced' };
  }
  if (kind === 'errand') return { ...base, kind: 'errand', window: 'any' };
  if (kind === 'anchor') {
    return {
      ...base,
      kind: 'anchor',
      startAt: '2026-11-27T19:00:00+09:00',
      endAt: '2026-11-27T20:00:00+09:00',
      rigidity: 'soft',
    };
  }
  return { ...base, kind: 'task', priority: 2 };
}

describe('MVS 문구 — 제목에서 만든다 (5.10 · T7)', () => {
  it('유형 매칭 표 그대로', () => {
    expect(mvsKindOf('인하대 논술 2번 문항 재작성', 'task')).toBe('write');
    expect(mvsKindOf('국어 기출 12번 풀기', 'task')).toBe('solve');
    expect(mvsKindOf('장학금 서류 준비', 'task')).toBe('submit');
    expect(mvsKindOf('책상 정리', 'task')).toBe('organize');
    expect(mvsKindOf('지문 독해', 'task')).toBe('read');
    expect(mvsKindOf('하체 루틴', 'workout')).toBe('workout');
    expect(mvsKindOf('제목 없음', 'task')).toBe('default');
  });

  it('목적어 추출 — 숫자 토큰 우선, 없으면 명사구', () => {
    expect(extractObject('인하대 논술 2번 문항 재작성')).toBe('2번 문항');
    expect(extractObject('국어 기출 12번 풀기')).toBe('12번');
    expect(extractObject('장학금 서류 준비')).toBe('장학금 서류');
    expect(extractObject('책상 정리')).toBe('책상');
    expect(extractObject('')).toBe('');
  });

  it('스냅샷 케이스 — 표에 적힌 문장이 나온다', () => {
    const cases: Array<[string, string[]]> = [
      ['인하대 논술 2번 문항 재작성', ['2번 문항 첫 문단 3줄만.', '2번 문항 논점 3줄만. 망쳐도 됨.', '2번 문항 소제목만 뽑기.']],
      ['국어 기출 12번 풀기', ['12번 손으로 푸는 데까지.', '12번 답만 적기.', '12번 1번만.']],
      ['장학금 서류 준비', ['장학금 서류 첫 칸만 채우기.', '장학금 서류 필요한 서류 목록 1줄.', '장학금 서류 사이트 열고 로그인까지.']],
      ['책상 정리', ['책상 한 무더기만.', '책상 첫 1개만 처리.', '책상 버릴 것 3개 고르기.']],
      ['하체 루틴', ['운동복 입고 1세트.', '하체 루틴 준비 동작만.', '신발 신고 나가기까지.']],
    ];
    for (const [title, allowed] of cases) {
      const composed = composeMvs(itemOf(title, title === '하체 루틴' ? 'workout' : 'task'), 3);
      expect(allowed).toContain(composed.label);
    }
  });

  it('로테이션은 결정적이고, 날이 바뀌면 다음 문구', () => {
    const item = itemOf('국어 기출 12번 풀기');
    const today = composeMvs(item, 10);
    const again = composeMvs(item, 10);
    const tomorrow = composeMvs(item, 11);
    expect(today.label).toBe(again.label);
    expect(today.label).not.toBe(tomorrow.label);
    expect(today.targetMin).toBe(7);
  });

  it('보드에 같은 문장이 있으면 다음 로테이션을 쓴다', () => {
    const a = itemOf('책상 정리');
    const b: Item = { ...itemOf('책상 정리'), id: 'item-other' };
    const first = composeMvs(a, 2);
    const second = composeMvs(b, 2, [first.label]);
    expect(second.label).not.toBe(first.label);
  });

  it('제목이 비어도 5분 문구가 나온다', () => {
    const composed = composeMvs(itemOf(''), 0);
    expect(composed.label.length).toBeGreaterThan(0);
    expect(composed.targetMin).toBe(5);
  });
});
