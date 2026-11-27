# Timekeeper

ADHD 맞춤 시간관리 앱. **F0(토대)** 단계 — 레포 · 4레이어 경계 · 스키마 v1 · CI/Pages.

> 설계 기준: [`docs/design/ADHD_시간관리_시스템_설계서.md`](docs/design/ADHD_시간관리_시스템_설계서.md) (v1.2)

## 지금 되는 것

- Vite + React + TypeScript 스캐폴드
- 4레이어 경계 강제: `tokens` · `core` · `ui` · `sync` + `app` 조립
  - `eslint-plugin-boundaries` (lint 실패) · `tsconfig` path alias · `src/tests/boundaries.test.ts`
- 디자인 토큰 초안: 다크/라이트 semantic 변수, 공간·타이포·모션
- 스키마 v1(`Item` · `EngineEvent` · `AppDataV1`) · 기본값 factory · 마이그레이션 하네스
- `core/policy.ts` — v1.2 확정 파라미터 전부
- 최소 셸: 오늘 화면(빈 상태 · 카드 자리 3칸) + 테마 토글(시스템/다크/라이트)
- GitHub Actions: PR/push 검증 → main 자동 GitHub Pages 배포

## 명령

```bash
npm install
npm run dev        # 로컬 개발
npm run typecheck  # 타입 + 레이어 계약
npm run lint       # boundaries 규칙
npm run test       # vitest
npm run build      # dist/
```

## 구조

```
src/
├─ tokens/   색·타이포·간격·모션의 유일한 정의처 (ui 만 참조)
├─ core/     데이터·규칙 — schema / policy / migrations / data / content
├─ ui/       화면·부품 — primitives / patterns / features / screens
├─ sync/     저장·백업 — SyncAdapter / local / backup
└─ app/      조립 — main · App · store · providers · routes
```

### 의존 방향 (lint 로 강제)

| 레이어 | 허용 | 금지 |
|---|---|---|
| `tokens` | 없음 (CSS 변수) | 모든 코드 import |
| `core` | `core` | `ui` · `sync` · `app` · DOM |
| `ui` | `core` · `tokens` · `ui` | `sync` · `app` |
| `sync` | `core` · `sync` | `ui` · `tokens` · DOM |
| `app` | 전부 | — |

상대경로 3단계 이상(`../../../`)은 alias(`@core/*` 등)로 대체한다.

## 배포

`main` push → GitHub Actions `Deploy` 워크플로 → GitHub Pages.
PR 은 같은 검증을 돌리고 프리뷰 base(`/timekeeper/preview/pr-N/`)로 빌드한다.

롤백 절차는 [`ROLLBACK.md`](ROLLBACK.md).
