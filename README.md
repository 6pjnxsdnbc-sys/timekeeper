# Timekeeper

ADHD 맞춤 시간관리 앱. **F1~F3** — 1초 입력 · 오늘 카드 3장 · 04:00 하루 경계 · 로컬 영속화에
**수학 엔진(베이지안 시간 보정) · 실시간 타임라인 · 집중 타이머 · ADHD 0→1(MVS·재보기) · 운동 균형**을 더했다.

> 설계 기준: [`docs/design/ADHD_시간관리_시스템_설계서.md`](docs/design/ADHD_시간관리_시스템_설계서.md) (v1.2)

## 지금 되는 것

- Vite + React + TypeScript 스캐폴드
- 4레이어 경계 강제: `tokens` · `core` · `ui` · `sync` + `app` 조립
  - `eslint-plugin-boundaries` (lint 실패) · `tsconfig` path alias · `src/tests/boundaries.test.ts`
- 디자인 토큰 초안: 다크/라이트 semantic 변수, 공간·타이포·모션
- 스키마 v1(`Item` · `EngineEvent` · `AppDataV1`) · 기본값 factory · 마이그레이션 하네스
- `core/policy.ts` — v1.2 확정 파라미터 전부
- **F1 핵심 루프**
  - `+` / `⌘K` 빠른 입력 → Enter 저장, 실시간 해석 1줄 (파싱 실패도 인박스+15분 저장)
  - 오늘 카드 3장: 인박스 1탭 승격/내리기 · 완료 · 내일로 · 소프트 삭제(토스트 되돌리기)
  - 04:00 하루 경계 롤오버(시스템 이벤트, `updatedAt` 불변) + localStorage 영속화
  - **UI 테마 6종 + 화면·테마 스튜디오** — 액센트·카드 질감·곡률·폰트·밀도 실시간 커스터마이징(localStorage)
- **F2·F3 대시보드** — 인박스 · 집중 보드 · 실시간 타임라인 · 지금/균형/운동 위젯 (PC 3단, 모바일 하단 3탭)
  - 수학 엔진: EWMA + 경험적 베이즈 시간 보정, 7항 효용 추천(이유 %), 7일 영역 균형·추정 정확도
  - 집중 타이머: 시작/일시정지/연장/완료/중단 — 실제 소요가 그 자리에서 학습된다
  - MVS 0→1 문구 자동 생성·편집, 5분 재보기(2선택), 에너지 스위치, 운동 플랜 B
  - 타임라인: 04:00–28:00 축 · NowLine · 블록 배치/해제 · 남은 시간 · 추천 제안
  - 빈 화면의 `[샘플 하루 불러오기]` (기존 데이터 보존)
- **뷰 4종** — 대시보드 / 집중 카드 / 컴팩트 리스트 / 스플릿 보드
- 390px/1280px 반응형
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
│            engine/ (시간·에너지·효용·통계) · rules/ (규칙·ADHD) · selectors/
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
