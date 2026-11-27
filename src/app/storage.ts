/**
 * 브라우저 저장소 어댑터 — `app` 만이 브라우저 API 를 안다 (설계서 2.1).
 * sync 레이어는 KeyValue 인터페이스만 받는다.
 */
import type { KeyValue } from '@sync';

export function browserKeyValue(): KeyValue {
  return {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // 용량 초과·사생활 모드: 저장 실패가 사용을 막지 않는다 (6.1).
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {
        // 무시.
      }
    },
  };
}

/** iPhone·http 개발 서버 모두에서 동작하는 id 생성. */
export function createId(): string {
  const candidate = globalThis.crypto;
  if (candidate && typeof candidate.randomUUID === 'function') return candidate.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
