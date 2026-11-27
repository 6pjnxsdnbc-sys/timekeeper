# CHANGELOG

커밋 접두어(`tokens:` `rules:` `engine:` `schema:` `ui:` `sync:` `fix:`)로 분류한다.

## 0.1.0 — F0 토대 (2026-11-27)

- Vite + React + TypeScript 스캐폴드, vitest
- 4레이어 경계(`tokens` · `core` · `ui` · `sync`) + `app` 조립
  - `eslint-plugin-boundaries` · `tsconfig` alias · 구조 테스트 3중 강제
- 디자인 토큰 초안 — primitive → semantic(dark/light) · typography · space · motion
- `core/schema/v1.ts` (`Item` · `EngineEvent` · `AppDataV1` · `ModelState`), `factory.ts`, 마이그레이션 하네스
- `core/policy.ts` — v1.2 확정 파라미터 + `engine` 블록
- 최소 셸: 오늘 화면 + 테마 토글(시스템/다크/라이트)
- GitHub Actions: verify(PR·push) → Pages deploy(main)
