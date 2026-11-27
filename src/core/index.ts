/**
 * core — 레이어 2의 공개 API. 바깥 레이어는 이 배럴을 통해서만 core 를 만난다.
 * (내부 파일끼리는 직접 import 해도 된다 — 경계는 레이어 사이에만 있다.)
 */
export { POLICY, engineWeightSum, resolveFocusCards, type Policy } from './policy';
export * from './schema/current';
export * from './schema/factory';
export * from './migrations';
export * from './data/contexts';
export * from './data/routines';
export * from './content/strings.ko';
