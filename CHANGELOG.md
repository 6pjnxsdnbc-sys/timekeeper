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

## 0.3.0 — UI 전면 고도화 · 테마 6종 · 스튜디오 · 뷰 3종 (2026-11-27)

- **테마 프셋 6종** (`src/tokens/themes.ts`) — Midnight Slate · Warm Espresso · Forest Moss · Nordic Paper · Soft Mist · Obsidian Mono
  - semantic 변수 20개를 프리셋마다 정의, `useLayoutEffect` 로 첫 페인트 전 적용 (깜빡임 없음)
  - 본문 대비 4.5:1 게이트를 테스트로 강제 (`src/tests/ui/themes.test.ts`)
- **화면·테마 스튜디오** (`features/theme/ThemeStudio`) — 상단 ◐ 버튼으로 열리는 모달/시트
  - 프리셋 원클릭, 액센트 10색 스와치 + `<input type="color">`, 카드 질감 Flat/Elevated/Glass,
    곡률 Sharp/Smooth/Round, 폰트 무드 Clean Sans/Editorial/Mono accent, 밀도 Relaxed/Balanced/Compact
  - 전부 `localStorage`(`timekeeper.studio`)에 즉시 저장, `[기본값 초기화]` 지원
- **뷰 3종** — 집중 카드 / 컴팩트 리스트 / 스플릿 보드(데스크톱 3열, 모바일 세그먼트 탭)
  - 선택은 `timekeeper.view` 에 저장, 스위처는 상단 바
- **표면 계층 정리** — `bg / surface / surface-raised / surface-sunken / surface-hover`,
  파생색은 `color-mix`, 그림자·하이라이트는 프리셋 값. 점선 빈 슬롯 → 조용한 플레이스홀더
- **부품** — `Icon`(선 1.6px 세트) · 카드/한 줄 `ItemCard` 두 변형 · 분류 도트 4색 · 오버레이 Esc·스크롤 잠금
- 기존 F1 로직·4레이어 경계 그대로 (core 변경 0, `.github/workflows/deploy.yml` 변경 0)

## 0.2.0 — F1 핵심 루프 (2026-11-27)

- **QuickCapture** — `+` · `⌘K`/`Ctrl+K` → 한 줄 입력, Enter 저장, 실시간 해석 1줄
  - 최소 파서 `core/rules/parseCapture.ts`: `오늘` `내일` `19시` `1시간 30분` `!` `12/5` `/공부` `/운동` `/업무` `/할일`
  - 파싱 실패·빈 해석에도 `inbox` + 15분으로 **항상 저장**
- **오늘 보드 3장** — `core/rules/todayBoard.ts` · `core/selectors/todayBoard.ts`
  - 인박스에서 1탭 승격/내리기, 3장이 차면 안내만(자동 추가 없음)
  - 카드: 제목 · 분류 칩 · 예상 시간(미정 포함) · 오늘 고정/시각/마감 라벨
  - 완료 · 내일로(카운터는 내부 `carryCount` 만) · 소프트 삭제 + 토스트 되돌리기
- **04:00 하루 경계** — `core/rules/rollover.ts`
  - 지난 날짜의 미완료 카드를 인박스로, 시스템 이벤트 `rollover` 1일 1회, `updatedAt` 불변
- **로컬 영속화** — `sync/local/kv.ts`(키-값 어댑터, 마이그레이션 경유, 깨진 데이터 격리) + `app/store.ts`
  - 새로고침 후 유지. F4에서 IndexedDB/Gist 어댑터로 교체
- **UI** — 다크/라이트, 390px·1280px 3단 반응형, 1px 보더·토큰만 사용
- 테스트 22개 추가 (parseCapture · todayBoard · rollover · store · day)
