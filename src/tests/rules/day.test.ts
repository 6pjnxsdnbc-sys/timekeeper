import { describe, expect, it } from 'vitest';
import { addDays, compareDate, formatClock, formatMinutes, logicalDate } from '@core';

describe('day — 04:00 하루 경계', () => {
  it('새벽 3시는 아직 어제다', () => {
    expect(logicalDate('2026-11-28T03:30:00+09:00', 4)).toBe('2026-11-27');
  });

  it('04:00 이 지나면 오늘이다', () => {
    expect(logicalDate('2026-11-28T04:00:00+09:00', 4)).toBe('2026-11-28');
  });

  it('저녁은 같은 날이다', () => {
    expect(logicalDate('2026-11-28T23:10:00+09:00', 4)).toBe('2026-11-28');
  });

  it('날짜 더하기는 월·연 경계를 넘는다', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });

  it('날짜 비교는 사전순과 같다', () => {
    expect(compareDate('2026-11-27', '2026-11-28')).toBe(-1);
    expect(compareDate('2026-11-28', '2026-11-27')).toBe(1);
    expect(compareDate('2026-11-27', '2026-11-27')).toBe(0);
  });

  it('시각·소요 표기는 숫자가 정렬된다', () => {
    expect(formatClock(19 * 60)).toBe('19:00');
    expect(formatClock(9 * 60 + 5)).toBe('09:05');
    expect(formatMinutes(90)).toBe('1시간 30분');
    expect(formatMinutes(60)).toBe('1시간');
    expect(formatMinutes(15)).toBe('15분');
  });
});
