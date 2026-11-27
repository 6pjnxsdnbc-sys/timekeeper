/**
 * day — 하루의 경계 계산 (설계서 5.5·M5). 순수 함수, 시계는 주입받는다.
 *
 * 하루 경계는 04:00 이다. 새벽 3시에 한 일은 '어제'의 보드에 남는다.
 * ISO 문자열의 오프셋을 그대로 읽어 기기 타임존과 무관하게 같은 답을 낸다.
 */
import type { Instant, LocalDate, Minutes } from '../schema/current';

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

export interface WallClock {
  date: LocalDate;
  hour: number;
  minute: number;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function makeDate(year: number, month: number, day: number): LocalDate {
  return `${year}-${pad2(month)}-${pad2(day)}` as LocalDate;
}

export function localDateOf(date: Date): LocalDate {
  return makeDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** ISO 문자열을 '그 기기에서 본 벽시계'로 읽는다. 오프셋이 적혀 있으면 그 값을 믿는다. */
export function wallClock(at: Instant): WallClock | null {
  const match = ISO_RE.exec(at);
  if (match) {
    const [, year, month, day, hour, minute, , zone] = match;
    if (zone && zone !== 'Z') {
      return {
        date: makeDate(Number(year), Number(month), Number(day)),
        hour: Number(hour),
        minute: Number(minute),
      };
    }
  }
  const parsed = new Date(at);
  if (Number.isNaN(parsed.getTime())) return null;
  return { date: localDateOf(parsed), hour: parsed.getHours(), minute: parsed.getMinutes() };
}

export function minutesOfDay(at: Instant): Minutes {
  const wall = wallClock(at);
  return wall ? wall.hour * 60 + wall.minute : 0;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const [year, month, day] = date.split('-').map(Number);
  const base = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
  return makeDate(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
}

/** 'YYYY-MM-DD' 는 사전순 = 시간순이다. */
export function compareDate(a: LocalDate, b: LocalDate): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function isBefore(date: LocalDate, other: LocalDate): boolean {
  return compareDate(date, other) < 0;
}

/** 그 순간이 속한 '하루' — 경계 이전이면 전날이다. */
export function logicalDate(at: Instant, dayStartHour: number): LocalDate {
  const wall = wallClock(at);
  if (!wall) throw new Error(`invalid instant: ${at}`);
  return wall.hour < dayStartHour ? addDays(wall.date, -1) : wall.date;
}

export function formatClock(minutes: Minutes): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '--:--';
  const whole = Math.round(minutes);
  return `${pad2(Math.floor(whole / 60))}:${pad2(whole % 60)}`;
}

export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '시간 미정';
  const whole = Math.max(5, Math.round(minutes / 5) * 5);
  if (whole < 60) return `${whole}분`;
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}
