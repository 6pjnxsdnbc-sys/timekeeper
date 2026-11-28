/**
 * MVS 문구 — 데이터이지 로직이 아니다 (설계서 5.10 (2)).
 *
 * 0→1 착수의 첫 동작은 **제목에서 만든다**: 품질 평가가 아니라 "손이 닿는 크기".
 * 표의 순서가 우선순위다 — 위에서 첫 매칭을 고른다.
 * 금지: 합격선·품질 문구("이것만 하면 오늘은 성공") — 새 기준을 만들면
 * 완벽주의가 그쪽으로 옮겨간다.
 */
import type { Item, ItemKind } from '../schema/current';
import { hash32 } from '../engine/math';

export type MvsKind = 'solve' | 'write' | 'read' | 'organize' | 'submit' | 'workout' | 'default';

interface MvsPattern {
  kind: MvsKind;
  match: RegExp;
  templates: readonly string[];
  /** 목적어가 비었을 때 쓰는 문구 — `{obj}` 없는 완전한 문장 */
  emptyTemplates: readonly string[];
  targetMin: number;
}

const DEFAULT_PATTERN: MvsPattern = {
  kind: 'default',
  match: /.*/,
  templates: ['{obj} 첫 줄만 손대기.', '{obj} 파일 열고 1줄.', '{obj} 5분만 들여다보기.'],
  emptyTemplates: ['첫 줄만 손대기.', '파일 열고 1줄.', '5분만 손대기.'],
  targetMin: 5,
};

export const MVS_PATTERNS: readonly MvsPattern[] = [
  {
    kind: 'solve',
    match: /풀기|풀이|문제|기출|모의|오답|N제/,
    templates: ['{obj} 손으로 푸는 데까지.', '{obj} 답만 적기.', '{obj} 1번만.'],
    emptyTemplates: ['첫 문제 손으로 푸는 데까지.', '답만 적기.', '1번만.'],
    targetMin: 7,
  },
  {
    kind: 'write',
    match: /작성|쓰기|재작성|첨삭|답안|논술|초안|에세이|고쳐/,
    templates: ['{obj} 첫 문단 3줄만.', '{obj} 논점 3줄만. 망쳐도 됨.', '{obj} 소제목만 뽑기.'],
    emptyTemplates: ['첫 문단 3줄만.', '논점 3줄만. 망쳐도 됨.', '소제목만 뽑기.'],
    targetMin: 7,
  },
  {
    kind: 'read',
    match: /읽|독해|복습|정독|훑|요약/,
    templates: ['{obj} 첫 페이지만.', '{obj} 소제목·표만 보기.', '{obj} 1문단 읽고 한 줄.'],
    emptyTemplates: ['첫 페이지만.', '소제목·표만 보기.', '1문단 읽고 한 줄.'],
    targetMin: 5,
  },
  {
    kind: 'organize',
    match: /정리|분류|옮기|스캔|파일|노트|청소/,
    templates: ['{obj} 한 무더기만.', '{obj} 첫 1개만 처리.', '{obj} 버릴 것 3개 고르기.'],
    emptyTemplates: ['한 무더기만.', '첫 1개만 처리.', '버릴 것 3개 고르기.'],
    targetMin: 5,
  },
  {
    kind: 'submit',
    match: /서류|제출|신청|접수|발급|장학|원서|등록/,
    templates: ['{obj} 첫 칸만 채우기.', '{obj} 필요한 서류 목록 1줄.', '{obj} 사이트 열고 로그인까지.'],
    emptyTemplates: ['첫 칸만 채우기.', '필요한 서류 목록 1줄.', '사이트 열고 로그인까지.'],
    targetMin: 5,
  },
  {
    kind: 'workout',
    match: /운동|헬스|스트레칭|걷기|산책|러닝/,
    templates: ['운동복 입고 1세트.', '{obj} 준비 동작만.', '신발 신고 나가기까지.'],
    emptyTemplates: ['운동복 입고 1세트.', '준비 동작만.', '신발 신고 나가기까지.'],
    targetMin: 5,
  },
  DEFAULT_PATTERN,
];

const NUMBER_TOKEN = /(\d+)\s*(번|문항|장|개|회|페이지|쪽|강)\s*(문항|문제|페이지|쪽)?/;

const SUFFIXES = [
  '재작성',
  '작성하기',
  '정리하기',
  '읽기',
  '풀기',
  '쓰기',
  '작성',
  '정리',
  '제출',
  '신청',
  '준비',
  '확인',
  '검토',
  '보기',
  '첨삭',
  '분석',
  '복습',
] as const;

/** 목적어 추출 — ① 숫자 토큰 우선 ② 명사화 어미를 떼고 앞쪽 명사구 2어절 */
export function extractObject(title: string): string {
  const cleaned = (title ?? '').replace(/[!！]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const numeric = NUMBER_TOKEN.exec(cleaned);
  if (numeric) {
    const [, count, unit, tail] = numeric;
    return tail ? `${count}${unit} ${tail}` : `${count}${unit}`;
  }

  let base = cleaned;
  for (const suffix of SUFFIXES) {
    if (base.endsWith(suffix)) {
      base = base.slice(0, -suffix.length).trim();
      break;
    }
  }
  const words = base.split(' ').filter(Boolean);
  const phrase = words.slice(-2).join(' ');
  return phrase.length > 14 ? phrase.slice(0, 14).trim() : phrase;
}

export function mvsKindOf(title: string, kind: ItemKind): MvsKind {
  if (kind === 'workout') return 'workout';
  for (const pattern of MVS_PATTERNS) {
    if (pattern.kind === 'workout') continue;
    if (pattern.match.test(title)) return pattern.kind;
  }
  return 'default';
}

function fill(template: string, object: string): string {
  if (!template.includes('{obj}')) return template;
  return template.replace('{obj}', object).replace(/\s+/g, ' ').trim();
}

export interface ComposedMvs {
  label: string;
  targetMin: number;
  kind: MvsKind;
}

/**
 * 문구 생성 (4단계, 전부 순수 함수).
 * idx = (hash32(id) + dayIndex) % n — 같은 날 같은 항목은 같은 문구(결정적).
 * 보드에 같은 문장이 이미 있으면 idx 를 +1 (최대 n회).
 */
export function composeMvs(item: Item, dayIndex: number, boardTitles: readonly string[] = []): ComposedMvs {
  const kind = mvsKindOf(item.title, item.kind);
  const pattern = MVS_PATTERNS.find((candidate) => candidate.kind === kind) ?? DEFAULT_PATTERN;
  const object = extractObject(item.title);
  const templates = object ? pattern.templates : pattern.emptyTemplates;
  const start = (hash32(item.id) + Math.max(0, dayIndex)) % templates.length;

  for (let step = 0; step < templates.length; step += 1) {
    const index = (start + step) % templates.length;
    const label = fill(templates[index] ?? '', object);
    if (!boardTitles.includes(label)) {
      return { label, targetMin: pattern.targetMin, kind };
    }
  }

  const fallback = fill(templates[start] ?? '', object);
  return { label: fallback, targetMin: pattern.targetMin, kind };
}

export function mvsTargetMin(kind: MvsKind): number {
  return MVS_PATTERNS.find((pattern) => pattern.kind === kind)?.targetMin ?? 5;
}
