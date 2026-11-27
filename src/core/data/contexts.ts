/**
 * 기본 분류 — 데이터이지 로직이 아니다 (설계서 2.2 core/data).
 * v1 엔진의 셀은 이 4개다. 인박스는 셀이 아니라 "아직 분류하지 않은 것"의 자리다 (M1).
 */
import type { Context } from '../schema/current';

export const INBOX_CONTEXT_ID = 'inbox';

export const DEFAULT_CONTEXTS: readonly Context[] = [
  {
    id: 'study',
    label: '공부',
    kind: 'task',
    defaultEnergy: 'high',
    preferredWindows: ['morning', 'evening'],
    accent: 'accent',
  },
  {
    id: 'work',
    label: '업무',
    kind: 'task',
    defaultEnergy: 'mid',
    preferredWindows: ['morning', 'afternoon'],
    accent: 'neutral',
  },
  {
    id: 'errand',
    label: '잡일',
    kind: 'errand',
    defaultEnergy: 'low',
    preferredWindows: ['afternoon'],
    accent: 'neutral',
  },
  {
    id: 'workout',
    label: '운동',
    kind: 'workout',
    defaultEnergy: 'mid',
    preferredWindows: ['evening'],
    accent: 'neutral',
  },
] as const;

export const INBOX_CONTEXT: Context = {
  id: INBOX_CONTEXT_ID,
  label: '인박스',
  kind: 'mixed',
  defaultEnergy: 'mid',
  accent: 'neutral',
};

export function defaultContextMap(): Record<string, Context> {
  const map: Record<string, Context> = {};
  for (const ctx of [...DEFAULT_CONTEXTS, INBOX_CONTEXT]) map[ctx.id] = ctx;
  return map;
}
