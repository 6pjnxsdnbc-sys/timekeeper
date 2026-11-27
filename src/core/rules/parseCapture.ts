/**
 * parseCapture — 1초 입력의 최소 파서 (설계서 1.4 M1).
 *
 * 원칙: **파싱은 저장을 막지 않는다.** 못 읽은 말은 제목에 그대로 남고,
 * 어떤 입력이든 유효한 초안을 돌려준다. 분류·시간을 묻지 않는다.
 */
import type { Context, Energy, LocalDate, Minutes } from '../schema/current';
import { DEFAULT_ESTIMATE_MIN, roundEstimateMin } from '../schema/factory';
import { DEFAULT_CONTEXTS, INBOX_CONTEXT_ID } from '../data/contexts';
import { STRINGS } from '../content/strings.ko';
import { addDays, compareDate, formatClock, formatMinutes, makeDate } from './day';

export type CaptureWhen = 'today' | 'tomorrow' | 'none';

export interface CaptureParseInput {
  today: LocalDate;
  contexts?: Record<string, Context>;
}

export interface CaptureParse {
  raw: string;
  /** 토큰을 걷어낸 제목. 비면 원문이 그대로 남는다. */
  title: string;
  contextId: string;
  energy: Energy;
  estimateMin: number;
  /** 시간을 말하지 않아 기본값으로 저장된 경우 */
  estimateAssumed: boolean;
  when: CaptureWhen;
  /** '!' — 오늘 고정 */
  pinned: boolean;
  startMin?: Minutes;
  dueDate?: LocalDate;
  /** 미리보기 1줄 조각: ['공부', '1시간', '오늘'] */
  parts: string[];
}

/** `/태그` 별칭 — 분류를 묻지 않기 위한 최소한의 표식. */
const TAG_ALIASES: Record<string, string> = {
  운동: 'workout',
  공부: 'study',
  스터디: 'study',
  업무: 'work',
  일: 'work',
  잡일: 'errand',
  심부름: 'errand',
  할일: INBOX_CONTEXT_ID,
  인박스: INBOX_CONTEXT_ID,
};

interface Found {
  contextId: string;
  when: CaptureWhen;
  pinned: boolean;
  startMin?: Minutes;
  dueDate?: LocalDate;
  estimateMin?: number;
}

function resolveDue(today: LocalDate, month: number, day: number): LocalDate | undefined {
  if (!Number.isInteger(month) || !Number.isInteger(day)) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const year = Number(today.slice(0, 4));
  const candidate = makeDate(year, month, day);
  return compareDate(candidate, today) < 0 ? makeDate(year + 1, month, day) : candidate;
}

function toStartMin(hour: number, minute: number, mark?: string): Minutes | undefined {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return undefined;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return undefined;
  let h = hour;
  if (mark && ['오후', '저녁', '밤'].includes(mark) && h < 12) h += 12;
  if (mark && ['오전', '아침', '새벽'].includes(mark) && h === 12) h = 0;
  return h * 60 + minute;
}

function cleanTitle(rest: string, original: string): string {
  const cleaned = rest
    .replace(/\s+/g, ' ')
    .replace(/^[\s·,/\-–—:]+/, '')
    .replace(/[\s·,\-–—:]+$/, '')
    .trim();
  if (cleaned) return cleaned;
  return original.replace(/\s+/g, ' ').trim();
}

function resolveContext(id: string, contexts?: Record<string, Context>): Context | undefined {
  return contexts?.[id] ?? DEFAULT_CONTEXTS.find((ctx) => ctx.id === id);
}

export function parseCapture(raw: string, input: CaptureParseInput): CaptureParse {
  const original = (raw ?? '').trim();
  let rest = original;

  const found: Found = { contextId: INBOX_CONTEXT_ID, when: 'none', pinned: false };

  // 1) 분류 태그
  rest = rest.replace(/(^|\s)\/([^\s/]+)/g, (whole, lead: string, name: string) => {
    const mapped = TAG_ALIASES[name];
    if (!mapped) return whole;
    if (found.contextId === INBOX_CONTEXT_ID) found.contextId = mapped;
    return lead;
  });

  // 2) 마감 날짜 — 12/5, 12월 5일
  rest = rest.replace(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/, (_whole, month, day) => {
    found.dueDate = resolveDue(input.today, Number(month), Number(day)) ?? found.dueDate;
    return ' ';
  });
  rest = rest.replace(/(\d{1,2})\s*\/\s*(\d{1,2})/, (_whole, month, day) => {
    found.dueDate = resolveDue(input.today, Number(month), Number(day)) ?? found.dueDate;
    return ' ';
  });

  // 3) 오늘 고정 표시
  if (/[!！]/.test(rest)) {
    found.pinned = true;
    rest = rest.replace(/[!！]/g, ' ');
  }

  // 4) 날짜 단어 — '오늘까지' 는 마감이기도 하다
  rest = rest.replace(/(오늘|내일)\s*(까지)?/g, (_whole, word: string, until?: string) => {
    const isToday = word === '오늘';
    const day = isToday ? input.today : addDays(input.today, 1);
    if (until) found.dueDate = day;
    if (found.when === 'none') found.when = isToday ? 'today' : 'tomorrow';
    return ' ';
  });

  // 5) 시각 — 19시, 저녁 7시 30분, 19:30
  const clockWord = /(오전|오후|저녁|밤|아침|새벽)?\s*(\d{1,2})\s*시(?!\s*간)(?:\s*(\d{1,2})\s*분)?/;
  rest = rest.replace(clockWord, (whole, mark?: string, hour?: string, minute?: string) => {
    if (hour === undefined) return whole;
    const value = toStartMin(Number(hour), minute === undefined ? 0 : Number(minute), mark);
    if (value === undefined) return whole;
    if (found.startMin === undefined) found.startMin = value;
    return ' ';
  });
  if (found.startMin === undefined) {
    rest = rest.replace(/(\d{1,2}):(\d{2})/, (whole, hour: string, minute: string) => {
      const value = toStartMin(Number(hour), Number(minute));
      if (value === undefined) return whole;
      found.startMin = value;
      return ' ';
    });
  }

  // 6) 소요 시간 — 1시간 30분, 90분
  rest = rest.replace(/(\d+(?:\.\d+)?)\s*시간(?:\s*(\d{1,2})\s*분)?/, (_whole, hours: string, mins?: string) => {
    found.estimateMin = Math.round(Number(hours) * 60 + (mins === undefined ? 0 : Number(mins)));
    return ' ';
  });
  if (found.estimateMin === undefined) {
    rest = rest.replace(/(\d{1,4})\s*분/, (_whole, mins: string) => {
      found.estimateMin = Number(mins);
      return ' ';
    });
  }

  const context = resolveContext(found.contextId, input.contexts);
  const estimateMin = roundEstimateMin(found.estimateMin ?? DEFAULT_ESTIMATE_MIN);
  const estimateAssumed = found.estimateMin === undefined;
  const when: CaptureWhen =
    found.when === 'none' && (found.pinned || found.startMin !== undefined) ? 'today' : found.when;

  const parts: string[] = [];
  if (context && found.contextId !== INBOX_CONTEXT_ID) parts.push(context.label);
  parts.push(estimateAssumed ? `${formatMinutes(estimateMin)}(${STRINGS.capture.assumed})` : formatMinutes(estimateMin));
  if (found.startMin !== undefined) parts.push(formatClock(found.startMin));
  if (found.dueDate) {
    parts.push(STRINGS.capture.due(Number(found.dueDate.slice(5, 7)), Number(found.dueDate.slice(8, 10))));
  }
  if (found.pinned) parts.push(STRINGS.capture.pinned);
  else if (when === 'today') parts.push(STRINGS.capture.today);
  else if (when === 'tomorrow') parts.push(STRINGS.capture.tomorrow);

  const result: CaptureParse = {
    raw: original,
    title: cleanTitle(rest, original),
    contextId: found.contextId,
    energy: context?.defaultEnergy ?? 'mid',
    estimateMin,
    estimateAssumed,
    when,
    pinned: found.pinned,
    parts,
  };
  if (found.startMin !== undefined) result.startMin = found.startMin;
  if (found.dueDate) result.dueDate = found.dueDate;
  return result;
}
