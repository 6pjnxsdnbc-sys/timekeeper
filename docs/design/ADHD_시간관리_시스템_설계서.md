# ADHD 맞춤 시간관리 시스템 — 상세 설계서

| 항목 | 내용 |
|---|---|
| 문서 | `ADHD_시간관리_시스템_설계서.md` |
| 버전 | **v1.2 (실전용 정밀판) — 엔진 v1 경량화 · ADHD 마찰 제거 · MVS 동적 생성** |
| 작성일 | 2026-11-27 |
| 대상 사용자 | 정은호 님 — ADHD, 수험생(논술 전형), iPhone + PC 병행 |
| 산출 범위 | 아키텍처 · 데이터 스키마 · **엔진 v1 스펙(4장)** · 규칙 엔진 · UI/UX · 동기화/백업 · 수정 대응 · **v1/v2 경계**. 코드는 아직 작성하지 않음 |
| 다음 단계 | 9.1 확정 사항 확인 → **F0(토대) 착수** |

> **v1.2 개정 요약 (2026-11-27)** — v1.1을 냉정하게 검토해 나온 5가지 지적을 전부 반영했다. **기능을 더한 개정이 아니라, 같은 목표를 실제로 굴러가게 만드는 개정**이다.
>
> | # | 지적 | v1.2의 처리 |
> |---|---|---|
> | 1 | **과설계로 수정이 느려진다** | 엔진을 **v1 / v2로 분리**했다. v1은 `분류 4그룹` 셀 + 개별 효용 정렬 + 하드 제약 + 핵심 단위 테스트만. 48빈 커널 평활 · 1,320회 조합 최적화 · 골든 픽스처 12개 백테스트는 **v2(실데이터 2주 후)** 로 이동 → **4.0·4.12·8장** |
> | 2 | **측정하지 않는 변수를 쓴다** | M-E2의 `수면 7시간 → F ← 0` **삭제**. 수면을 받지 않으므로 **하루 경계(04:00) 일일 리셋**으로 정직하게 단순화 → **4.4** |
> | 3 | **효용 스케일 불일치** | `ΔU_recovery`를 `[0, 1]`로 정규화해 **공식 가중치(Σw = 1.0)** 안에 편입. 가중치 7개 재배분 → **4.5·4.6** |
> | 4 | **ADHD 마찰** | [시작]을 누를 때 뜨던 **강제 5분 탐색 시트 제거** → 카드 안 `⏱ 5분만 재보기` **선택 버튼**. 종료 평가도 `[예상대로][더 큼]` 2선택. **타이머 없이 완료해도 정상 동작**(타이머를 켠 세션만 시간 학습) → **1.4 M6 · 5.9·5.10** |
> | 5 | **MVS 문구가 정적 템플릿** | 입력 제목의 **동사·목적어 패턴 매칭**(풀기/작성/읽기/정리/서류/운동/일반) → 동적 생성 + **카드 내 1탭 수정** + 유형별 로테이션 → **5.10(2)** |
>
> 추가로 6) **동기화 현실 보완** — PAT 90일 만료 **7일 전 조용한 리마인드**, **로컬 JSON 1탭 백업/복원** 접근성 강화(6.8·6.7), 7) **문서 압축** — 중복 설명·예시를 걷어내고 F0~F4에서 바로 쓰는 밀도로 정리(2,617줄 → 약 2,350줄, 신설 표 5종 포함).

> **4줄 요약**
> 1. 업무·할 일·고정 일정·운동을 **하나의 `Item` 스키마와 하나의 시간·에너지 축**에 올려 서로를 밀고 당기게 한다.
> 2. 판단은 if-else가 아니라 **학습하는 엔진**(`core/engine`)이 한다 — 다만 v1은 **4개 분류 셀에서 시작하는 최소 모델**이고, 정교화는 데이터가 쌓인 뒤에 한다.
> 3. 시작이 가장 어려우므로 **'완성'이 아니라 '0→1 착수'** 를 목표로 만들고, 크기를 모르는 일엔 **5분 재보기 버튼**을 둔다 — **강제하지 않는다**.
> 4. 모든 수정은 `tokens` / `core` / `ui` / `sync` **네 레이어 중 한 곳에서 끝나도록 경계를 코드로 강제**하고, 스키마 버전·PR 프리뷰·롤백을 처음부터 깐다.

---

## 목차

- [0. 문서 개요](#0-문서-개요)
- [1. 설계 철학 & ADHD 특화 메커니즘](#1-설계-철학--adhd-특화-메커니즘)
- [2. 수정 친화적 아키텍처 & 폴더 구조](#2-수정-친화적-아키텍처--폴더-구조)
- [3. 데이터 스키마 v1 & 정보 간 유기성](#3-데이터-스키마-v1--정보-간-유기성)
- [4. 수학·통계 의사결정 엔진 (`core/engine/`)](#4-수학통계-의사결정-엔진-coreengine)
- [5. 하이엔드 UI/UX & 화면 흐름](#5-하이엔드-uiux--화면-흐름)
- [6. 기기 간 동기화 & 자동 백업](#6-기기-간-동기화--자동-백업)
- [7. 누적 수정 대응 가이드](#7-누적-수정-대응-가이드)
- [8. 구현 로드맵 (v1 → v2)](#8-구현-로드맵-v1--v2)
- [9. 확정 사항 & 남은 결정 · 리스크](#9-확정-사항--남은-결정--리스크)
- [10. 부록](#10-부록)

---

## 0. 문서 개요

### 0.1 설계 우선순위 — 충돌할 때의 판정 기준

| 순위 | 기준 | 판정 예시 |
|---|---|---|
| 1 | **수정 안전성** — 경계 침범 없음, 데이터 무손실, 되돌릴 수 있음 | 화면을 예쁘게 만들려고 `core`에 UI 상태를 넣고 싶어지면 → 그 변경은 하지 않는다 |
| 2 | **마찰 제거** — 입력·전환·선택의 비용이 가장 낮은 쪽 | "정확도를 위해 5분 탐색을 자동으로 띄우자" → **버튼으로 낮춘다** (v1.2) |
| 3 | **시각 정밀도** — 타이포·여백·모션의 일관성 | 새 컴포넌트가 토큰 밖의 색을 쓰려면 → 토큰을 먼저 확장한다 |
| 4 | **기능 폭** — 기능 개수·모델 정교함 | 위 셋을 해치지 않는 범위에서만 늘린다 |

> 2순위가 4순위를 이기는 것이 이 문서의 성격이다. v1.2에서 뺀 것(강제 탐색, 삼중 조합 최적화, 수면 변수)은 전부 **4순위를 위해 2순위를 깬 것**이었다.

### 0.2 핵심 설계 결정 요약 (ADR)

| # | 결정 | 검토한 대안 | 이유 |
|---|---|---|---|
| D1 | 네 종류(일정·업무·할 일·운동)를 **단일 `Item`** 으로 통합하고 `Record<id, Item>` 맵으로 저장 | 종류별 4개 테이블 | 한 축에서 정렬·교체·이월되어야 "유기성"이 성립. 맵은 병합 O(1) |
| D2 | **파생값은 저장하지 않는다** — 예외는 `DailySnapshot`(기록)과 `EngineEvent`(사실)뿐. 학습 결과는 이벤트에서 재계산하는 캐시 | 계산 결과를 필드로 캐시 | 규칙을 바꿨을 때 과거 데이터가 옛 규칙의 결과를 들고 있으면 화면이 거짓말을 한다 |
| D3 | 모든 숫자 상수를 **`core/policy.ts` 한 파일**에 | 상수를 쓰는 자리에 각각 선언 | "이월 3회→5회"가 한 줄 수정이 된다 |
| D4 | 시스템은 **제안(proposal)** 만, 확정은 사용자 손에서 | 자동 재배치·자동 강도 변경 | 자동 변경은 "내 하루를 남이 통제한다"는 경험을 준다 |
| D5 | 유채색은 **상태 3종**(진행·완료·보류)에만 | 라벨별 색 | 색이 많아지면 색이 정보를 잃는다 |
| D6 | **빨강을 쓰지 않는다** (파괴적 확인 제외) | 지연을 빨강으로 경고 | 지연을 실패로 학습시키면 앱을 안 열게 된다 |
| D7 | 저장은 **`SyncAdapter` 인터페이스** 뒤에 숨긴다 | 백엔드 직접 결합 | Gist → Supabase가 "파일 1개 + 설정 1줄" |
| D8 | **정적 호스팅(GitHub Pages) + 사용자 소유 토큰** | 자체 서버 | 운영 서버·비용·장애 없이 자동 배포·커밋 롤백. 토큰 위험은 6.8 통제 |
| D9 | 판단은 **학습하는 엔진(`core/engine`)** 이 한다. 규칙은 폴백·문구 | 규칙 임계값만 조정 | 시간 오차·집중 시간대·시작 저항은 사람마다 달라 고정 임계값으로 맞출 수 없다 |
| D10 | 학습은 **append-only 이벤트 로그**에서만. 모델 상태는 캐시 | 모델 상태를 저장·동기화 | 이벤트가 사실이면 모델을 바꿔도 과거를 다시 계산해 같은 답이 나온다 |
| D11 | 완료 상태를 **`started`(0→1)와 `done`** 으로 분리 | 완료 하나로 통일 | 완벽주의자는 완료가 안 되면 아무것도 안 한 것으로 느낀다 |
| D12 | 크기를 모르는 일엔 **5분 재보기 버튼**을 둔다 — **자동 삽입하지 않는다** | [시작] 시 탐색 시트 자동 표시 | (v1.2 수정) 자동 삽입은 간신히 시작한 흐름을 끊는다. 근거는 같지만 개입은 사용자가 고른다 |
| D13 | **v1 엔진은 4개 분류 셀 + 개별 효용 정렬 + 하드 제약**으로 고정, 난이도 셀·조합 최적화·백테스트는 v2 | v1부터 전체 모델 | (v1.2 신설) 셀이 12개면 한 셀 표본이 수렴하지 않고, 수식을 바꿀 때마다 픽스처·백테스트가 따라온다 = 수정 속도 상실 |
| D14 | **타이머는 선택 사항** — 켜지 않고 완료해도 모든 기능이 동작 | 시작 시 타이머 강제 | (v1.2 신설) 시간 학습은 "켠 세션"만 쓰면 되고, 완료·이월·착수는 타이머 없이도 관측된다 |
| D15 | MVS 문구는 **제목 패턴에서 생성 + 1탭 수정 + 일 단위 로테이션** | 고정 템플릿 3~4개 | (v1.2 신설) 고정 문구는 며칠 만에 배경이 되어 무시된다 |

### 0.3 읽는 순서

- **기획 판단용**: 1장 → 4.1(v1/v2 경계) → 4.5(효용) → 5장(화면) → 9장(확정·남은 것)
- **구현 착수용**: 2장 → 3장 → 4장 → 6장 → 8장
- **운영·수정 대응용**: 2.8(변경 라우팅) → 7장

---

## 1. 설계 철학 & ADHD 특화 메커니즘

### 1.1 제품 정의

> **"생각난 순간 던지면, 지금 할 수 있는 세 개만 눈앞에 남고, 손대기만 해도 성공으로 남으며, 하나가 밀려도 하루가 무너지지 않는 시간관리 앱."**

**이것이 아닌 것**

- 캘린더 대체재가 아니다. 약속·수업은 **읽기 전용 앵커**로 받아들이고 편집은 원래 앱에서 한다.
- 프로젝트 관리 도구가 아니다. 간트·의존성·담당자·우선순위 행렬은 없다.
- 습관 게이미피케이션이 아니다. streak·배지·포인트·랭킹은 넣지 않는다.
- **정밀한 통계 대시보드가 아니다.** 엔진은 추천의 근거로만 쓰고, 숫자는 요청 시에만 펼친다(P7).

### 1.2 사용자 컨텍스트 → 설계 함의

| 확인된 사실 | 설계에 미치는 영향 |
|---|---|
| ADHD 진단·자기인식 있음 | 입력 마찰·선택지 수·시간 감각 **세 지점**에 개입을 집중(M1·M2·M3) |
| 수험생, 12월 시험 등 마감이 몰림 | 고정 일정 밀도에 따라 운동 강도를 제안(규칙 ②). 밀도 높은 날 "0점"을 만들지 않는다 |
| **수정 요청을 매우 자주 함** | 초기 완성도보다 **변경 비용**을 최소화. 토큰/정책/규칙 3분리 + 롤백 (2장, 7장). **v1 모델은 작게 시작**(D13) |
| iPhone과 PC를 함께 씀 | Local-First 즉시 반응 + 원격 복제본 동기화 (6장) |
| 짧은 문장, 즉시 실행 선호 | 카피는 한 줄, 버튼은 동사 하나. 설명 문단을 화면에 넣지 않는다 |
| 기존 툴(노션)에 피로 | 설정 1화면 6항목 이내 |
| **일의 난이도·양을 가늠하지 못함**(본인 진술, 최대 병목) | 추정을 단일 숫자로 받지 않고 구간으로 표시. 처음 하는 유형엔 **5분 재보기 버튼**(M6) — 자동으로 띄우지 않는다 |
| **완벽주의로 시작 자체를 회피**(본인 진술, 최대 병목) | '완성'이 아니라 **'0→1 착수'** 를 목표로. 착수와 완료를 분리 기록(M7, 3.2 `started`, 4.7) |
| 수학·통계적으로 정밀한 판단을 원함 | 학습하는 엔진으로 판단하되, **v1은 표본이 수렴하는 최소 모델**로 시작하고 2주 뒤 확장(v2). 모든 점수의 근거는 열어볼 수 있다(4.8) |

### 1.3 일곱 가지 설계 원칙

| # | 원칙 | 화면에서의 증거 |
|---|---|---|
| P1 | **마찰 우선** — 어떤 가치도 탭 2번을 넘기면 지불하지 않는다 | 어디서든 `+` 한 번 → 입력창, 엔터로 저장. 종류·시간을 몰라도 저장된다. [시작]은 **항상 바로 시작한다**(탐색 시트 없음) |
| P2 | **선택 마비 제거** | 오늘 카드 3개, 지금 할 일 추천 2개, 운동 카드 1개 |
| P3 | **시스템은 제안, 확정은 사용자** | 제안은 카드 하단 1줄 + [수락] [닫기]. 거절해도 카운터가 남지 않는다 |
| P4 | **죄책감 0** | 빨강 없음, "3일 연속 실패" 없음, 이월 횟수는 화면에 숫자로 나오지 않는다 |
| P5 | **시간은 눈에 보이게** | Now Line이 현재를 가리키고, "지금 시작하면 18:55에 끝"을 붙인다 |
| P6 | **조용한 UI** | 화면당 유채색 2개 이내, 모션 200ms 안쪽, 알림은 사용자가 켠 것만 |
| P7 | **정밀하되 설명 가능** — 판단은 통계로, 표시는 요청 시에만 | 카드에 점수·확률이 없다. `⋯ → 왜 이 카드?`에서 기여도를 보고 그 자리에서 파라미터를 바꾼다(4.8) |

### 1.4 ADHD 특화 메커니즘 7종

각 메커니즘은 **문제 → 개입 → 화면 → 규칙 → 폴백** 다섯 층으로 정의한다. 폴백이 없는 기능은 만들지 않는다.

#### M1. 입력 마찰 0 (Quick Capture)

| 층 | 내용 |
|---|---|
| 문제 | 떠오른 순간에 분류·시간·우선순위를 물으면 그 자리에서 포기한다 |
| 개입 | **분류를 묻지 않는다.** 한 줄 입력 → 저장 성공 → 정리는 나중(또는 앱이 추정) |
| 화면 | 어디서든 `+` 또는 `⌘K` → 1줄 입력창. 아래에 실시간 해석 1줄(`공부 · 30분 · 오늘`) |
| 규칙 | ① 저장은 **항상** 성공(파싱 실패 시 `contextId: 'inbox'`, `estimateMin: 15`). ② 해석은 최소 파서: `내일`, `오늘`, `19시`, `30분`, `!`(오늘 고정), `/운동`. ③ 애매하면 묻지 않고 기본값 저장 → 카드에서 1탭 수정 |
| 폴백 | 파서가 못 읽어도 제목만으로 저장. 저장 실패 시 입력 내용을 클립보드에 남기고 토스트 |

> ADHD에서 비용이 가장 큰 것은 "정리"가 아니라 **"지금 결정하기"** 다. 입력 시점의 결정을 0으로 만들고, 결정을 카드 위 1탭으로 옮긴다.

#### M2. 하루 최대 3개 노출 (Focus Board)

| 층 | 내용 |
|---|---|
| 문제 | 목록이 길면 시작 전에 지친다. 20개 중 1개를 고르는 데 에너지를 다 쓴다 |
| 개입 | 오늘 화면엔 **고정 일정 + 내가 고른 3개**만. 나머지는 접힌 인박스 |
| 화면 | 카드 3장 세로 스택. 3장이 차면 드래그는 "교체"만 가능(4장이 되지 않음) |
| 규칙 | ① `maxFocusCards = 3`. ② 3개를 다 완료하면 "여유가 생겼어요 · 하나 더?" 제안 1회 — 자동 추가 없음. ③ 아침에 선택을 강제하지 않는다. 처음 열 때 비어 있으면 후보 3개를 **미리 채워서** 보여준다 |
| 폴백 | 고정 일정 4개 이상인 날은 고정 일정을 카드로 세지 않고 타임라인에만 표시 |

#### M3. Now Line — 시간 맹목 보정

| 층 | 내용 |
|---|---|
| 문제 | 지금이 몇 시인지, 다음 일정까지 얼마나 남았는지 감각이 끊긴다. "30분이면 되겠지"가 90분이 된다 |
| 개입 | 타임라인을 가로지르는 **현재 시각 선** + "지금부터 다음 일정까지 **50분**". 카드마다 **종료 예상 시각** |
| 화면 | 1.5px 액센트 선 + 좌측 시각 라벨. 스크롤해도 현재 위치에 고정 |
| 규칙 | ① 분 단위로만 이동(초 단위 애니메이션 금지 — 산만해진다). ② 다음 앵커까지 남은 시간이 소요보다 짧으면 `지금 시작하면 넘어요` 배지만 붙이고 **숨기지 않는다** |
| 폴백 | 오늘 앵커가 없으면 `dayEndHour`까지 남은 시간 표시 |

#### M4. 10분 착수 타이머 (Start Timer) — **선택 사항**

| 층 | 내용 |
|---|---|
| 문제 | 시작·전환이 가장 어렵다. "다 끝내야 한다"는 압박이 시작을 막는다 |
| 개입 | 카드의 [시작]을 누르면 10분 카운트다운이 돌고, 목표는 "10분 앉아 있기"가 아니라 **"그 안에 0→1 찍기"**. 링 아래 M7의 MVS 1줄을 띄운다 |
| 화면 | Focus Mode: 카드 1장 + MVS 1줄 + 카운트다운 링. 나머지 UI는 92% 어둡게 |
| 규칙 | ① `starterTimerMin = 10`, `mvsTargetMin = 7`(타이머보다 짧게). ② 10분 종료 시 **[계속 25분] / [착수 성공] / [5분 쉬기]** 3선택. ③ 앱을 닫아도 계속(종료 시각 저장, 복귀 시 복원). ④ 세션 중에도 [착수 성공]은 언제든. ⑤ **타이머는 강제가 아니다** — 카드에서 바로 완료해도 되고, 그 경우 타이머 없이 `complete`만 기록된다(D14) |
| 폴백 | 알림 권한이 없으면 소리·진동 없이 화면 복귀 시 결과만 표시 |

> 10분은 "끝내는 단위"가 아니라 **"시작하는 단위"** 다. M4는 *앉아 있는 시간*(10분)을, M7은 *손대는 기준*(0→1, 7분)을 정한다. 타이머와 무관하게 MVS를 찍으면 그 순간이 성공이다.

#### M5. 무죄책감 이월 & 3회 시 쪼개기 제안

| 층 | 내용 |
|---|---|
| 문제 | 못 한 일이 쌓이면 목록 자체가 회피 대상이 된다 |
| 개입 | 못 한 일은 **자동으로** 다음 날 후보로 내리고 아무 표시도 남기지 않는다. 단 **3회** 이월된 항목은 "너무 크다"는 신호로 읽고 쪼개기를 **제안**한다 |
| 화면 | 이월 시 1.8초 토스트 `내일로 옮겨뒀어요.` (횟수·경고 없음). 3회째 다음 날 아침 그 카드에만 조용한 1줄 `한 번에 하기엔 큰 일이에요. 3개로 나눠볼까요?` [나누기] [괜찮아요] |
| 규칙 | ① 하루 경계(04:00)에 `planned`/`doing`/`started` + 날짜 지난 항목을 `carryCount += 1`, 배치 해제, `status: planned`(started도 완료가 아니므로 이월 — 3.6 ①). ② `carryCount >= 3`이면 다음 날 **한 번만** 제안(거절 시 `splitDeclined: true`, 재제안 없음). ③ 쪼개기는 **원본을 지우지 않는다**: 원본 `dropped` + `parkedSplit: true`, 자식 3~5개 `splitFrom` 연결, 자식 `carryCount`는 0부터 |
| 폴백 | 쪼개기 초안 생성을 거절해도 이월은 계속 동작(기능 의존 없음) |

#### M6. 5분 크기 파악 (Estimation Probe) — 병목 A

| 층 | 내용 |
|---|---|
| 문제 | 난이도·양을 가늠하지 못한다. "30분"이라 적고 반나절이 걸리며, 그 오차가 다음 계획까지 무너뜨린다. 크기를 모른 채 시작하면 "끝이 안 보인다"는 공포가 시작을 막는다 |
| 개입 | 추정이 불확실한 카드에 **`⏱ 5분만 재보기`** 버튼을 붙인다. 목표는 결과물이 아니라 **크기 측정**: 목차·문제 수·자료 목록·첫 문단만 본다 |
| 화면 | 카드 하단 1줄 `⏱ 5분만 재보기 — 목차·문제 수만 세기` [5분]. 누르면 화면 전환 없이 상단 1줄 타이머만 돈다. **[시작]은 절대 이 시트를 열지 않는다** — 바로 Focus Mode로 들어간다(v1.2) |
| 규칙 | ① 노출 조건은 감이 아니라 엔진의 `u`(4.3): `u ≥ 0.45` 또는 이 유형 3번 미만 또는 `firstOfKind`. ② 종료 평가는 **2선택 `[예상대로] [더 큼]`**. `[더 큼]`은 `[15분] [30분] [60분]` 1탭으로 추정 갱신 + **쪼개기 제안 1줄**(조건 충족 시). ③ 결과는 `exploration { doneAt, actualMin, revisedEstimateMin, verdict }`로 기록되고 E1이 **분산이 작은 관측**으로 반영(직접 재본 추정은 믿을 만하다). ④ `[예상대로]`도 정보가 남는다 — "재봤다"는 사실이 그 셀의 `σ̂`를 줄인다. ⑤ **거절은 실패가 아니다**: 버튼을 안 누르면 아무 일도 일어나지 않고, `×`로 닫으면 `probeDismissedAt`을 남겨 그 항목엔 7일간 다시 붙이지 않는다 |
| 폴백 | 5분이 지나도 감이 안 오면 `[그만]` 1개만 남기고 숫자만 유지. 판단이 안 서면 `[예상대로]`(정보는 남는다) |

> 병목 A의 본질은 "추정을 못 한다"가 아니라 **"추정할 근거를 만들지 않고 추정한다"** 는 것이다. 5분은 근거를 만드는 최소 비용이고, 그 자체로 착수(0→1)이기도 하다.
>
> **v1.2에서 바뀐 것**: v1.1은 이 단계를 [시작] 앞에 **자동 삽입**했다. 간신히 마음먹고 누른 버튼에서 시트가 뜨면 흐름이 끊긴다 — 정확도를 얻으려고 앱을 안 열게 되는 교환은 하지 않는다. 노출 조건은 그대로 두고 **개입만 버튼으로** 내렸다.

#### M7. Minimum Viable Start — 착수와 완료의 분리 (병목 B)

| 층 | 내용 |
|---|---|
| 문제 | 완벽주의 때문에 '완성'이 목표가 되면, 완성할 자신이 없는 일은 아예 시작하지 않는다. 시작하지 않으면 기록도 없고, 기록이 없으면 "나는 안 하는 사람"이 된다 |
| 개입 | 고부하·미착수 항목에 **0→1 기준(MVS)** 을 자동 생성해 카드 첫 줄에 놓는다. 예: `2번 문항 논점 3줄만. 7분. 망쳐도 됨.` 목표는 완성이 아니라 **손을 대는 것** |
| 화면 | 제목 아래 1줄(`--text-body`, `--text-2`) + [시작]. 착수하면 `◐ 착수함`(유채색 아님 — 아이콘+텍스트). Focus Mode에는 [착수 성공] 상시 |
| 규칙 | ① 문구는 **제목 패턴에서 생성**한다(동사·목적어 매칭 + 로테이션, 5.10(2)). `mvsLabel`에 저장. 사용자가 고치면 `mvsAcceptedAt` 이후 자동 생성 금지. ② `mvsTargetMin` 기본 7분(착수 타이머보다 짧게). ③ [착수 성공]은 `status: 'started'` + `startedAt` + EngineEvent `started`를 남기고 **완료와 별개로 집계**. ④ 착수 성공 후 남은 일은 다음 후보/내일로 조용히 내려가고 감점 없음. ⑤ **타이머 없이 바로 완료해도 정상** — 완료는 착수를 함의한다(4.10) |
| 폴백 | 문구 생성이 실패하면 `{제목} 5분만 손대기.` 기본 문구. 착수 성공을 눌러도 완료 수치는 늘지 않는다(정직한 집계) |

> 여기서 말하는 "연속 기록"은 **streak·배지가 아니다**(1.5). 오늘 손 댄 것 목록과 `started` 이벤트가 남는다는 뜻이고, 하루를 건너뛰어도 표시되는 숫자가 없다. 착수는 완료가 아니지만 **실패도 아니다** — 엔진은 착수를 다음 회차의 성공 확률을 올리는 관측으로 쓴다(4.6, 4.7).

### 1.5 안티패턴 — 의도적으로 넣지 않는 것

| 안티패턴 | 왜 넣지 않는가 | 대신 |
|---|---|---|
| 빨간 지연 배지, "밀린 일 12개" | 회피 학습. 앱을 안 열게 만든다 | 중립 회색, 필요할 때만 `나눠볼까요?` |
| streak·배지 | 하루 끊기면 전체를 포기한다 | "오늘 한 것"만. 기록은 남기되 점수화하지 않는다 |
| 분 단위 타임블로킹 강제 | 하나 어긋나면 하루를 버린다 | 앵커만 고정, 나머지는 "지금 가능한 것" 추천 |
| 다중 알림·리마인더 폭격 | 알림 피로 → 전부 끔 | 사용자가 켠 것만, 하루 최대 3회 |
| 설정 다층 메뉴 | 설정 관리가 새 업무가 된다 | 설정 1화면 6항목, 나머지는 policy 기본값 |
| 대시보드·통계 첫 화면 | "잘하고 있나"를 먼저 보게 된다 | 첫 화면은 언제나 오늘. 통계는 v2 회고에만 |
| 자동 재배치(승인 없이) | 통제 상실감 | 제안 + 수락 |
| **시작 절차에 끼어드는 자동 단계** | 간신히 누른 [시작]에서 흐름이 끊긴다 | **선택 버튼**(`5분만 재보기`) — 안 누르면 아무 일도 없다 |
| 엔진 점수를 등급·순위로 노출 | 점수는 다음 행동을 알려주지 않고 자존감을 건드린다 | 요청 시 산출 내역만. 카드에 총점 없음 |
| 확률 상시 표시 | 카드마다 붙은 %는 압박이 되어 숫자를 피하게 된다 | 제안 문구·Explain 시트에서만 |
| 착수를 완료로 집계 | 정직하지 않은 기록은 곧 믿지 않게 된다 | `◐ 착수함` / `✓ 완료` 분리 |

---

## 2. 수정 친화적 아키텍처 & 폴더 구조

### 2.1 레이어 구조와 의존 방향

**3단(디자인 · 규칙 · 화면)** 에 **저장(sync)** 을 더해 4개 레이어. `app/`은 조립만 한다.

```
                    ┌─────────────────────────────────────┐
                    │  app/   조립 · 라우팅 · 상태 조립     │
                    └──────┬──────────┬──────────┬────────┘
                           │          │          │
             ┌─────────────┘          │          └──────────────┐
             ▼                        ▼                         ▼
    ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
    │  ui/ 화면·부품   │─────▶│  core/ 데이터·규칙│◀─────│  sync/ 저장·백업 │
    └────────┬────────┘      └─────────────────┘      └─────────────────┘
             │
             ▼
    ┌─────────────────┐
    │  tokens/ 디자인  │   ui만 참조한다 (core·sync는 모른다)
    └─────────────────┘
```

| 레이어 | 허용하는 import | **금지** |
|---|---|---|
| `tokens/` | 없음 (순수 CSS 변수) | 어떤 레이어도 |
| `core/` | `core/` 내부만 | `ui`, `tokens`, `sync`, DOM API, `window`, `fetch` |
| `ui/` | `core`, `tokens` | `sync` 직접 호출(`app`이 주입), 다른 feature 내부 파일 |
| `sync/` | `core` | `ui`, `tokens`, DOM |
| `app/` | 전부 | — |

> `core/engine/`은 새 레이어가 아니라 `core`의 하위 계층이다. `engine`은 `schema`·`policy`만 import하고, `rules`·`selectors`가 `engine`을 쓴다. `ui`는 엔진을 직접 모른다(selector가 준 결과만 받는다) — 모델을 갈아도 화면이 흔들리지 않는 이유다.

강제 수단 3중: ① **`eslint-plugin-boundaries`**(CI 실패) ② **`tsconfig` path alias**(`@core/*`, `@ui/*`, `@tokens/*`만, 상대경로 3단계 이상 금지) ③ **`index.ts` 배럴**(레이어는 공개 API만 export).

> 결과: "디자인만 바꿔줘" = `tokens/` 1개 파일, "규칙 바꿔줘" = `core/rules` 또는 `core/policy.ts`. **UI 파일을 열 일이 없다.**

### 2.2 폴더 구조 (파일별 책임)

```
timekeeper/
├─ .github/workflows/
│  ├─ deploy.yml              # PR verify + main → GitHub Pages (2.7)
│  └─ nightly-backup.yml      # 매일 04:10 KST — Gist 상태를 백업 커밋 (6.7)
├─ public/  manifest.webmanifest · icon-*.png · version.json
├─ src/
│  ├─ tokens/                 # ── 레이어 1: 디자인 ────────────
│  │  ├─ primitive.css        # 원시 값. 직접 쓰지 않는다
│  │  ├─ semantic.dark.css · semantic.light.css
│  │  ├─ typography.css · space.css · motion.css · index.css
│  ├─ core/                   # ── 레이어 2: 데이터·규칙 ───────
│  │  ├─ schema/v1.ts · current.ts · factory.ts
│  │  ├─ migrations/index.ts · v1_to_v2.ts · __fixtures__/
│  │  ├─ policy.ts            # ★ 모든 숫자 상수 (2.5, 4.11)
│  │  ├─ engine/              # ★ 확률·점수 계산 (4장)
│  │  │  ├─ index.ts          # 배럴: createEngine()
│  │  │  ├─ types.ts · math.ts · events.ts · replay.ts
│  │  │  ├─ time-model.ts     # M-E1 분류 셀 보정 (4.3)
│  │  │  ├─ energy-model.ts   # M-E2 4블록 곡선·피로 (4.4)
│  │  │  ├─ start-model.ts    # P_start (4.7)
│  │  │  ├─ utility.ts        # M-E3 개별 효용·그리디 선정 (4.5)
│  │  │  ├─ completion.ts     # M-E4 완료 확률·분해 (4.6)
│  │  │  └─ explain.ts        # ScoreBreakdown 조립 (4.8)
│  │  ├─ rules/
│  │  │  ├─ types.ts · registry.ts
│  │  │  ├─ carryover.ts      # ① 이월·복귀·쪼개기 제안
│  │  │  ├─ workout-intensity.ts  # ② 밀도 ↔ 운동 강도
│  │  │  ├─ energy-filter.ts  # ③ 에너지 ↔ 필터
│  │  │  ├─ now-fit.ts        # ④ Now Line ↔ 남은 시간
│  │  │  └─ mvs.ts            # M7 문구 생성(패턴 매칭 + 로테이션, 5.10(2))
│  │  ├─ selectors/
│  │  │  ├─ todayBoard.ts · estimate.ts · mvs.ts · timeline.ts
│  │  │  ├─ gaps.ts · density.ts · snapshot.ts
│  │  ├─ data/
│  │  │  ├─ contexts.ts       # 기본 분류 4개 — 데이터
│  │  │  ├─ routines.ts       # 운동 루틴 — 데이터
│  │  │  └─ mvs.ts            # MVS 패턴·템플릿 표 — 데이터(로직 없음)
│  │  └─ content/strings.ko.ts   # ★ 모든 UI 문구
│  ├─ ui/                     # ── 레이어 3: 화면 ──────────────
│  │  ├─ primitives/          # Card · Chip · IconButton · Sheet · Toast · Ring
│  │  ├─ patterns/            # ItemCard · EnergySwitch · NowLine · EmptyState
│  │  ├─ features/
│  │  │  ├─ capture/ · focus-board/ · timeline/ · workout/ · focus-mode/
│  │  │  └─ review/           # (v2) 수면·기분 체크인
│  │  ├─ screens/             # TodayScreen · TimelineScreen · ArchiveScreen
│  │  └─ styles/
│  ├─ sync/                   # ── 레이어 4: 저장·백업 ─────────
│  │  ├─ adapter.ts           # SyncAdapter (6.4)
│  │  ├─ local/idb.ts         # IndexedDB (6.3)
│  │  ├─ remote/gist.ts · supabase.ts(옵션)
│  │  ├─ merge.ts · outbox.ts
│  │  └─ backup.ts            # 일별 스냅샷 + **1탭 파일 내보내기/복원** (6.7)
│  ├─ app/  main.tsx · store.ts · routes.tsx · providers.tsx
│  └─ tests/
│     ├─ engine/              # v1: 단위 테스트 6종 (4.12)
│     ├─ rules/ · migrations/ · visual/
├─ index.html · vite.config.ts · tsconfig.json
├─ ROLLBACK.md · CHANGELOG.md
```

> **폴더 규칙 3개** — ① 한 파일 200줄 이내 ② 한 컴포넌트는 하나의 책임 ③ feature 폴더는 서로 import하지 않고 `screens`에서만 조합.

### 2.3 레이어 계약 표

| 레이어 | 책임 | 변경 빈도 | 바뀌면 영향 |
|---|---|---|---|
| `tokens/` | 색·타이포·간격·모션의 **유일한 정의처** | 디자인 요청마다 | 전체 화면 (의도된 전파) |
| `core/schema` | 타입 계약 | 거의 없음 (expand-only) | 컴파일러가 알려줌 |
| `core/policy` | 숫자 다이얼 | 자주 | 규칙·문구·엔진 점수 자동 반영 |
| `core/engine` | 확률·점수 계산 (순수) | 가끔 | 추천 순서·근거만 |
| `core/rules` | 판단(제안) | 가끔 | 제안·하이라이트만 |
| `core/selectors` | 파생 상태 | 가끔 | 화면 데이터 |
| `ui/features` | 화면·인터랙션 | 가장 자주 | 해당 feature만 |
| `sync/` | 저장·전송 | 드묾 | 데이터 계층 (격리) |

### 2.4 디자인 토큰 3계층

```
primitive (원시값)      semantic (의미)              component (부품)
--neutral-900: #0A0B0D  --bg: var(--neutral-900)     --card-bg: var(--surface)
--accent-400: #8B9CFF   --surface: #121316           --card-radius: var(--radius-lg)
--space-4: 16px         --text-1: var(--neutral-100) --chip-pad: var(--space-2)
```

컴포넌트 CSS는 **semantic 토큰만** 참조한다. primitive 직접 참조는 lint로 차단(테마 전환 붕괴를 원천 봉쇄).

### 2.5 `core/policy.ts` — 모든 다이얼을 한 곳에

```
// src/core/policy.ts
export const POLICY = {
  // ── ADHD 메커니즘 ──────────────────────────────
  maxFocusCards: 3,          // M2
  starterTimerMin: 10,       // M4
  extendTimerMin: 25,
  breakTimerMin: 5,
  carrySplitThreshold: 3,    // M5
  nowPickCount: 2,           // M3

  // ── 하루 경계 ─────────────────────────────────
  dayStartHour: 4,           // 04:00 — 새벽 작업을 '어제'로 묶는다 + 피로 리셋 시점
  dayEndHour: 24,
  wakingStartHour: 8,        // 밀도 계산용 가용 창
  gapBufferMin: 5,

  // ── 운동 강도 ─────────────────────────────────
  density: { full: 0.35, reduced: 0.6 },
  workoutMinimum: { label: '스트레칭·산책', minutes: 15 },

  // ── 데이터 ────────────────────────────────────
  tombstoneDays: 30,
  backupKeep: { daily: 7, weekly: 4, monthly: 12 },
  fileBackupNudgeDays: 7,    // 파일 백업 안내 주기 (6.7)
} as const;
```

> "이월 3회를 5회로", "타이머 10분을 15분으로" — **전부 여기 한 줄**. 엔진 파라미터는 같은 파일의 `engine` 키(4.11). 모델 상수를 `engine/` 안에 두지 않는 이유는 D3과 같다.

### 2.6 `ui/`의 조립 규칙

- `primitives/` — 도메인 지식 0. `Card`는 `Item`을 모른다.
- `patterns/` — 도메인 지식을 가진 재사용 부품. `ItemCard`는 `item` + `Proposal[]`를 받아 렌더만 한다(계산 없음).
- `features/` — 부품을 조합하고 상호작용을 붙인다. **계산은 `core/selectors`에서** 가져온다.
- `screens/` — feature를 배치. 여기만 라우팅을 안다.

새 화면 비용 = `features/새기능/` 1개 + `screens/` 등록 1줄. 기존 화면 코드를 열지 않는다.

### 2.7 GitHub 기반 CI/CD · 프리뷰 · 롤백

| 규칙 | 내용 |
|---|---|
| 브랜치 | `main` = 배포본. 모든 수정은 `fix/…` `feat/…` `ui/…` 브랜치 → PR |
| 커밋 접두어 | `tokens:` `rules:` `engine:` `schema:` `ui:` `sync:` `fix:` |
| CHANGELOG | 접두어로 자동 분류 생성 |

```
# .github/workflows/deploy.yml (요지)
on: { push: { branches: [main] }, pull_request: }
jobs:
  verify:   # 모든 PR·push
    steps: [checkout, setup-node@20, npm ci,
            npm run typecheck,   # 레이어 경계·타입 계약
            npm run lint,        # boundaries 규칙
            npm run test,        # 규칙·엔진 단위·마이그레이션
            npm run build,
            npm run build -- --base=/preview/pr-${{ github.event.number }}/]  # PR 프리뷰
  deploy:   # main만, verify 통과 후
    steps: [checkout, npm ci && npm run build,
            upload-pages-artifact(dist), deploy-pages]
```

**PR 프리뷰**: 수정안을 배포 전에 **실제 URL로** 확인한다(`https://<user>.github.io/timekeeper/preview/pr-42/`). "이 색이 맞나"를 말로 설명하지 않고 링크로 보낸다.

**롤백 3단계 (`ROLLBACK.md`)**

| 단계 | 상황 | 방법 | 소요 |
|---|---|---|---|
| 1 | 방금 배포가 이상하다 | Actions → 마지막 정상 run → **Re-run deploy** | ~60초 |
| 2 | 코드를 되돌려야 한다 | `git revert <sha>` → push (자동 배포) | ~2분 |
| 3 | 여러 커밋이 엉켰다 | `git checkout v1.4.2 && git push origin HEAD:main --force-with-lease` | ~3분 |

데이터 롤백은 코드 롤백과 분리한다 — 앱 안의 백업 복원(6.7)으로 처리하고, 코드를 되돌려도 데이터는 건드리지 않는다.

**버전 인지**: `public/version.json`을 5분마다 폴링, 새 버전이면 하단 1줄 `새 버전이 준비됐어요 · 새로고침`. **자동 새로고침 금지** — Focus Mode 도중 화면이 바뀌면 안 된다.

### 2.8 변경 라우팅 표 — "이 요청은 어디를 고치나"

| 요청 유형 | 예 | 수정 위치 | 건드리지 않는 곳 | 검증 |
|---|---|---|---|---|
| 색·여백·타이포·곡률 | "전체 톤 차분하게" | `tokens/semantic.*.css`, `typography.css` | 모든 컴포넌트 CSS | 시각 회귀 4장면 × 2테마 |
| 모션 톤 | "애니메이션 더 조용하게" | `tokens/motion.css` | — | 수동 |
| 카드 모양(특정 화면) | "오늘 카드 더 납작하게" | `ui/features/focus-board/*.css` | 다른 feature | 스크린샷 |
| 문구 | "이월 버튼 이름 바꿔" | `core/content/strings.ko.ts` | 컴포넌트 | 텍스트 스냅샷 |
| 숫자 임계값 | "이월 5회, 타이머 15분" | `core/policy.ts` | 로직 | 규칙 경계 테스트 |
| 규칙 로직 | "운동은 저녁에만 제안" | `core/rules/workout-intensity.ts` | UI | 규칙 유닛 테스트 |
| 새 필드 | "장소 메모 추가" | `schema/v2` + `migrations/v1_to_v2.ts` + 카드 | 규칙 엔진 | 마이그레이션 픽스처 |
| 새 화면 | "주간 회고" | `ui/features/review/` + `screens/` 1줄 | 기존 화면 | 수동 + 스크린샷 |
| 새 저장소 | "Supabase로 옮겨" | `sync/remote/supabase.ts` + 설정 1줄 | `core`, `ui` | 통합 테스트 |
| 운동 루틴 내용 | "루틴 3개 추가" | `core/data/routines.ts` | 코드 없음 | 수동 |
| 엔진 가중치 | "영역 균형 더 챙겨" | `settings.engineOverrides` 또는 `policy.engine.utility` | 규칙 로직·UI | v1: 카드 3장 미리보기 / v2: 백테스트 |
| 엔진 모델 | "추정이 이상해" | `core/engine/time-model.ts` + `policy.engine.time` | UI·스키마 | 단위 테스트(4.12) |
| **5분 재보기 빈도** | "재보기 버튼이 너무 자주 떠" | `policy.engine.explore.sigma` 상향 또는 항목별 `probeDismissedAt` | 로직·UI | 수동 |
| **MVS 문구** | "착수 문구 바꿔" | `core/data/mvs.ts`(패턴·템플릿) 또는 카드에서 1줄 수정 | 엔진·규칙 로직 | 텍스트 스냅샷 |
| **타이머** | "시작하면 바로 타이머 말고 5분으로" | `policy.starterTimerMin` | — | 수동 |

> 표에 없는 요청이 오면 **먼저 표를 확장한다.** 예외를 즉석 처리하기 시작하면 그 구조가 무너진다.

---

## 3. 데이터 스키마 v1 & 정보 간 유기성

### 3.1 스키마 원칙

| # | 원칙 | 이유 |
|---|---|---|
| S1 | **단일 `Item`** — 네 종류를 하나의 판별 유니온으로 | 정렬·이월·교체·추천이 한 배열에서 동작. 종류별 분기가 화면으로 새지 않는다 |
| S2 | **맵 저장** `Record<id, Item>` | 병합·조회 O(1), 인덱스 충돌 없음 |
| S3 | **파생값 비저장** — 오늘 카드·밀도·추천·불확실성은 계산. 예외는 `DailySnapshot`(기록)과 `EngineEvent`(사실) | 규칙 변경이 과거 데이터를 오염시키지 않는다 |
| S4 | **expand-only** — 새 필드는 항상 optional + 기본값 | 마이그레이션이 "값을 채우는" 일로 축소 |
| S5 | **로컬 날짜 + 분** (`2026-11-27`, `1140`) | 타임존·서머타임 오차 없이 "그날의 시간표" |
| S6 | **삭제는 tombstone** (`deletedAt`) | 동기화에서 "지운 항목이 되살아나는" 문제 방지 |
| S7 | **id는 UUIDv7** | 생성 시각 순 정렬 → 인박스 정렬에 별도 필드 불필요 |

### 3.2 TypeScript 정의 (v1)

```
// src/core/schema/v1.ts
export const SCHEMA_VERSION = 1 as const;

export type LocalDate = `${number}-${number}-${number}`;
export type Instant   = string;   // ISO 8601 + 오프셋
export type Minutes   = number;   // 자정 기준 0–1439
export type ItemId    = string;   // UUIDv7

export type ItemKind    = 'anchor' | 'task' | 'errand' | 'workout';
export type Energy      = 'high' | 'mid' | 'low';
export type ItemStatus  = 'inbox' | 'planned' | 'doing' | 'started' | 'done' | 'dropped';
export type Difficulty  = 1 | 2 | 3;   // 1 쉬움 · 2 보통 · 3 어려움 (없으면 2)
export type Intensity   = 'full' | 'reduced' | 'minimum';
// 'started' = 0→1만 찍은 상태. 완료가 아니고, 실패도 아니다 (M7, 4.6)

export interface Placement {
  date: LocalDate; startMin: Minutes; durationMin: number;
  source: 'manual' | 'suggested';
}

/** 5분 재보기 결과 (M6) — v1.2: 판정은 2종. 쪼개기는 판정이 아니라 별도 제안 */
export interface Exploration {
  doneAt: Instant;
  actualMin: number;                // 실제로 걸린 시간 (3–10분)
  revisedEstimateMin: number;       // 재본 뒤의 추정 (변경 없으면 원래 값)
  verdict: 'kept' | 'bigger';
}

export interface ItemBase {
  id: ItemId;
  kind: ItemKind;
  title: string;
  note?: string;
  contextId: string;                // Context 참조 — **엔진 v1의 셀 단위** (4.3)
  goalId?: string;
  energy: Energy;                   // 요구 에너지
  estimateMin: number;              // 예상 소요 (5분 단위)
  status: ItemStatus;
  placement?: Placement;
  createdAt: Instant;
  updatedAt: Instant;               // ★ 충돌 판정 기준
  deletedAt?: Instant;              // tombstone (30일 후 purge)
  carryCount?: number;              // 내부용. 화면에 숫자로 노출하지 않는다
  carriedFrom?: LocalDate[];
  splitDeclined?: boolean;

  // ── 난이도·불확실성 (M6, 4.3) ────────────────────────
  difficulty?: Difficulty;          // 요구 에너지·피로 부하에 쓰인다 (v1에서 셀 축은 아님)
  firstOfKind?: boolean;            // 이 유형을 처음 — 사전 분산을 키운다
  exploration?: Exploration;        // 재보기 결과. 있으면 E1이 작은 분산으로 반영
  probeDismissedAt?: Instant;       // '5분만 재보기' 버튼을 닫은 시각 (7일간 재노출 금지)

  // ── 착수와 완료의 분리 (M7, 4.6) ──────────────────────
  mvsLabel?: string;                // 0→1 기준 문구. 예: '2번 문항 논점 3줄만. 망쳐도 됨.'
  mvsTargetMin?: number;            // 목표 시간(분). 기본 7
  mvsAcceptedAt?: Instant;          // 사용자가 수락·수정한 시각 (이후 자동 생성 금지)
  startedAt?: Instant;              // 첫 착수 시각 (0→1)
  startedCount?: number;
  completedAt?: Instant;
  actualMin?: number;               // **타이머를 켠 세션에서만** 기록 (D14)
  interruptions?: number;
}

export interface AnchorItem extends ItemBase {
  kind: 'anchor';
  startAt: Instant; endAt: Instant;
  allDay?: boolean; location?: string;
  rigidity: 'hard' | 'soft';        // hard=이동 불가(시험·수업)
  recurrence?: Recurrence;
}

export interface TaskItem extends ItemBase {
  kind: 'task';
  dueDate?: LocalDate;
  priority: 1 | 2 | 3;              // 1=오늘 반드시
  subtasks?: { id: string; title: string; done: boolean }[];
  splitFrom?: ItemId;
  parkedSplit?: boolean;
}

export interface ErrandItem extends ItemBase {
  kind: 'errand';
  place?: string;
  batchKey?: string;                // 같은 외출로 묶기
  window?: 'morning' | 'afternoon' | 'evening' | 'any';
}

export interface WorkoutItem extends ItemBase {
  kind: 'workout';
  routineId: string;                // core/data/routines.ts 키
  plannedMinutes: number;
  intensity: Intensity;
  autoAdjusted?: { date: LocalDate; from: Intensity; reason: string } | null;
}

export type Item = AnchorItem | TaskItem | ErrandItem | WorkoutItem;

export interface Recurrence { freq: 'daily' | 'weekly'; byWeekday?: number[]; until?: LocalDate }

export interface Goal {
  id: string; title: string;                    // '인하대 논술 12/5'
  horizon: 'exam' | 'term' | 'quarter' | 'open';
  dueDate?: LocalDate;
  weight?: Partial<Record<ItemKind, number>>;   // 종류별 에너지 배분 의도
  note?: string;
}

export interface Context {           // 분류 — 사용자가 늘릴 수 있는 데이터
  id: string;                       // 'study' | 'work' | 'errand' | 'workout'
  label: string;                    // '공부'
  kind: ItemKind | 'mixed';
  defaultEnergy: Energy;
  preferredWindows?: ('morning' | 'afternoon' | 'evening')[];
  accent?: 'neutral' | 'accent';
}

export interface WorkoutRoutine {
  id: string; label: string;
  fullMinutes: number; reducedMinutes: number;
  steps: string[]; equipment?: 'none' | 'gym';
}

export const ROUTINES: WorkoutRoutine[] = [
  { id: 'lower-body', label: '하체 루틴',   fullMinutes: 60, reducedMinutes: 30, equipment: 'gym',  steps: ['스쿼트', '런지', '레그프레스'] },
  { id: 'stretch',    label: '전신 스트레칭', fullMinutes: 20, reducedMinutes: 10, equipment: 'none', steps: ['목·어깨', '척추 비틀기', '하체 스트레칭'] },
  { id: 'walk',       label: '빠르게 걷기',  fullMinutes: 40, reducedMinutes: 20, equipment: 'none', steps: ['밖으로 나가 20분 걷기'] },
];
// '최소 기준'(15분 스트레칭·산책)은 루틴이 아니라 POLICY.workoutMinimum에 있다 —
// 어떤 루틴을 골랐든 '오늘 0점은 아니다'라는 마지막 성공 조건은 하나여야 한다.

/** 그날의 사실 기록 — 파생값 비저장 원칙의 유일한 예외 */
export interface DailySnapshot {
  date: LocalDate; createdAt: Instant;
  energyLog: { at: Instant; level: Energy }[];
  anchorMinutes: number;
  densityScore: number;             // 기록용 — 화면은 항상 재계산
  focusPicks: { itemId: ItemId; pickedAt: Instant; replacedBy?: ItemId }[];
  completed: ItemId[]; started: ItemId[]; explored: ItemId[]; carried: ItemId[];
  workout: { intensity: Intensity | 'skipped'; minutes: number };
  fatigueEnd?: number;              // 그날 마감 시점 0–1 (기록용)
  engineVersion?: string;
  mood?: 1 | 2 | 3 | 4 | 5;         // v2 예고 (S4)
  sleepMinutes?: number;            // v2 예고 — v1은 기록하지도, 쓰지도 않는다
  note?: string;
}

export interface Settings {
  schemaVersion: number;
  deviceId: string; timezone: string;
  theme: 'dark' | 'light' | 'system';
  dayStartHour: number;             // 기본 4
  weekStart: 0 | 1;
  maxFocusCards: number;
  sync: {
    provider: 'none' | 'gist' | 'supabase';
    lastSyncedAt?: Instant; lastRemoteRev?: number;
    tokenExpiresAt?: Instant;       // v1.2: PAT 만료일 (6.8 7일 전 리마인드)
  };
  lastFileBackupAt?: Instant;       // v1.2: 1탭 파일 백업 시각 (6.7)
  onboardingDone: boolean;
  engine: { enabled: boolean; overrides?: Partial<EngineWeights> };
}

export type EngineWeights = {
  wUrgency: number; wBalance: number; wEnergy: number;
  wFit: number; wStart: number; wSwitch: number; wRecovery: number;   // v1.2: recovery 7번째 항
};

export interface AppDataV1 {
  schemaVersion: 1;
  settings: Settings;
  items: Record<ItemId, Item>;
  goals: Record<string, Goal>;
  contexts: Record<string, Context>;
  snapshots: Record<LocalDate, DailySnapshot>;
  events: Record<string, EngineEvent>;   // ★ 엔진의 유일한 학습 입력 (append-only)
  engineCache?: ModelState;              // 재계산 가능한 캐시 — 동기화·백업 제외
}

/** 발생한 사실. 수정·삭제하지 않는다 */
export type EngineEventType =
  | 'start'      // 타이머 시작 (선택 사항 — 없어도 된다)
  | 'started'    // 0→1 착수 (완료가 아님)
  | 'complete' | 'pause' | 'resume' | 'abandon'
  | 'explore' | 'carry' | 'energy' | 'workout'
  | 'rollover';  // 하루 경계 처리 (actor: system)

export interface EngineEvent {
  id: string;                       // UUIDv7 — 병합은 id 합집합 (6.6)
  at: Instant; date: LocalDate;
  itemId: ItemId | '-';             // 'rollover'는 '-'
  type: EngineEventType;
  actor: 'user' | 'system';         // 학습은 'user'만 (4.13)
  cell?: string;                    // v1: contextId('study'). v2: 'study:3' (4.3)
  plannedMin?: number;
  actualMin?: number;               // **타이머가 돈 세션에서만** 채워진다
  energyAt?: Energy;
  fatigueAt?: number;
  revisedMin?: number;              // explore 결과
  note?: string;
}

/** 이벤트에서 재계산 가능한 캐시 — 저장하되 동기화·백업 제외 (D2) */
export interface ModelState {
  version: string;                  // 'e1.2' — 모델 코드가 바뀌면 재계산
  replayedEvents: number;           // events 수와 다르면 폐기·replay (4.11)
  global: TimeCell;
  byContext: Record<string, TimeCell>;   // v1: 셀 4개
  byCell?: Record<string, TimeCell>;     // **v2 예약** — 'study:3' 난이도 셀
  energy: { blocks: number[]; days: number };   // v1: 4블록. v2에서 48빈
  start: Record<string, { p: number; n: number }>;  // v1: kind 단위
  calibration?: { brier: number; samples: number }; // v2
}

export interface TimeCell {
  nEff: number;                     // Kish 유효 표본 수
  muLog: number;                    // 로그 비율 사후 평균
  sigmaLog: number;                 // 사후 표준편차 = 불확실성 u
  interruptRate: number;            // 중단율 (Beta 사후 평균)
}

/** 화면이 쓰는 보정 추정 — 카드에는 구간만 보인다 (4.3) */
export interface Estimate {
  plannedMin: number;               // t̂
  correctedMin: number;             // t̃ (5분 단위)
  lo: number; hi: number;           // 80% 구간
  u: number;                        // 불확실성 = σ̂
  cellN: number;                    // 셀 유효 표본
  factor: number;                   // b
}
```

> **설정과 정책의 관계**: `policy.ts`는 **기본값**, `settings`는 **사용자가 명시적으로 바꾼 값**. 판정은 항상 `settings.maxFocusCards ?? POLICY.maxFocusCards`. 기본값을 바꾸면 사용자가 직접 바꾸지 않은 기기는 새 기본값을 따라간다.
>
> **스냅샷의 파생값**: `densityScore`는 그 시점의 계산을 **기록**으로 남길 뿐, 화면은 항상 다시 계산한다. 기록은 "그날이 어땠는지", 화면은 "지금 어떻게 보여야 하는지"를 위한 것이다.
>
> **v1.1/v1.2 필드의 버전 취급**: 아직 **코드가 없으므로** 이번 추가·변경 필드는 **v1 안에서 expand-only로 흡수**한다(`SCHEMA_VERSION = 1` 유지). 구현이 시작된 뒤에 필드를 더하면 그때는 v2 + 마이그레이션이 된다(3.5).
>
> **엔진 캐시의 지위**: `engineCache`는 "학습 결과"가 아니라 "이벤트 로그를 빠르게 다시 읽기 위한 캐시"다. 백업·동기화에 넣지 않고, `replayedEvents`가 맞지 않으면 버리고 다시 계산한다 — 기기마다 같은 이벤트에서 같은 상태가 나와야 한다(E1).

### 3.3 필드 사전 (요약)

| 필드 | 타입 | 필수 | 설명 | 예 |
|---|---|---|---|---|
| `id` | UUIDv7 | ✔ | 생성 순 정렬 가능한 식별자 | `01937b1e-…` |
| `kind` | 4종 | ✔ | 분기 기준. **이후 변경 불가** | `task` |
| `contextId` | string | ✔ | 분류. **엔진 v1의 셀**이자 화면 필터 단위 | `study` |
| `goalId` | string | — | 목표 연결. 회고의 "목표 대비" 계산 | `goal-inha` |
| `energy` | high/mid/low | ✔ | 요구 에너지 (규칙 ③, `Efit`) | `high` |
| `estimateMin` | number | ✔ | 5분 단위. 화면에는 `t̃`와 구간으로 표시(4.3) | `60` |
| `status` | 6종 | ✔ | `inbox` → `planned` → `doing` → `started` → `done`/`dropped` | `planned` |
| `difficulty` | 1–3 | — | 요구 에너지·피로 부하 입력. **v1 셀 축 아님** | `3` |
| `firstOfKind` | boolean | — | 처음 해보는 유형 — 사전 분산↑, 재보기 버튼 노출 | `true` |
| `exploration` | 객체 | — | 재보기 결과. E1에 작은 분산으로 반영 | `{actualMin:5,revisedEstimateMin:75,verdict:'bigger'}` |
| `probeDismissedAt` | Instant | — | 재보기 버튼을 닫은 시각 (7일 재노출 금지) | — |
| `uncertainty` | number | — | **저장하지 않는다(파생값)** — 엔진 `u = σ̂`로 매번 계산 | (계산값) |
| `mvsLabel` | string | — | 0→1 기준 문구. 사용자가 고치면 그 문구가 남는다 | `'2번 문항 논점 3줄만. 망쳐도 됨.'` |
| `mvsTargetMin` | number | — | 목표 시간(분). 기본 7 | `7` |
| `startedAt` | Instant | — | 첫 착수 시각. **완료와 별개** | `2026-11-27T19:12:00+09:00` |
| `actualMin` | number | — | 타이머로 잰 실제 소요. **타이머를 켠 세션만** | `48` |
| `placement` | 객체 | — | 있으면 타임라인에 놓임 | `{date,startMin:1140,durationMin:60,source:'manual'}` |
| `carryCount` | number | — | 이월 횟수. **내부용**(P4) | `2` |
| `rigidity` | hard/soft | 앵커✔ | hard 100%, soft 50%로 밀도 계산 | `hard` |
| `priority` | 1–3 | task✔ | 1은 "오늘 반드시" | `1` |
| `intensity` | 3종 | 운동✔ | `minimum`이면 15분 기준 | `reduced` |
| `batchKey` | string | — | 같은 외출로 묶기 | `market` |
| `updatedAt` | Instant | ✔ | **충돌 판정의 유일한 기준** | `2026-11-27T18:33:00+09:00` |
| `deletedAt` | Instant | — | tombstone. 30일 후 purge | — |
| `events` | `Record<id, EngineEvent>` | ✔ | append-only 사실 로그. 엔진의 유일한 학습 입력 | `{type:'started',actor:'user'}` |

### 3.4 실제 레코드 예시

```
// ① 배치된 업무 항목
{ "id": "01937b1e-8c2a-7f31-9a44-2b1d0e5f6a01", "kind": "task",
  "title": "인하대 논술 2번 문항 재작성", "contextId": "study", "goalId": "goal-inha",
  "energy": "high", "estimateMin": 60, "status": "planned", "priority": 1,
  "dueDate": "2026-12-04",
  "placement": { "date": "2026-11-27", "startMin": 1140, "durationMin": 60, "source": "manual" },
  "carryCount": 0,
  "createdAt": "2026-11-27T18:20:11+09:00", "updatedAt": "2026-11-27T18:31:02+09:00" }

// ② 크기를 재고, 손만 대고 끝난 항목 — 완료가 아니라 '착수'
{ "id": "01937b1e-8c2a-…6a01", "kind": "task", "title": "인하대 논술 2번 문항 재작성",
  "contextId": "study", "energy": "high", "difficulty": 3, "estimateMin": 60, "status": "started",
  "exploration": { "doneAt": "2026-11-27T19:05:00+09:00", "actualMin": 5,
                   "revisedEstimateMin": 90, "verdict": "bigger" },
  "mvsLabel": "2번 문항 논점 3줄만. 망쳐도 됨.", "mvsTargetMin": 7,
  "startedAt": "2026-11-27T19:12:00+09:00", "startedCount": 1,
  "updatedAt": "2026-11-27T19:12:00+09:00" }

// ③ 엔진 이벤트 3건 — 학습은 이 사실들에서만 일어난다
[ { "id": "01937b22-11aa-7…", "at": "2026-11-27T19:05:00+09:00", "date": "2026-11-27",
    "itemId": "01937b1e-8c2a-…", "type": "explore", "actor": "user",
    "cell": "study", "plannedMin": 60, "actualMin": 5, "revisedMin": 90 },
  { "id": "01937b22-22bb-7…", "at": "2026-11-27T19:12:00+09:00", "date": "2026-11-27",
    "itemId": "01937b1e-8c2a-…", "type": "started", "actor": "user",
    "cell": "study", "plannedMin": 90, "energyAt": "mid", "fatigueAt": 0.31 },
  { "id": "01937b22-33cc-7…", "at": "2026-11-27T19:26:00+09:00", "date": "2026-11-27",
    "itemId": "01937b1e-8c2a-…", "type": "abandon", "actor": "user",
    "cell": "study", "plannedMin": 90, "actualMin": 14 } ]

// ④ 하루 경계 처리 — 시스템 이벤트 1건 (학습에는 쓰지 않고 감사·복원용)
{ "id": "01937b30-00ff-7…", "at": "2026-11-28T04:00:03+09:00", "date": "2026-11-28",
  "itemId": "-", "type": "rollover", "actor": "system", "note": "carried:3 reset:fatigue" }
```

### 3.5 `schemaVersion`과 무손실 마이그레이션 파이프라인

**원칙** — ① 한 단계씩만(`v1→v2`) ② 각 마이그레이션은 **순수 함수** ③ 실행 **전 자동 백업**(`pre-migration-v{from}-{ts}.json`) ④ 실패 시 **격리**: 원본 보존 + 읽기 전용 + `내보내기` ⑤ 상위 버전 데이터는 **읽기 전용 잠금** ⑥ 모든 버전의 실데이터 픽스처를 저장소에 두고 스냅샷 비교.

```
// src/core/migrations/index.ts
export interface Migration { from: number; to: number; describe: string; migrate(input: any): any }

export const migrations: Migration[] = [];   // v1이 첫 버전 — 현재 비어 있다

export function migrateToLatest(raw: unknown, latest = SCHEMA_VERSION): any {
  let data: any = raw, v: number = data?.schemaVersion ?? 0, guard = 0;
  if (v > latest) throw new UpgradeRequiredError(`stored v${v} > app v${latest}`);
  while (v < latest) {
    const m = migrations.find((x) => x.from === v);
    if (!m) throw new MigrationGapError(`no migration from v${v}`);
    if (++guard > 100) throw new MigrationGapError('migration loop');
    data = { ...m.migrate(data), schemaVersion: m.to }; v = m.to;
  }
  return data;
}
```

**부팅 순서**: `IndexedDB 읽기` → `pre-migration 백업` → `migrateToLatest` → 성공 시 새 버전 기록 / 실패 시 quarantine + 읽기 전용 화면.

**예시 — v2: 수면·기분 트래커** (7.5의 축약판)

```
export const v1_to_v2: Migration = {
  from: 1, to: 2, describe: '스냅샷에 수면·기분 필드 추가 (기존 값 무변경)',
  migrate(d) {
    const snapshots = Object.fromEntries(Object.entries(d.snapshots ?? {}).map(
      ([date, s]: [string, any]) => [date, { sleepMinutes: null, mood: null, ...s }]));
    return { ...d, snapshots };
  },
};
```

### 3.6 네 가지 유기적 연동 규칙

규칙은 모두 `core/rules/`의 **순수 함수**이고, 반환은 `Proposal[]`이다. **데이터를 직접 바꾸지 않는다**(D4).

> **엔진과의 역할 분담**: 엔진이 켜져 있을 때 **점수·확률은 엔진**이 계산하고, 네 규칙은 ①**제안 문구·우선순위** ②**엔진이 꺼졌거나 데이터가 부족할 때의 폴백**을 맡는다. 아래 임계값·공식은 없어지지 않고 `engine.enabled = false`에서 그대로 동작한다.

```
// src/core/rules/types.ts
export interface RuleContext {
  now: Instant; today: LocalDate; nowMin: Minutes;
  items: Item[]; snapshot: DailySnapshot; settings: Settings;
  energy: Energy; anchorsToday: AnchorItem[];
  model?: ModelState;               // 엔진 상태 (없으면 규칙 폴백)
  fatigue?: number;                 // 0–1
}

export type ReasonCode =
  | 'fits-gap' | 'energy-match' | 'energy-mismatch'
  | 'carry-threshold' | 'dense-day' | 'due-soon' | 'goal-aligned'
  | 'batchable' | 'overrun-risk'
  | 'low-completion' | 'start-barrier'
  | 'estimation-uncertain' | 'first-of-kind';

export interface Proposal {
  kind: 'highlight' | 'dim' | 'badge' | 'suggest-workout'
      | 'suggest-split' | 'suggest-extra-card' | 'suggest-batch'
      | 'suggest-probe' | 'suggest-mvs';
  itemId?: ItemId;
  reason: ReasonCode;
  message?: string;                 // strings.ko.ts 키
  payload?: Record<string, unknown>;   // { intensity, probability, cellN … }
  score?: number;                   // 정렬용 0–1
}

export interface Rule { id: string; since: number; evaluate(ctx: RuleContext): Proposal[] }
```

#### 규칙 ① — 할 일 ↔ 타임라인 양방향 배치, 미완료 자동 복귀

| 항목 | 정의 |
|---|---|
| 목적 | 목록과 시간표를 같은 데이터로 묶는다 |
| 동작 A (목록→시간) | 카드를 빈 구간에 드롭 → `placement = {date, startMin, durationMin: t̃, source:'manual'}` |
| 동작 B (시간→목록) | 블록을 밖으로 드래그 → `placement` 삭제, `status: planned` (항목은 남는다) |
| 동작 C (복귀) | 하루 경계(04:00) 이후 `placement.date < today`이고 `status ∈ {planned, doing, started}` → `carryCount++`, `carriedFrom.push`, `placement` 삭제. `started`는 완료가 아니므로 이월되지만 **실패로 집계하지 않는다** |
| 출력 | C는 토스트 1개(`내일로 옮겨뒀어요.`)와 함께 조용히. 화면에 횟수 표시 없음 |
| 쪼개기(규칙) | `carryCount ≥ 3` && `!splitDeclined` → 다음 날 `suggest-split` 1회. 수락 시 자식 3~5개(`splitFrom`), 원본은 `dropped` + `parkedSplit: true` |
| 쪼개기(엔진) | `P_done(현재) < 0.5` && 각 20분 조각의 `P_done ≥ 0.75` && `n_eff ≥ 3` → 확률 근거와 함께 제안(4.6). 데이터가 모자라면 위 규칙으로 돌아간다 |
| 엣지 | 겹치면 드롭을 거부하지 않고 **가장 가까운 빈 구간으로 민 뒤** 1.5초 하이라이트. 거부 대화상자 없음 |

```
export function resolveCarryover(items: Item[], today: LocalDate, p = POLICY) {
  const carried: ItemId[] = [];
  const next = items.map((it): Item => {
    if (it.deletedAt || !it.placement) return it;
    if (it.placement.date >= today) return it;
    if (!['planned', 'doing', 'started'].includes(it.status)) return it;
    carried.push(it.id);
    const { placement, ...rest } = it;
    return { ...rest, status: 'planned', carryCount: (it.carryCount ?? 0) + 1,
      carriedFrom: [...(it.carriedFrom ?? []), it.placement.date],
      updatedAt: it.updatedAt };                 // 이월은 updatedAt을 올리지 않는다 (6.6)
  });
  const splitTargets = next.filter((i) => !i.deletedAt
    && (i.carryCount ?? 0) >= p.carrySplitThreshold && !i.splitDeclined).map((i) => i.id);
  return { items: next, carried, splitTargets };
}
```

> 이월은 `updatedAt`을 올리지 않는다 — 시스템이 한 일이 사용자의 편집을 덮어쓰면 안 된다(6.6의 "한쪽 완료, 한쪽 이월" 사례). **복귀는 자동, 쪼개기는 제안** — 이 비대칭이 M5의 전부다.

#### 규칙 ② — 고정 일정 밀도 ↔ 운동 강도 자동 제안

| 항목 | 정의 |
|---|---|
| 목적 | 꽉 찬 날 "60분 운동"을 남겨두면 그날은 0점이 된다. 강도를 낮춰 연속성을 지킨다 |
| 계산 | `anchorMinutes = Σ(hard) + 0.5·Σ(soft)` · `density = anchorMinutes / (dayEnd − wakingStart)·60` |
| 판정 | `< 0.35` → `full` · `0.35~0.6` → `reduced` · `> 0.6` → `minimum` · 남은 최대 빈 구간 < 15분 → `skipped` 제안 |
| 출력 | 운동 카드 1줄 `오늘은 30분 버전으로 할까요?` [그래] [그대로] |
| 확정 | 수락 시에만 `intensity` 변경 + `autoAdjusted` 기록. 거절하면 그날 재제안 없음 |
| 표시 | `minimum` 문구는 `스트레칭·산책 15분` — 0이 아니라 **다른 성공 조건** |

```
export function densityScore(anchors: AnchorItem[], p = POLICY): number {
  const minutes = anchors.reduce((s, a) => s + (a.rigidity === 'hard' ? a.estimateMin : a.estimateMin * 0.5), 0);
  return Math.min(1, minutes / ((p.dayEndHour - p.wakingStartHour) * 60));
}
export function suggestIntensity(d: number, p = POLICY): Intensity {
  if (d < p.density.full) return 'full';
  return d <= p.density.reduced ? 'reduced' : 'minimum';
}
```

#### 규칙 ③ — 에너지 스위치(`상/중/하`) ↔ 실시간 필터

| 항목 | 정의 |
|---|---|
| 목적 | 컨디션이 낮은데 무거운 일만 보이면 아무것도 시작하지 않는다 |
| 계산 | `match`: 같으면 1.0, 인접 0.6, 반대 0.2 |
| 출력 | `≥ 0.6` 기본 표시 · `0.2` `dim`(opacity .35, 뒤로) · **숨기지 않는다** |
| `low` 특례 | `estimateMin ≤ 20`을 상위로. 카드 3장이 모두 `high`면 1줄 `오늘은 가벼운 날로 잡아도 괜찮아요.` |
| 엔진 대체 | 엔진이 켜지면 `match` 대신 **`Efit`(4.5)** — 스위치와 곡선 `E(t)`를 합친 연속값. 아래 임계값은 `dim` 판정 폴백으로만 |
| 기록 | 스위치 변경은 `snapshot.energyLog`에 쌓인다. **점수로 보여주지 않는다** |

#### 규칙 ④ — Now Line ↔ 남은 가용 시간에 맞는 추천

| 항목 | 정의 |
|---|---|
| 목적 | "지금부터 50분"을 알고도 90분짜리를 시작하는 실수를 막는다 |
| 계산 | `gap = nextAnchorStart − nowMin` · 적합 `t̃ + gapBuffer ≤ gap` · `score = 1 − abs(gap − needed) / max(...)` |
| 가중 | `energyMatch·0.5 + score·0.3 + (오늘 마감 ? 0.2 : 0)` |
| 출력 | 상위 **2개**만 `highlight` + `fits-gap`. 카드에 종료 예상 `18:40 → 18:55` |
| 초과 위험 | `t̃ > gap`이면 `overrun-risk` 배지 `지금 시작하면 넘어요` — **숨기지 않는다** |
| 엣지 | 남은 시간 < 5분이면 추천을 비우고 `다음 일정까지 4분`만 |
| 엔진 대체 | `Fit = P(t̃ ≤ gap)`(4.5)를 쓴다. 라벨도 `t̃` 구간(`18:40 → 19:25 (45~70분)`) |

**네 규칙이 겹칠 때의 우선순위**

```
1. overrun-risk  — 시간이 안 맞는다는 사실은 항상 보인다
2. dim(에너지)   — 컨디션 필터
3. suggest-mvs   — 시작 장벽이 높은 항목에 0→1 기준 1줄 (M7)
4. suggest-workout / suggest-split / suggest-probe / suggest-extra-card — 제안은 화면당 최대 1개
5. highlight     — 나머지
```

제안이 2개 이상이면 `score`가 높은 1개만 노출한다. **한 화면에 요청 2개는 마찰이다.** 단 3번(MVS)은 "제안"이 아니라 카드에 붙는 **조건부 1줄**이라 노출 개수에 세지 않는다. `suggest-probe`는 제안이 아니라 **카드 하단 버튼**이므로 노출 개수에 세지 않는다(v1.2).

### 3.7 규칙 엔진 — 결정성과 설명가능성

```
const RULES: Rule[] = [carryoverRule, workoutIntensityRule, energyFilterRule, nowFitRule];
export function evaluate(ctx: RuleContext): Proposal[] {
  return RULES.flatMap((r) => r.evaluate(ctx)).sort(byPriorityThenScore);
}
```

| 성질 | 보장 방법 |
|---|---|
| **결정성** | `now`를 인자로만 받는다(`Date.now()` 금지). 같은 입력 → 같은 출력 |
| **무부작용** | `Proposal[]`만 반환. 저장은 `app`의 command 계층만 |
| **설명가능성** | 모든 제안에 `reason: ReasonCode` → 문구로 변환. "왜 이 카드가 여기 있나"에 항상 1줄로 답한다 |
| **끄기 가능** | 규칙 id 단위 비활성. 엔진도 `settings.engine.enabled = false`로 끄면 네 규칙만으로 100% 동작(4.13) |

> **"왜?"의 답이 없는 제안은 넣지 않는다.** 이유를 설명할 수 없으면 사용자는 그것을 잡음으로 인식한다.

### 3.8 Selectors — 화면이 쓰는 파생 상태

| Selector | 반환 | 소비 화면 |
|---|---|---|
| `selectTodayBoard(ctx)` | `{ cards: Item[3], candidates, extraOffer? }` | Focus Board |
| `selectTimeline(ctx)` | `{ blocks, gaps, nowLine }` | Timeline |
| `selectGaps(ctx)` | `{ gapToNextAnchor, remainingToday }` | Now Line, Focus Mode |
| `selectDensity(ctx)` | `number` | Workout Card, 회고 |
| `selectCandidates(ctx)` | 점수 정렬 인박스 후보 | 카드 교체 시트 |
| `selectWeekly(ctx)` | 7일 스냅샷 집계 | (v2) 주간 회고 |
| `selectEstimate(ctx, id)` | `{ t̃, lo, hi, u, cellN }` | 카드 시간 라벨, Focus Mode |
| `selectMvs(ctx, id)` | `{ label, targetMin, generated }` — 패턴 생성 or 저장값(5.10(2)) | 카드 MVS 줄 |
| `selectBreakdown(ctx, id)` | `ScoreBreakdown` | Explain 시트 |
| `selectFatigue(ctx)` | `{ value, curve }` | 운동 카드 근거, 회고 |

모든 selector는 메모이즈한다. 입력은 `items`·`snapshot`·`now`(분)·`model`뿐이라 초 단위 리렌더가 없다. 엔진 점수는 5분 버킷으로 메모이즈(4.5).

### 3.9 "균형"을 데이터로 보장하는 방법

| 장치 | 규칙 |
|---|---|
| 카드 예산 | 3장이 전부 공부·업무로 채워지지 않도록 후보 목록 상위에 **운동·잡일 후보를 최소 1개 유지**(강제 배정 아님) |
| 앵커 분리 | 고정 일정은 카드 예산(3장)을 쓰지 않는다 — "내가 고르는 일" 3장은 항상 온전히 남는다 |
| 외출 묶음 | `batchKey`가 같은 항목은 **하나의 외출 카드**로(`마트 3건 · 20분`) — 잡일이 하루를 조각내지 않게 |
| 목표 가중 | `Goal.weight`는 화면 필터가 아니라 **회고의 비교 기준**. 엔진의 `π`도 여기서 온다(4.5) |
| 운동 최소 | 어떤 날도 운동이 0이 되지 않도록 `workoutMinimum`이 마지막 성공 조건으로 남는다 |
| 엔진 균형 항 | `Bal`이 **7일 실제 비율 vs 목표 비율**의 개선율을 점수화하고, **하드 제약(같은 분류 최대 2장)** 이 도배를 막는다 — 가중치는 선호, 제약은 보장 |
| 운동의 회복 효용 | 운동은 `ΔU_recovery`(4.4)로 뒤 작업의 완료 확률을 올리는 항 — "시간을 쓰는 일"이 아니라 **성공률을 올리는 투자** |

> 균형은 **강제 배분이 아니라 보이게 하는 것**으로 만든다. "오늘 운동 안 했으니 공부 카드를 빼겠다"는 결정은 시스템이 하지 않는다.

---

## 4. 수학·통계 의사결정 엔진 (`core/engine/`)

> v1.0의 3.6 규칙 4종은 "고정 임계값 + if-else"였다. 이 장은 그 판단을 **실제 기록에서 추정한 확률·점수**로 바꾸는 계층을 정의한다. 규칙은 없어지지 않는다 — 엔진이 켜지면 규칙은 **폴백과 문구**로 물러나고, 엔진이 모르는 구간(콜드 스타트)에서는 그대로 동작한다.
>
> **v1.2의 원칙**: 모델의 정교함은 **표본이 감당할 수 있는 만큼만**. 정교한 수식을 먼저 넣으면 초기 구축도 무겁고, 규칙 하나 바꿀 때 수식·픽스처·백테스트가 줄줄이 따라온다 — 사용자가 가장 필요로 하는 **수정 속도**를 잃는다.

### 4.0 v1 범위 고정 — v1 / v2 경계

| 구성 요소 | **v1 (F3, 지금 만든다)** | **v2 (실데이터 2주 후)** | 이유 |
|---|---|---|---|
| M-E1 셀 | **분류 4개 + 전체 = 2단 축소** | `(분류 × 난이도)` 12셀 + 3단 축소 | 12셀이면 한 셀 `n_eff ≥ 3`에 몇 주~몇 달. v1은 표본이 **며칠 안에** 수렴해야 한다 |
| M-E1 관측 | EWMA(α .15) + 축소(κ 3) | 동일 + 난이도 축, 셀별 활성 조건 | — |
| M-E2 집중 곡선 | **4블록(6시간) Beta 사후** | 48빈(30분) + 원형 커널 평활 `[1,2,3,2,1]` | 48빈은 표본이 없으면 잡음만 남는다. 4블록이면 2주에 블록당 수십 관측 |
| M-E2 피로 | 지수 감쇠 + 부하, **04:00 일일 리셋** | + (수면 체크인 도입 시) 수면 기반 회복 | 수면을 **측정하지 않으므로** 쓰지 않는다 (v1.1의 `수면 7시간 → F←0` 삭제) |
| M-E3 선정 | **개별 효용 정렬 + 그리디 + 하드 제약** | 상위 12개 × 조합 220 × 순서 6 = **1,320 평가** | 3장을 고르는 데 조합 최적화는 과하다. 그리디 + 제약이면 대부분 같은 3장이 나올 것으로 본다 — 실제로 갈리는지는 2주 데이터로 확인한다(F6) |
| M-E3 회복 항 | **`ΔU_recovery`를 `[0,1]` 정규화**해 가중치 7번째 항으로 | 동일 + 날짜별 민감도 학습 | 스케일 밖에서 출렁이면 다른 항을 압도한다 |
| M-E4 | `P_done = P_start·P_finish·Fit`, `c = 1.0` | Brier 보정으로 `c` 학습 | 확률 보정은 관측이 30건은 있어야 의미가 있다 |
| P_start 셀 | **kind 4개** (+MVS·재시작 보정) | `(kind × hasMVS × u구간)` 24셀 | — |
| 검증 | **단위 테스트 6종 + MVS 스냅샷** | 골든 픽스처 12개 + `engine:backtest`(MAPE·Brier·NDCG) | v1에서 픽스처 12개는 수정 비용만 늘린다 |
| Explain | 기여도 7항 + 프리셋 3개 | 동일 + 주간 지표 | — |

> **v2로 넘긴 것은 "지우는" 것이 아니라 "미루는" 것이다.** v1 데이터 2주(이벤트 400~600건)가 쌓이면 8장 F6에서 한 번에 올린다. 그때는 (a) 셀별 표본이 실제로 있는지 (b) 그리디와 조합 최적화의 선택이 실제로 갈리는지 를 **데이터로 확인한 뒤** 넣는다.

### 4.1 엔진의 위치와 여섯 원칙

`core/engine/`은 **새 레이어가 아니라 `core` 안의 하위 계층**이다. 2.1의 의존 규칙은 그대로다.

```
core/
├─ schema/ · policy.ts          (계약·상수)
├─ engine/    ★ 확률·점수 계산 (순수 함수)
├─ rules/      engine 결과 + 사실 → Proposal[] (문구·우선순위)
└─ selectors/  engine + rules + items → 화면 데이터
```

| # | 원칙 | 의미 | 강제 방법 |
|---|---|---|---|
| E1 | **결정적** | 같은 입력·같은 `nowMin`이면 언제나 같은 점수 | 난수 없음, `Date.now()` 금지. v1 단위 테스트로 고정 |
| E2 | **부작용 없음** | 점수·확률·내역만 반환하고 아무것도 저장하지 않는다 | 저장은 `app`의 command 계층만 |
| E3 | **설명 가능** | 모든 점수는 항목별 기여도로 분해된다 | 점수와 내역이 **같은 함수**에서 나온다(별도 재계산 금지) |
| E4 | **파라미터는 policy에** | 가중치·상수는 `policy.engine` 한 곳 | "균형 가중 올려" = 한 줄 (4.11) |
| E5 | **모르면 모른다고** | 데이터가 없으면 확률을 말하지 않고 구간·규칙으로 돌아간다 | 사전분포가 넓으면 `u`가 커져 확률 표시가 자동으로 꺼진다 (4.9) |
| E6 | **숫자를 압박으로 쓰지 않는다** | 점수·확률은 요청 시에만, 등급·순위·색 없음 | 기본 화면에 총점 없음 (4.8) |

### 4.2 표기와 데이터 흐름

| 기호 | 뜻 |
|---|---|
| `t̂` | 계획 소요 — 사용자가 정한 `estimateMin` |
| `t` | 실제 소요 — **타이머가 돈 세션**의 시작·종료 시각 차이 |
| `t̃` | 보정된 추정 — 엔진 출력. 화면에는 구간 `[t̃_lo, t̃_hi]` |
| `r` | `t / t̂`. 로그를 취해 `x = ln r`로 다룬다(비율은 로그정규에 가깝다) |
| `μ̂, σ̂` | 분류 셀의 로그 비율 사후 평균·표준편차 |
| `b` | 보정 계수 = `exp(μ̂ + σ̂²/2)` |
| `u` | 불확실성 = `σ̂` (0이면 확실, 0.6이면 처음 보는 일) |
| `E(t)` | 시각 `t`의 집중도 0–1 |
| `F` | 누적 피로도 0–1 |
| `P_start` / `P_done` | 착수 확률 / 주어진 빈 시간에 완료할 확률 |
| `U_i(t)` | 후보 `i`를 시각 `t`에 놓을 때의 효용(가중합, 범위 `[−0.03, 0.97]`) |

```
[사실] EngineEvent 로그 — start · started · complete · abandon · explore · energy · workout · rollover
   │      append-only. 사용자 행동과 시스템 처리(actor)만 기록
   ▼
[학습] ModelState 재계산 — 부팅 시 1회 전체 replay, 이후 마지막 이벤트부터 증분
   │      time-model(4.3) · energy-model(4.4) · start-model(4.7)
   ▼
[계산] estimate(i) → t̃ · 구간 · u
        score(i, t) → U_i(t) + ScoreBreakdown
        pDone(i, gap) → 확률 · 분해안
   ▼
[제안] rules/ 가 Proposal[] 로 변환 (문구·우선순위·노출 1개 규칙)
   ▼
[표시] 카드(점수 없음) · ExplainSheet(요청 시에만)
```

> 엔진은 **사실에서만** 배운다. "추천을 몇 번 봤는지"는 학습 입력이 아니다 — 실제로 손댔는지(`started`)와 끝냈는지(`complete`)만 신호다.

### 4.3 M-E1 시간 보정 — 분류 4셀, 2단 축소

**문제**: `t̂`와 `t`가 체계적으로 어긋나는데, 그 오차는 유형마다 다르다. 단순 평균은 최근 변화를 놓치고, 단순 EWMA는 표본이 적을 때 과하게 흔들린다. 그래서 **시간 가중(EWMA) + 계층 축소(경험적 베이즈)** 를 같이 쓴다.

**셀 정의 (v1)**: `cell = contextId` — `study` / `work` / `errand` / `workout` **4개 + 전체(global) = 2단**.
**관측**: 완료·중단 이벤트마다 `x = ln(t / t̂)`. `t̂`가 없거나 0이면 학습에서 제외(로그만 남긴다). **타이머가 돈 세션만** 관측이 된다(D14).

**1) 시간 가중 (EWMA)**

```
w_j     = (1 − α)^(n − j)          α = 0.15   // 최근 1건이 약 6.7배 무게
S0 = Σ w_j ,  S1 = Σ w_j x_j
x̄_w    = S1 / S0                    // 가중 평균
n_eff  = S0² / Σ w_j²              // Kish 유효 표본 수
s²     = Σ w_j (x_j − x̄_w)² / S0    // 가중 분산
```

**2) 계층 축소 (셀 → 전체) — 2단**

```
μ̂_ctx = (κ·μ̂_all + n_eff·x̄_w) / (κ + n_eff)          κ = 3 (사전 유사표본)
σ̂²_ctx = (κ·σ0²   + n_eff·s²  ) / (κ + n_eff)          σ0 = 0.6

μ̂_all = Σ_c n_eff,c·x̄_w,c / (κ + Σ_c n_eff,c)          // global은 μ=0 사전으로 축소
```

- 표본이 없는 셀은 `μ̂ = 0, σ̂ = σ0 = 0.6` — "보정하지 않는다"는 뜻이고, 대신 **구간이 넓게** 나온다. 병목 A에 대한 정직한 답이다: 모르면 "30분"이라 단정하지 않고 "25~90분"이라 말한다.
- **왜 4셀인가**: 하루 관측이 3~5건이면 2주에 셀당 `n_eff ≈ 5~8`이 되어 `σ̂`가 0.6 → 0.25 근처로 내려간다. 12셀이면 같은 기간에 `n_eff ≈ 1~2`로 사전분포만 돈다. **표본이 생기지 않는 정교함은 정교함이 아니다.**

**3) 보정값과 구간**

```
b        = exp(μ̂ + σ̂²/2)                       // 로그정규 기대값 비율
t̃       = round5( t̂ · b ),  clamp(t̂·0.4, t̂·3.0)
t̃_lo    = round5( t̂ · exp(μ̂ − 1.28σ̂) )         // 80% 구간
t̃_hi    = round5( t̂ · exp(μ̂ + 1.28σ̂) )
u        = σ̂
```

**4) 중단율** — `s_int = Beta(2 + 중단수, 2 + 완료수)`의 사후 평균. 화면에 숫자로 쓰지 않고, 쪼개기·MVS 제안의 **근거**로만 쓴다(P4).

**출력 예**: `계획 30분 → t̃ 42분 · 80% 구간 28~64분 · u 0.31`

> **불확실성은 필드가 아니라 계산값이다.** 아이템에 `uncertainty`를 저장하지 않는다(S3/D2). 같은 항목이라도 기록이 쌓이면 `u`가 줄어야 하고, 저장해 두면 그 변화가 반영되지 않는다. 화면은 `selectEstimate()`가 계산한 값을 그때그때 쓴다.

| `u` | 카드 표시 | 이유 |
|---|---|---|
| < 0.20 | `약 42분` | 이 정도면 숫자 하나로 말해도 된다 |
| 0.20–0.45 | `35~50분` | 구간이 정직하다 |
| ≥ 0.45 | `30분이라 적었지만 25~90분일 수 있어요` + `⏱ 5분만 재보기` 버튼 (M6) | 모르는 채로 계획하지 않게 |

**엣지**

- 계획보다 훨씬 일찍 끝낸 기록(`t < 0.5·t̂`)은 하한 0.4로 자른 뒤 학습한다 — 타이머를 일찍 끈 실수나 부분 완료가 `b`를 0.3까지 끌어내리지 않게.
- 3분 미만 세션은 '착수 이벤트'로만 쓰고 **시간 보정에는 넣지 않는다**.
- 자정을 넘긴 세션은 `at` 차이로 계산하되, 음수·24시간 초과는 이상치로 버린다(로그는 유지).
- **타이머를 안 켠 완료**는 시간 관측이 아니다(4.10 표). 그래서 시간 보정은 "느리게 정확해진다" — 빠르게 정확해지는 대신 마찰을 0으로 둔 교환이다.

| `u` 경계에서의 판단 | 처리 |
|---|---|
| 이벤트 0건 | `u = 0.6`, 모든 카드가 구간 표시. `b`는 1.0(보정 없음) |
| 셀 1건 | 축소가 강하게 걸려 `μ̂ ≈ 0.25·x̄` 수준 — 과신하지 않는다 |
| 셀 8건 이상 | `σ̂` 우선, 사전 영향 작아짐 |

### 4.4 M-E2 일중 에너지·피로도 동역학

상태는 두 개다: **집중 곡선 `E(t)`**(하루 주기)와 **피로 `F`**(누적·회복).

**1) 집중 곡선 E(t) — v1: 4블록 (6시간)**

```
블록 경계 = dayStartHour(04:00)부터 6시간씩: 04–10 · 10–16 · 16–22 · 22–04
E_block  = (a0 + 성공) / (a0 + b0 + 시도)       a0 = b0 = 2   (Beta 사후 평균)
E(t)     = 블록 값 (경계 ±30분은 선형 보간)
```

- **시도/성공 정의**: 시도 = 그 블록에 배치돼 `start` 또는 `started`가 일어난 **항목 수**(항목당 하루 1회). 성공 = 그중 `complete`된 항목. '시작했으나 중단'은 성공이 아니다.
- **자기보고(에너지 스위치)는 사전을 미는 관측**으로만 쓴다: 상 `+0.15` · 중 `0` · 하 `−0.15`, 하루 합계 ±0.15 상한. 스위치를 자주 내리는 습관이 곡선을 왜곡하지 않게.
- 콜드 스타트(학습 0일): `E(t) = 스위치 값` 그대로 (상 0.75 / 중 0.55 / 하 0.35).
- **v2에서** 같은 데이터를 48빈(30분) + 원형 커널 `[1,2,3,2,1]`로 올린다. 데이터가 블록당 20건을 넘으면 블록 안의 시간 구조(예: 14시 슬럼프)가 보이기 시작한다.

**2) 피로 F — 누적과 회복**

```
F_{k+1} = clamp( F_k · exp(−Δt/τ) + κ · load_k , 0, 1 )
load_k  = (difficulty / 3) · (실제 소요 분 / 60)     // difficulty 기본 2
          실제 소요 분 = actualMin ?? t̃                // 타이머를 안 켠 세션은 보정 추정으로 대체
τ = 90분 (회복 시상수)   κ = 0.18 (시간당 피로 상승)

운동 1회:   F ← F · 0.75
휴식 10분:  F ← F · exp(−10/90) ≈ 0.895·F
하루 경계 04:00:  F ← 0        // ← 수면 대신. 시스템 이벤트 'rollover'로 기록
```

> **v1.1에서 고친 것**: v1.1은 `수면 7시간 이상 → F ← 0`이라는 조건을 두었지만 이 앱은 수면을 입력받지 않는다. 측정하지 않는 변수로 수식을 세우면 그 항은 언제나 참이거나 언제나 거짓이 되어, 있는 척하는 항이 된다. v1.2는 **하루 경계에서 무조건 리셋**한다.
>
> **정직한 한계**: 밤을 새워 아침 4시까지 작업하면 `F`가 0으로 리셋된다(실제 피로는 남아 있다). 이를 보완하려고 `F`를 리셋하지 않으면, 반대로 **정상적으로 잔 날**의 아침 피로가 남아 하루 종일 작업을 흐린다. v1은 후자의 손해(하루 전체가 흐려짐)를 피하고 전자(드문 밤샘 1회의 과소평가)를 감수한다. v2에서 **수면 체크인(취침·기상 1탭)** 을 도입하면 `F ← F·exp(−수면분/240)` 으로 교체한다 — 그때는 변수가 실제로 측정된다.

**3) 수행 확률**

```
P_finish|start = sigmoid( β0 + β_E·Ē_session − β_F·F̄_session )
β0 = 1.1,  β_E = 2.0,  β_F = 1.6      // 초기값 — v2 백테스트로 보정
Ē_session = 세션 구간의 E 평균,  F̄_session = 세션 동안의 평균 F
```

**4) 운동의 효용 — 회복 투자, `[0,1]` 정규화**

운동은 '별개 카드'가 아니라 **F를 깎아 이후 작업의 완료 확률을 올리는 회복 투자**다. v1.2는 이 항을 **가중치 합 1.0 안으로 정식 편입**했다.

```
P↑_i = clamp( P_finish(F·0.75) − P_finish(F), 0, 1 )      // 운동 후 F 25% 감소
raw        = (1/m) · Σ_{i=1..m} P↑_i                     // m = 오늘 남은 후보 수 (최소 1) → 평균이라 항상 0–1
ΔU_recovery = clamp( raw / recoveryScale, 0, 1 )          // recoveryScale = 0.08
ε_ex       : 운동 후 90분간 E(t) ← min(1, E(t) + 0.08)     // 곡선 보정(점수 항 아님)
```

| 값 | 뜻 |
|---|---|
| `raw` | 남은 작업들의 완료 확률이 **평균 몇 %p** 올라가는가 (0–1) |
| `recoveryScale = 0.08` | 8%p 상승을 `1.0`으로 본다. 이 이상은 포화 — "운동 한 번이 하루를 지배"하지 못하게 |
| `ΔU_recovery ∈ [0,1]` | 운동 항목에만 적용. 다른 항목은 0 |

> **v1.1에서 고친 것**: v1.1의 `ΔU_recovery`는 "이후 배치된 작업 수 × 확률 상승"의 **합**이라, 남은 작업이 6개인 날엔 0.3까지 올라가 다른 항(최대 0.30)을 압도했다. 이제는 **평균 + 상한**이라 항상 `[0,1]`이고, 가중치 0.10 안에서만 작동한다.
>
> 그 결과로 운동은 **회복 항만으로 1순위가 되지 않는다**. 운동이 선택되는 날은 (a) 영역 균형 개선이 크고 (b) 에너지·시간 적합이 맞고 (c) 남은 작업의 `P_finish` 상승이 클 때다 — 3.9와 4.5의 "강제 배정 아님"이 수식에서도 성립한다.

**출력**: `focus { blocks: number[4], now, peakBlock }` · `fatigue { value, halfLifeMin }` · `recovery { deltaU, raw }`
**엣지**: 이벤트가 3일 미만이면 곡선 대신 스위치 값, `F`는 0으로 두고 화면에는 숫자를 쓰지 않는다("피로 누적은 아직 모릅니다" 같은 문구도 넣지 않는다 — 정보가 없으면 조용히).

### 4.5 M-E3 효용 — 개별 점수 정렬 + 하드 제약

```
U_i(t) = w_u·Urg_i + w_b·Bal_i + w_e·Efit_i(t) + w_f·Fit_i(t) + w_s·Pstart_i(t)
         − w_c·Switch_i(t) + w_r·ΔU_recovery,i

가중치 (Σ = 1.00):
w_u .28 · w_b .18 · w_e .18 · w_f .18 · w_s .05 · w_c .03 · w_r .10
```

| 항 | 계산 | 범위 | 의미 |
|---|---|---|---|
| `Urg` | 마감 `d`일 남음 → `exp(−0.35·d)` · 지남 = 1 · 마감 없음 = 0.15 · `priority 1`이면 +0.15 (상한 1) | 0–1 | 긴급도(지수 감쇠) |
| `Bal` | 목표 비율 `π` 대비 최근 7일 실제 비율 `a`의 TV 거리 `D = ½·Σ abs(a − π)` → `(D_before − D_after)/max(D_before, 0.01)`. 이미 맞으면 0 | 0–1 | 영역 균형 **개선율** |
| `Efit` | 요구 에너지 `req`(상 .85 / 중 .60 / 하 .35)와 `E(t)`의 가우시안 `exp(−(E(t)−req)²/(2·0.18²))` | 0–1 | 에너지 적합 |
| `Fit` | `P(t̃_i ≤ gap(t)) = Φ((ln gap − ln t̃_i)/σ̂)` — 로그 비율의 표준편차를 그대로 쓴다(근사) | 0–1 | 가용 시간 적합(확률) |
| `Pstart` | 4.7 | 0–1 | 시작 장벽(병목 B) |
| `Switch` | `(0.12·[분류 변경] + 0.08·[장소 변경] + 0.05·[직전 세션 후 재진입]) / 0.25` | 0–1 | 전환 비용 |
| `ΔU_recovery` | 4.4 (4) — **`[0,1]` 정규화** | 0–1 | 운동의 회복 효용 |

> **스케일 보장**: 모든 항이 `[0,1]`이므로 `U ∈ [−0.03, 0.97]`. 어떤 한 항도 다른 항을 압도할 수 없고(최대 무게 0.28), 가중치를 바꿔도 총점의 스케일이 유지된다. **v1 단위 테스트 2번이 이 범위를 고정한다**(4.12).

**목표 비율 `π`** — 영역은 분류를 셋으로 묶은 것(공부·업무 / 할 일 / 운동). `Goal.weight`가 있으면 종류(anchor·task·errand·workout)를 이 셋으로 합산해 비율로 바꾸고, 없으면 기본 `{공부·업무 0.5, 할 일 0.3, 운동 0.2}`. **7일 창**을 쓰는 이유: 하루 단위로 맞추면 "오늘 운동 안 했으니 공부를 빼자"가 되어 통제감을 잃는다(3.9).

**선정·배치 알고리즘 (v1 — 그리디)**

```
1. 후보 필터   오늘 가능(마감 지남/오늘·인박스), 삭제·보류 아님, 고정 일정과 겹치지 않음
2. 점수        각 후보의 U_i(nowMin) — 후보 상한 40개(candidateCap)
3. 정렬        U 내림차순. 동점은 id 사전순 (기기 간 결과 동일)
4. 그리디 채우기  위에서부터 3장.
                 하드 제약 = 같은 contextId 최대 2장 · Σ t̃ ≤ 남은 가용 · 앵커 겹침 없음
5. 배치        선택 3장을 "t̃가 들어가는 빈 구간" 중 Efit 최대 슬롯에. 동률은 이른 시각.
                 슬롯이 없으면 항목을 버리지 않고 '카드만' 남긴다
6. 후보 목록   운동·잡일 후보 최소 1개 유지 (3.9) — 강제 배정 아님
```

- 비용: `O(n log n)` + 슬롯 탐색 → **2ms 이내**. 렌더마다 계산하지 않고 `(nowMin 5분 버킷, items updatedAt 해시, 스위치 값)`을 키로 메모이즈한다.
- **하드 제약이 왜 필요한가**: `Bal` 가중치만으로는 3장이 모두 공부로 채워질 수 있다. 가중치는 "선호", 제약은 "보장"이다. 3.9의 "후보에 운동 1개 유지"는 후보 목록 규칙으로 남는다.
- **v2에서 바뀌는 것**: 상위 12개 × 조합 220 × 순서 6 = 1,320 평가로 교체. **단, v1 그리디와 선택이 갈리는 사례가 2주 데이터에서 실제로 나올 때만** 넣는다(아니면 같은 답을 100배 비싸게 계산하는 것이다).

### 4.6 M-E4 완료 확률과 확률 기반 분해·이월

```
P_start(i, t)  = 4.7
P_finish(i, t) = sigmoid(β0 + β_E·Ē − β_F·F̄)          (4.4 (3))
Fit(i, t)      = Φ((ln gap − ln t̃) / σ̂)
P_done(i, t)   = min(1, c · P_start · P_finish · Fit)   c = 1.0  (v2에서 Brier 보정)
```

세 항의 곱은 **"손대고 · 이어가고 · 시간 안에 끝난다"** 의 분해다.

**분해 제안**

```
조건:   P_done(현재 크기, 오늘 최대 빈 구간) < 0.50   그리고   n_eff ≥ 3
크기:   k = max(2, ceil(t̃ / 20)),  q = max(10, round5(t̃ / k))     // 20분 단위 조각
수락:   각 조각의 P_done(q) ≥ 0.75 일 때만 제안
문구:   "지금 크기로는 오늘 끝낼 확률 34% · 20분씩 3번이면 79%"
```

- **데이터가 부족하면(`n_eff < 3`) 기존 규칙(3회 이월)이 그대로 동작한다.** 확률은 규칙을 없애지 않는다 — **규칙보다 정확해질 때만 앞선다.** 이 순서를 뒤집으면 3일치 데이터로 "당신은 못 끝냅니다"라고 말하게 된다.
- **이월 판정**은 바뀌지 않는다(자동 이월, 3.6 ①). 엔진은 이월된 항목의 **내일 아침 `P_done`** 을 계산해 후보 순위에 반영한다. 화면에는 확률을 상시 노출하지 않는다.
- **착수(`started`)는 실패가 아니다.** 완료가 아니므로 이월되지만, 엔진은 그 항목의 `P_start`를 올리는 관측으로 쓴다(4.7). 같은 항목을 두 번째 시작하는 것이 첫 번째보다 쉽다는 사실이 데이터에 있다.

### 4.7 시작 확률 `P_start` — 병목 B의 수치화

```
P_start = (a + 성공) / (a + b + 시도)     Beta 사후, a = b = 2
셀      = kind (anchor·task·errand·workout) → 전체     축소 κ = 2
보정    = MVS가 있으면 +0.10  ·  같은 항목 재시작이면 +0.10·(1−P)

시도 = 그 항목에 'start'(타이머) 또는 'started'가 발생
성공 = 같은 날 이어진 'started' 또는 'complete'
```

**읽는 법**: `P_start`가 낮은 항목은 추천에서 **밀어내지 않는다.** 카드에서 MVS를 먼저 보여준다. 낮은 확률은 "이 일은 시작이 어렵다"는 정보이지 "하지 말자"는 판정이 아니다. 그래서 `U`에서 `Pstart` 가중치는 0.05로 작게 둔다 — 키우면 어려운 일이 영원히 뒤로 밀린다.

> v1의 셀은 `kind` 4개다. `hasMVS`·`u` 구간을 곱한 24셀은 v2 — 축마다 표본이 4분의 1로 쪼개지면 `P_start`가 0.5 근처에서 움직이지 않는다.

### 4.8 Explainable Engine — 점수 산출 내역 뷰

```
// src/core/engine/types.ts
export interface ScoreTerm {
  key: 'urgency' | 'balance' | 'energy' | 'fit' | 'start' | 'switch' | 'recovery';
  label: string;         // '균형 개선' — strings.ko.ts
  value: number;         // 0–1 정규화 값
  weight: number;        // policy.engine 에서 온 가중치
  contribution: number;  // weight × value (switch는 음수)
}

export interface ScoreBreakdown {
  itemId: ItemId;
  slotMin?: Minutes;
  total: number;                          // −0.03 – 0.97
  terms: ScoreTerm[];                     // 항상 7개
  estimate: { plannedMin: number; correctedMin: number; lo: number; hi: number; u: number; cellN: number };
  probability: { start: number; done: number };
  method: 'greedy' | 'combo';             // v1 = 'greedy'
  modelVersion: string;
}
```

**화면** — 카드 `⋯` → **왜 이 카드?** → 시트(5.6 `ExplainSheet`). 7줄 이내, 각 줄 `기여 +0.24 · 균형 개선 82%`. 하단 1줄 `이 가중치를 바꿀 수 있어요` [조정].

**조정 흐름 (파라미터 단위 수정)**

```
[조정] → 프리셋 3개: [균형 더] [급한 것 먼저] [지금 에너지에 맞게]
       → 미리보기: 오늘 카드 3장이 어떻게 바뀌는지 적용 전 비교 (v1: 그리디 재계산 — 즉시)
       → [적용] = settings.engineOverrides 에 1줄 저장 (코드 수정 아님)
       → [되돌리기] 한 번에
```

**표시 규칙 4개**

1. 소수 둘째 자리까지. **총점을 등급처럼 크게 쓰지 않는다** — 카드에는 총점이 없다.
2. 색으로 좋고 나쁨을 칠하지 않는다(음수 기여만 `--text-3`).
3. 확률은 정수 %로, **표본 수와 함께**. 표본 3건 미만이면 `아직 모름`.
4. 내역은 **요청 시에만** 계산·표시(E6).

### 4.9 콜드 스타트 — 데이터가 없을 때 엔진이 하는 말

| 시점 | 켜지는 것 | 사용자가 보는 것 |
|---|---|---|
| 0일 | 없음(3.6 규칙 폴백) + `firstOfKind`면 재보기 **버튼** | "이 유형은 처음이에요. 5분만 재볼까요?" |
| 3일 | 반복된 분류의 `b`(`n_eff ≥ 2`), 스위치 기반 `E(t)` | "지난 3번은 1.3배 걸렸어요" + 구간 |
| 7일 | 셀별 `b·σ̂`, `P_start` 셀, 피로 `F` | "예상 30분 → 40~55분" |
| 14일 | **v2 전환 검토** — 난이도 셀·48빈 곡선·조합 최적화·Brier 보정 | 쪼개기 제안에 확률 근거 |

규칙: **엔진이 모르면 모른다고 말한다.** 확률·구간은 표본 수와 함께만 표시하고, 모자라면 규칙 문구로 돌아간다. "2주 뒤에 정확해집니다" 같은 예고 문구는 넣지 않는다(기다림을 숙제로 만들지 않는다).

### 4.10 파일 구조와 인터페이스

```
core/engine/
├─ types.ts         # Estimate, ScoreTerm, ScoreBreakdown, EngineEvent, ModelState
├─ math.ts           # Φ, Φ⁻¹, 로그정규, 가중 분산, Kish n_eff, clamp, round5
├─ events.ts         # 이벤트 정규화·검증·중복 제거 (사실만, 해석 없음)
├─ replay.ts         # 이벤트 → ModelState 재계산 (부팅 1회 + 증분)
├─ time-model.ts     # M-E1: fitCell() · estimate()
├─ energy-model.ts   # M-E2: fitCurve() · fatigueAt() · recoveryDelta()
├─ start-model.ts    # 4.7: fitStart() · pStart()
├─ utility.ts        # M-E3: scoreTerm() · selectToday()
├─ completion.ts     # M-E4: pDone() · suggestSplit()
├─ explain.ts        # ScoreBreakdown 조립 (점수와 같은 함수에서)
└─ index.ts          # 배럴: 공개 API만
```

```
// src/core/engine/index.ts — 공개 API
export interface EngineContext {
  now: Instant; today: LocalDate; nowMin: Minutes;
  energy: Energy; fatigue: number;
  items: Item[]; snapshots: Record<LocalDate, DailySnapshot>; settings: Settings;
}

export interface Engine {
  estimate(item: Item, ctx: EngineContext): Estimate;
  score(item: Item, slotMin: Minutes, ctx: EngineContext): ScoreBreakdown;
  selectToday(ctx: EngineContext): { picks: ItemId[]; breakdowns: ScoreBreakdown[]; method: 'greedy' };
  pDone(item: Item, gapMin: number, ctx: EngineContext): number;
  suggestions(ctx: EngineContext): Proposal[];   // 분해·탐색·MVS·운동 회복
}

export function createEngine(state: ModelState, p?: EnginePolicy): Engine;
```

- 전역 싱글턴 금지 — 테스트가 결정적이어야 한다(E1). `app/store.ts`가 `ModelState`를 들고 `createEngine()`을 만들어 selector에 넘긴다.
- `ModelState`는 **이벤트에서 재계산 가능한 캐시**다(D2). IndexedDB `meta`에 두되 `replayedEvents`가 이벤트 수와 다르면 폐기하고 replay한다. 동기화·백업 대상이 아니다(6.3).

**이벤트 → 관측 매핑 (v1)**

| 이벤트 | 시간 보정(M-E1) | 착수(P_start) | 에너지/피로(M-E2) | 비고 |
|---|---|---|---|---|
| `start` (타이머 켬) | 시도 시작점 | 시도 | 블록 시도 | 없어도 모든 기능 동작 |
| `started` (0→1) | — | **성공** | 블록 시도 | 완료와 별개 |
| `complete` + `start` | **관측 `x = ln(t/t̂)`** | 성공 | 블록 성공 | `actualMin` 기록 |
| `complete` (타이머 없음) | — | **성공(착수 함의)** | 블록 성공 | `started`가 없으면 함께 기록 |
| `abandon` + `start` | 관측 (3분 이상) | 시도 | 중단 | `interruptions++` |
| `explore` | 작은 분산 관측 | — | — | `revisedMin` |
| `energy` | — | — | 스위치 사전 ±0.15 | 하루 합 상한 |
| `rollover` | — | — | **F ← 0** | `actor: 'system'` |

### 4.11 파라미터 (`policy.engine`) — 조정은 한 줄

```
// src/core/policy.ts (발췌)
engine: {
  enabled: true,
  version: 'e1.2',
  time:       { priorSdLog: 0.6, priorStrength: 3, ewmaAlpha: 0.15,
                minFactor: 0.4, maxFactor: 3.0,
                exploreSigma: 0.45, exploreMinSamples: 3, probeCooldownDays: 7, roundMin: 5 },
  energy:     { blockHours: 6, priorAlpha: 2, priorBeta: 2,
                fatiguePerHour: 0.18, restTauMin: 90,
                exerciseRecovery: 0.25, exerciseWindowMin: 90 },
  utility:    { wUrgency: 0.28, wBalance: 0.18, wEnergy: 0.18, wFit: 0.18,
                wStart: 0.05, wSwitch: 0.03, wRecovery: 0.10,
                urgencyLambda: 0.35, balanceTargets: { study: 0.5, errand: 0.3, workout: 0.2 },
                switchContext: 0.12, switchPlace: 0.08, switchReentry: 0.05,
                maxSameContext: 2, candidateCap: 40 },
  recovery:   { scale: 0.08 },
  completion: { doneCutoff: 0.50, splitTarget: 0.75, chunkMin: 20,
                minChunkMin: 10, calibFactor: 1.0 },
  start:      { priorAlpha: 2, priorBeta: 2, shrink: 2, mvsBonus: 0.10, restartBonus: 0.10 },
  mvs:        { targetMin: 7, autoFor: ['high-energy', 'never-started', 'high-uncertainty'],
                rotateDaily: true },
  explore:    { minutes: 5, stepOptions: [15, 30, 60] },
}
```

**조정 예** (요청 → 변경 → 화면)

| 요청 | 변경 | 화면 변화 |
|---|---|---|
| "균형 더 챙겨줘" | `wBalance .18→.24`, `wUrgency .28→.22` | 잡일·운동 카드가 올라옴 |
| "급한 것부터" | `wUrgency .28→.38`, `wBalance .18→.08` | 마감 가까운 카드 고정 |
| "어려운 일이 계속 밀려" | `start.mvsBonus .10→.15` + `mvs.autoFor` 확대 | MVS가 더 자주 붙는다 |
| "쪼개기 제안이 너무 잦아" | `doneCutoff .50→.40` | 제안 빈도 감소 |
| "확률이 너무 낙관적" | `calibFactor 1.0→0.9` (v1에서도 하향은 가능) | 완료 확률이 보수적으로 |
| "운동을 더 띄워줘" | `wRecovery .10→.16` (다른 항에서 차감) | 운동 카드가 1장에 들어올 확률↑ |
| "재보기 버튼이 자주 떠" | `exploreSigma .45→.55` | 버튼 노출 감소 |

가중치는 **합 1.0을 유지**한다. 한쪽을 올리면 다른 쪽을 내린다 — 총점 스케일이 바뀌면 "왜 이 카드가 1순위인가"의 비교가 흔들린다. 7개 가중치의 합이 1.0인지 **단위 테스트가 검사한다**(4.12).

### 4.12 검증 — 엔진이 좋아지는지 어떻게 아는가

**v1 (지금) — 단위 테스트 6종 + 스냅샷**

| # | 테스트 | 고정하는 것 |
|---|---|---|
| T1 | 결정성 | 같은 fixture·같은 `nowMin` → 같은 점수·같은 순서 |
| T2 | 범위 | 모든 항 ∈ [0,1], `U` ∈ [−0.03, 0.97], 가중치 합 = 1.0 |
| T3 | 하드 제약 | 후보가 전부 `study`여도 3장 중 2장까지만. 3장째는 다른 분류/공석 |
| T4 | 콜드 스타트 | 이벤트 0건 → 규칙 폴백, 확률 숨김, `u = 0.6` |
| T5 | replay 일치 | 순차 replay 결과 == 증분 결과 (셀·블록·P_start) |
| T6 | 보정 | 인위 관측 5건(1.5배 지연) → `b ≈ 1.4~1.5`, `u` 감소 |
| T7 | MVS 문구 | 패턴 10케이스 스냅샷 + 로테이션 인덱스 결정성 + 보드 내 중복 금지 |

- 실행: `npm run test -- engine` (CI). **수정 요청 검증의 필수 단계**(7.1 4단계).
- v1에는 백테스트가 없다. 대신 `settings.engine.enabled=false`로 언제든 규칙 모드와 비교할 수 있고, Explain 시트에서 두 모드의 카드 3장을 나란히 볼 수 있다.

**v2 (2주 후) — 백테스트**

| 지표 | 정의 | 목표 | 주기 |
|---|---|---|---|
| MAPE(`t̃`) | `mean(abs(t̃ − t)/t)` | < 25% (규칙 기준선 대비 −30%) | 주 1회 |
| Brier(`P_done`) | 확률 예측 오차 | < 0.20 (0.25 초과 시 경고) | 주 1회 |
| NDCG@3 | 추천 3장 순서와 실제 착수 순서의 적합도 | > 0.70 | 주 1회 |
| 제안 수락률 | 쪼개기·재보기·MVS 수락 / 노출 | 0.30–0.70 | 월 1회 |

- 실행: `npm run engine:backtest -- --from=2026-12-01`. **v2 엔진 변경은 이 수치가 나빠지면 머지하지 않는다.**
- 수락률 0.9 초과는 좋은 신호가 아니다 — **쉬운 제안만 나오고 있다**는 뜻이다.
- 골든 픽스처 12개(v2): 콜드 스타트 · 3회 이월 · 착수만 3회 · 밀도 0.7 날 · 운동 후 90분 · 시계 변경 · 자정 넘김 · 부분 완료 · 쪼개기 거절 · 재보기 후 추정 하향 · 에너지 하루 5회 변경 · 이벤트 0건.

### 4.13 실패·폴백·비용

| 실패 | 증상 | 폴백 |
|---|---|---|
| 표본 부족 | `σ̂` 큼 | 규칙 폴백 + 구간 표시, 확률 숨김 |
| 분포 가정 위반(극단값) | `b`가 0.4/3.0에 붙음 | 로그 변환 + 하한·상한 clamp, 3분 미만 세션 제외 |
| **타이머를 안 켠다** | 시간 관측이 안 쌓인다 | 완료·이월·착수는 그대로 학습(4.10 표). 구간 표시가 유지될 뿐 해가 없다 |
| 밤샘 | 04:00에 `F`가 0으로 리셋 | 감수(4.4 한계). v2 수면 체크인에서 교체 |
| 시계·타임존 변경 | 소요가 음수 | 이벤트 폐기(로그 유지) + 1회 안내 |
| 계산 지연 | 카드 렌더 200ms 초과 | 5분 버킷 메모이즈, 그래도 느리면 후보 상한 40→20 |
| 엔진 버그 | 추천이 이상함 | `settings.engine.enabled = false` → 3.6 규칙만으로 100% 동작 |
| 학습 오염 | 시스템 처리가 섞임 | `actor` 구분, 학습은 `user` 이벤트만 |

**비용**: 이벤트 3년 ≈ 22,000건 · replay 1회 < 80ms(부팅 1회, 이후 증분) · v1 선정 계산 < 2ms · 저장 증가 ≈ 1.2MB. IndexedDB 인메모리 유지에 무리가 없다.

---

## 5. 하이엔드 UI/UX & 화면 흐름

### 5.1 시각 언어 — 여섯 문장

1. **장식을 지운다.** 그림자·그라디언트·아이콘 남발 없이 **여백과 활자 위계**로 구조를 만든다.
2. **선은 1px, 색은 무채색.** 경계는 `#22252B` 한 단계. 채도 있는 색은 "지금 해야 할 것" 하나에만.
3. **숫자는 정렬된다.** 모든 시간 표기는 `tabular-nums` — 카드마다 시각이 흔들리면 목록이 산만해진다.
4. **움직임은 짧고 방향이 있다.** 200ms를 넘기지 않고, 요소가 "사라지는" 애니메이션은 없다(접히거나 옮겨간다).
5. **화면은 조용히 반응한다.** 누르면 즉시(90ms) 반응하고, 결과는 늦게(설명 없이) 도착한다.
6. **숫자는 필요할 때만 꺼난다.** 점수·확률은 `⋯ → 왜 이 카드?`에서만 펼친다(4.8, P7).

레퍼런스: **Linear**(밀도·키보드 우선·미세 보더), **Things 3**(활자 위계·작은 모션·카드 호흡), **Raycast**(입력창 중심 흐름).

### 5.2 타이포그래피

서체: `"Pretendard Variable", Pretendard, -apple-system, "SF Pro Text", "Apple SD Gothic Neo", system-ui, sans-serif`
숫자: `font-variant-numeric: tabular-nums;` (시간·소요 전용 클래스 `--font-num`)

| 토큰 | 크기 / 행간 / 자간 | 굵기 | 용도 |
|---|---|---|---|
| `--text-display` | 28 / 1.25 / -0.02em | 600 | 날짜, Focus Mode 제목 |
| `--text-title` | 20 / 1.35 / -0.01em | 600 | 화면 제목 |
| `--text-headline` | 17 / 1.4 / -0.01em | 600 | 카드 제목 |
| `--text-body` | 15 / 1.55 / 0 | 450 | 본문, 카드 메타 |
| `--text-body-sm` | 13 / 1.5 / 0 | 450 | 보조, 배지, MVS·재보기 줄 |
| `--text-caption` | 12 / 1.4 / 0.01em | 500 | 라벨, 타임라인 시각 |
| `--text-micro` | 11 / 1.35 / 0.02em | 500 | 상단 바 상태, 토스트 보조 |

> 국문은 큰 크기에서 자간을 조이지 않으면 헐거워 보인다. `display`·`title`에만 음수 자간, 본문은 0.

### 5.3 공간 · 곡률 · 보더 · 그림자

| 토큰 | 값 | 용도 |
|---|---|---|
| `--space-1…12` | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 56 | 원시 스케일 |
| `--pad-card` | `var(--space-4)` = 16 | 카드 내부 패딩 |
| `--gap-card` | `var(--space-5)` = 20 | 카드 사이 |
| `--pad-panel` | `var(--space-6)` = 24 | 패널 패딩 |
| `--gap-section` | `var(--space-8)` = 32 | 섹션 사이 |
| `--radius-sm / md / lg / xl` | 6 · 10 · 14 · 20 | 칩 / 카드 / 시트 / 모달 |

컴포넌트는 **레이아웃 별칭만** 쓴다(`--pad-card` 등) — "여백 조금 더"가 2줄이 되는 이유(7.2). **다크에서는 그림자를 쓰지 않는다.** `surface` → `surface-raised`의 **단차**로 층을 만든다.

### 5.4 컬러 토큰과 "상태 컬러 절제" 원칙

| semantic | Dark | Light | 쓰이는 곳 |
|---|---|---|---|
| `--bg` | `#0A0B0D` | `#F7F7F8` | 앱 배경 |
| `--surface` | `#121316` | `#FFFFFF` | 카드, 패널 |
| `--surface-raised` | `#191B1F` | `#FFFFFF` | 시트, 드롭다운 |
| `--border` | `#22252B` | `#E6E7EA` | 구분선 (1px만) |
| `--border-strong` | `#2E3238` | `#D6D8DD` | 입력창, 포커스 전 |
| `--text-1` | `#ECEDEF` | `#101114` | 제목·본문 |
| `--text-2` | `#9AA0A9` | `#5C626B` | 메타 |
| `--text-3` | `#676D77` | `#8B9099` | 비활성·눈금 |
| `--accent` | `#8B9CFF` | `#4A5CD6` | Now Line, 진행 중, 포커스 링 |
| `--accent-weak` | `rgba(139,156,255,.12)` | `rgba(74,92,214,.08)` | 선택 배경 |
| `--done` | `#5FBF8A` | `#2F8F63` | 완료 체크 |
| `--held` | `#C8A05A` | `#8A6A22` | 이월·보류·동기화 지연 |
| `--danger` | `#D4665F` | `#B4403A` | **삭제 확인에만** |

**절제 규칙** — ① 한 화면 유채색 최대 2개. ② 분류에 색을 주지 않는다(텍스트 라벨·위치로 구분). ③ 빨강은 파괴적 확인에만, 지연·미완료는 `--text-2`/`--held`. ④ 본문 대비 ≥ 4.5:1. ⑤ 테마 전환은 토큰 교체만(색 리터럴 lint 금지).

### 5.5 모션

| 토큰 | 값 | 용도 |
|---|---|---|
| `--dur-instant` | 90ms | hover, press |
| `--dur-fast` | 140ms | 토글, 탭, 토스트 등장 |
| `--dur-base` | 200ms | 카드 이동, 목록 재배치 |
| `--dur-slow` | 320ms | Focus 진입/이탈 |
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | 기본 |
| `--ease-enter` | `cubic-bezier(.16,1,.3,1)` | 등장 |
| `--ease-exit` | `cubic-bezier(.4,0,1,1)` | 퇴장 |

`prefers-reduced-motion: reduce` → **transform 제거**, `opacity` 120ms만. 카운트다운 링은 유지(정보이므로).

### 5.6 컴포넌트 인벤토리

| 컴포넌트 | 위치 | 책임 | 핵심 props | 상태 |
|---|---|---|---|---|
| `QuickInput` | 오버레이 | 한 줄 입력·해석 미리보기 | `onSubmit(text)` | 빈/해석됨/저장됨 |
| `EnergySwitch` | 상단 바 | 상·중·하 3분할 | `value, onChange` | — |
| `ItemCard` | 보드·인박스 | 항목 1건 렌더 | `item, proposals[], variant` | 기본/진행/완료/흐림 |
| `MvsRow` | 카드 (제목 아래) | 0→1 기준 1줄. 탭=편집, 길게=다시 받기 | `item, label, onEdit, onRegenerate` | 생성/사용자 수정 |
| `ProbeButton` | 카드 하단 | **`⏱ 5분만 재보기`** 선택 버튼 | `item, estimate, onStart, onDismiss` | 노출/닫힘 |
| `ProbeTimerBar` | 상단 1줄 | 재보기 중 타이머 | `endsAt, onStop` | 진행/종료 |
| `ProbeVerdictSheet` | 오버레이 | `[예상대로] [더 큼]` 2선택 | `item, onVerdict` | 판정/크기선택 |
| `UncertaintyLine` | 카드 메타 | 보정 추정·구간 1줄 | `estimate` | 단일값/구간/모름 |
| `StartedBadge` | 카드 | `◐ 착수함` — 완료와 구분 | `startedAt` | 착수/없음 |
| `NowLine` · `TimelineBlock` · `GapHint` | 타임라인 | 현재 선·배치 블록·남은 시간 | — | — |
| `CountdownRing` | 우측·Focus | 원형 진행 + 남은 시간 | `endsAt, size` | 진행/종료 |
| `FocusSheet` | 오버레이 | 단일 카드 + MVS + 선택지 3개 | `item, phase` | 타이머/선택/완료 |
| `ExplainSheet` | 오버레이 | 점수 내역 + 가중치 조정 | `breakdown, onOverride` | 내역/조정/미리보기 |
| `WorkoutCard` | 보드 | 강도 전환 포함 운동 카드 | `item, suggestion` | 풀/축약/최소 |
| `CarryToast` | 하단 | 이월 안내 1.8초 | `count` | — |
| `SyncBadge` | 상단 바 | 동기화 상태 점 | `state` | 정상/대기/오프라인/오류/토큰만료 |

### 5.7 PC 레이아웃 (≥1200px) — 3단

```
┌ 상단 바 (56px, sticky) ────────────────────────────────────────────
│  금 11. 27.        [ 상 │ 중 │ 하 ]        ⌘K 빠른 입력     ●  ◐  ⚙
├ ① 인박스 280px ─┬ ② 오늘 보드 가변 1fr ─────┬ ③ 지금 320px ───────
│ 인박스       12 │ 오늘                  3/3 │  ◜ 10:00 ◝  착수 타이머
│ · 논술 첨삭 30분│ ① 인하대 논술 2번 재작성   │  다음 일정까지 50분
│ · 장학금 15분   │   2번 문항 논점 3줄만. 7분.│  오늘 밀도 0.53
│ · 마트 20분     │   60분 · 예상 45~75분      │  (유일하게 실시간으로
│ · 스트레칭 15분 │   ⏱ 5분만 재보기           │   움직이는 영역)
│ (접힌 1줄 목록) │   ▶ 시작  ⇥ 내일로  ⋯     │
│                 │ ② 스트레칭·산책 15분  ▶    │
│                 │ ③ …                        │
│                 │ ─ 미니 타임라인 (5시간 창) ─│
└─────────────────┴────────────────────────────┴─────────────────────
```

| 영역 | 규칙 |
|---|---|
| 상단 바 | 왼쪽=날짜, 중앙=에너지, 오른쪽=입력·상태. 스크롤해도 고정 |
| 인박스 | 기본은 **접힌 목록**(1줄). 드래그 소스. 12개 초과 시 "더 보기" |
| 오늘 보드 | 카드 3장 세로 스택. 높이 96~112px 고정(흔들리지 않게) |
| 미니 타임라인 | 보드 하단 5시간 창. 클릭하면 전체 타임라인 화면 |
| 지금 | 타이머 링 + 남은 시간 + 밀도. **유일하게 실시간으로 움직이는 영역** |

**카드 상세 (오늘 보드)**

```
┌───────────────────────────────────────────────
│ ①  인하대 논술 2번 문항 재작성   ◐ 착수함    ⠿
│    2번 문항 논점 3줄만. 7분. 망쳐도 됨.      ← MVS (해당할 때만, 탭=수정)
│    60분 · 예상 45~75분 · 높은 에너지 · 19:00 → 20:00
│    ⏱ 5분만 재보기                            ← 추정이 불확실할 때만
│
│    ▶ 시작        ⇥ 내일로        ⋯
└───────────────────────────────────────────────
   (hover: border 한 단계 밝게 90ms / press: scale .995)
```

- `⋯` 메뉴: **왜 이 카드?** · 수정 · 나누기 · 보관 · 삭제 (삭제만 `--danger`).
- 카드 어디를 눌러도 **수정 시트**. 시작 버튼만 예외.
- 완료된 카드는 자리에서 접히고 아래 카드가 200ms에 올라온다. **착수한 카드는 접지 않는다** — 남은 일이 보여야 다음 회차를 시작한다.
- 카드 높이는 96~112px 고정. **MVS 줄이 있으면 128px까지** 허용. `5분만 재보기`는 높이에 영향 없이 메타 줄 아래에 붙는다(한 줄, 말줄임).

### 5.8 모바일 — 하단 3탭 + 한 손 제스처

```
상단 (44px)  금 11. 27.                    [ 상 │ 중 │ 하 ]   ●
────────────────────────────────────────────────────────────
  18:33 ─────┼────────────────────────────────  ← Now Line 카드 관통
  ┌ ① 인하대 논술 2번 재작성 · 2번 문항 논점 3줄만 ┐
  │   60분 · 19:00 → 20:00   ⏱ 5분만 재보기        │
  │   ▶ 시작    ⇥ 내일로                          │
  └───────────────────────────────────────────────
  ┌ 19:30  고정 · 수학 학원        2시간          ┐
  ┌ ② 스트레칭·산책  15분                          ┐
                                    ┌───────┐
                                    │   +   │  ← 탭 1회: 입력 / 길게: 음성
                                    └───────┘
────────────────────────────────────────────────────────────
   오늘          타임라인          보관
```

| 제스처 | 동작 | 대체 수단(발견 가능성) |
|---|---|---|
| 오른쪽 스와이프 | 완료 (**타이머 없이도**) | 카드 탭 → 수정 시트 [완료] |
| 왼쪽 스와이프 | 내일로 | `⋯` 메뉴 |
| 위로 스와이프 | 시작 → Focus Mode (재보기 없음) | [시작] 버튼 |
| 길게 누르기 | 드래그(순서·배치) | 타임라인 탭 [배치] |
| 하단 탭 두 번 | 해당 화면 최상단 | — |
| 왼쪽 끝에서 오른쪽 | 뒤로 | 상단 뒤로 버튼 |

**한 손 조작 존**: 주요 액션(시작·완료·`+`)은 화면 하단 1/3. 상단은 표시 전용. 카드 [시작]은 하단 정렬.

### 5.9 Focus Mode 전환 흐름

```
 [오늘 보드]
   │  카드 [▶ 시작] 탭  또는 위로 스와이프      ← 재보기 시트를 거치지 않는다 (v1.2)
   ▼
 [전환 240ms]  배경 blur(8px) + dim 92%, 카드가 제자리에서 확대(shared element)
   ▼
┌ Focus — 카드 1장 ─────────────────────────────────
│              ◜  09:58  ◝                  ← 카운트다운 링
│        인하대 논술 2번 문항 재작성
│        2번 문항 논점 3줄만. 7분. 망쳐도 됨.  ← MVS 1줄
│        예상 45~75분 · 지금 시작하면 20:05
│        [ 완료 ]   [ 착수 성공 ]   [ 나가기 ]
└────────────────────────────────────────────────────
   │  타이머 종료
   ▼
 [선택 3개 — 시트 하단에서, 200ms]
   ① [ 계속 25분 ]   ② [ 착수 성공 ]   ③ [ 5분 쉬기 ]
   │
   ├─ ① → 타이머 재시작(25:00), Focus 유지
   ├─ ② → 가벼운 체크(240ms) → 보드 복귀 + `◐ 착수함` (완료 아님)
   ├─ ③ → 5분 링(--text-3) → 종료 후 보드 복귀
   └─ 나가기/Esc/뒤로 → 즉시 복귀. **확인 대화상자 없음**

  [완료]는 언제든 → 완료 애니 320ms → 보드 복귀 + 다음 후보 1개 제안
  [착수 성공]은 언제든 → startedAt 기록 + 카드 유지(남은 일이 보인다)
```

| 항목 | 스펙 |
|---|---|
| 진입 | 240~320ms. 배경 `opacity .08` + `blur(8px)`. 카드는 보드 좌표에서 시작(공유 요소). **불확실한 항목이어도 재보기를 먼저 띄우지 않는다** — 원하면 보드의 버튼으로 돌아와 쓴다 |
| 유지 | **카드 1장 + 링 + 버튼 3개**뿐. 다른 항목·시계·배지 숨김 |
| 링 | `tabular-nums`, 1초마다 갱신. 마지막 10%에서 `--accent` → `--held` |
| MVS | 링 아래 1줄. 없으면 비우고 제목만. 시간 숫자는 `--text-2` |
| 착수 성공 | 보조 버튼(테두리 없음). 완료와 같은 크기로 두지 않는다 — 혼동하면 정직한 집계가 깨진다 |
| **타이머 미사용** | 링을 끄고(설정 아님, 세션 단위) `완료`만 눌러도 동일하게 기록된다. 시간 관측만 생략된다(D14) |
| 백그라운드 | 앱을 닫아도 종료 시각 저장. 복귀 시 복원, 이미 지났으면 "끝났어요" 시트 |
| 종료 | 알림 권한 없으면 소리·진동 없이 복귀 시 결과만 |
| 화면 잠금 | 지원 기기에서만 `wakeLock` (실패해도 무시) |

### 5.10 크기 파악·착수 흐름 (M6 · M7)

**(1) 5분 재보기 — 버튼이다, 절차가 아니다**

```
 [카드 하단]  ⏱ 5분만 재보기            [5분]  (×)
   │ 사용자가 눌렀을 때만
   ▼
 [상단 1줄 타이머]  ⏱ 04:12   ·   목차·문제 수만 세기        [그만]
   │ 종료 (또는 [그만])
   ▼
┌ 시트 ───────────────────────────────────
│  얼마나 큰 일이었나요?
│  [ 예상대로 ]      [ 더 큼 ]
└─────────────────────────────────────────
   ├─ 예상대로 → σ̂ 하향, 카드 유지. (누른 것만으로도 정보가 남는다)
   └─ 더 큼   → [15분] [30분] [60분] 중 1탭 → estimateMin 갱신
                → (조건 충족 시) 같은 시트 아래 1줄:
                   "그 크기면 20분씩 3번이 좋아요"  [나누기]
```

| 항목 | 스펙 |
|---|---|
| 노출 조건 | `u ≥ 0.45` · 이 유형 3번 미만 · `firstOfKind` 중 하나 (4.3) |
| **자동 삽입 없음** | [시작]은 **Focus Mode로 바로** 간다. 재보기는 카드의 버튼으로만 시작한다(v1.2) |
| 닫기 | 버튼의 `×` → `probeDismissedAt` 기록, 그 항목은 **7일간** 버튼이 붙지 않는다(`policy.engine.time.probeCooldownDays`) |
| 시간 | 5분(`policy.engine.explore.minutes`). 넘기면 [그만]을 강조하고 숫자만 유지 |
| 평가 | **2선택** `[예상대로] [더 큼]`. 쪼개기는 판정 버튼이 아니라 **조건부 1줄 제안**(4.6) |
| 기록 | `exploration { doneAt, actualMin, revisedEstimateMin, verdict }` + EngineEvent `explore` |
| 금지 | 재보기를 **완료로 세지 않는다.** 준비이고, 착수는 따라오는 별개 사건이다 |

> **v1.2의 변경 이유**: v1.1은 불확실한 항목의 [시작]을 누르면 재보기 시트가 먼저 떴다. 정확도는 올라가지만, "간신히 시작한 순간"에 화면이 한 번 끊긴다 — 마찰 0(P1)과 정면으로 충돌한다. 이제 재보기는 **하고 싶을 때 하는 측정**이고, 안 하면 구간 표시가 유지될 뿐이다.

**(2) Minimum Viable Start — 문구를 제목에서 만든다**

카드와 Focus Mode에서 **문장 하나**로 작동한다.

```
카드 (MVS 있음)                          카드 (MVS 없음)
┌────────────────────────────┐          ┌─────────────────────┐
│ ① 인하대 논술 2번 재작성    │          │ ③ 장학금 서류       │
│   2번 문항 논점 3줄만. 7분. │          │   15분              │
│   예상 45~75분              │          │   ▶ 시작            │
│   ⏱ 5분만 재보기            │          └─────────────────────┘
│   ▶ 시작  ⇥ 내일로  ⋯      │
└────────────────────────────┘
```

**생성 조건** — `energy: high` · 한 번도 시작 안 함 · `u ≥ 0.45` 중 하나(`policy.engine.mvs.autoFor`).

**생성 파이프라인 (4단계, 전부 순수 함수)**

```
composeMvs(item, dayIndex, board: Item[]) → { label, targetMin }
  0) 종류 우선   kind === 'workout'이면 제목과 무관하게 'workout' 유형 (루틴 이름이 '하체 루틴'이어도)
  1) 유형 매칭   제목을 정규식으로 훑어 첫 매칭 유형을 고른다 (없으면 'default')
  2) 목적어 추출 ① 숫자 토큰 /(\d+)\s*(번|문항|장|개|회|페이지|쪽|강)/ → '2번 문항'
                 ② 없으면 명사화 어미(하기·쓰기·작성·정리·풀기·읽기·제출·신청·준비·확인·검토·보기)를
                    떼고 앞쪽 명사구 2어절, 최대 14자
  3) 템플릿 선택 idx = (hash32(item.id) + dayIndex) % templates.length   ← 결정적
  4) 보드 중복 회피 같은 문자열이 보드에 이미 있으면 idx를 +1 (최대 templates.length회)
```

**패턴 표 (`core/data/mvs.ts` — 데이터, 로직 아님). 표의 순서가 우선순위다 — 위에서 첫 매칭을 고른다.**

| 유형 | 매칭 (제목) | 목적어 | 템플릿 (로테이션) | `targetMin` |
|---|---|---|---|---|
| `solve` | `풀기` `풀이` `문제` `기출` `모의` `오답` `N제` | 숫자 토큰 우선, 없으면 명사구 | ①`{obj} 손으로 푸는 데까지.` ②`{obj} 답만 적기.` ③`{obj} 1번만.` | 7 |
| `write` | `작성` `쓰기` `재작성` `첨삭` `답안` `논술` `초안` `에세이` `고쳐` | 숫자 토큰(`2번 문항`) 우선 | ①`{obj} 첫 문단 3줄만.` ②`{obj} 논점 3줄만. 망쳐도 됨.` ③`{obj} 소제목만 뽑기.` | 7 |
| `read` | `읽` `독해` `복습` `정독` `훑` `요약` | 명사구 | ①`{obj} 첫 페이지만.` ②`{obj} 소제목·표만 보기.` ③`{obj} 1문단 읽고 한 줄.` | 5 |
| `organize` | `정리` `분류` `옮기` `스캔` `파일` `노트` `청소` | 명사구 | ①`{obj} 한 무더기만.` ②`{obj} 첫 1개만 처리.` ③`{obj} 버릴 것 3개 고르기.` | 5 |
| `submit` | `서류` `제출` `신청` `접수` `발급` `장학` `원서` `등록` | 명사구 | ①`{obj} 첫 칸만 채우기.` ②`{obj} 필요한 서류 목록 1줄.` ③`{obj} 사이트 열고 로그인까지.` | 5 |
| `workout` | `운동` `헬스` `스트레칭` `걷기` `산책` `러닝` | — | ①`운동복 입고 1세트.` ②`{obj} 준비 동작만.` ③`신발 신고 나가기까지.` | 5 |
| `default` | (그 외) | 명사구 | ①`{obj} 첫 줄만 손대기.` ②`{obj} 파일 열고 1줄.` ③`{obj} 5분만 들여다보기.` | 5 |

**예시 (스냅샷 테스트 대상 — 4.12 T7)**

| 입력 제목 | 유형 | 결과 문구 |
|---|---|---|
| 인하대 논술 2번 문항 재작성 | `write` | `2번 문항 논점 3줄만. 망쳐도 됨.` |
| 국어 기출 12번 풀기 | `solve` | `12번 손으로 푸는 데까지.` |
| 장학금 서류 준비 | `submit` | `장학금 서류 첫 칸만 채우기.` |
| 하체 루틴 | `workout` | `운동복 입고 1세트.` |
| 책상 정리 | `organize` | `책상 한 무더기만.` |
| (제목 비어 있음 · 이모지) | `default` | `5분만 손대기.` (폴백) |

**수정·로테이션 규칙**

| 규칙 | 내용 |
|---|---|
| 1탭 수정 | MVS 줄을 **탭** → 제자리 1줄 편집(현재 문구가 채워짐). 저장하면 `mvsLabel` + `mvsAcceptedAt` — **이후 자동 생성이 덮지 않는다** |
| 다시 받기 | **길게 누르기** → `[문구 다시 받기]` → 다음 로테이션 문구 제안(수락 시 `mvsAcceptedAt` 갱신) |
| 로테이션 | `idx = (hash(id) + dayIndex) % n` — **같은 날 같은 항목은 같은 문구**(결정적), 날이 바뀌면 다음 문구. 같은 유형 카드 3장이 같은 문장을 달지 않도록 보드 내 중복 회피 |
| 금지 | 품질 평가·합격선 문구(`이것만 하면 오늘은 성공`)를 쓰지 않는다 — 새 기준을 만들면 완벽주의가 그쪽으로 옮겨간다(9.3) |
| 착수 | 3분 이상 타이머가 돌아도 **자동 기록하지 않는다.** [착수 성공] 또는 [완료]로만 `started`가 된다 |
| 표시 | `◐ 착수함`은 유채색이 아니라 아이콘+텍스트. 완료 `✓`와 모양이 다르고, 접히지 않는다 |

### 5.11 마이크로 인터랙션 스펙

| 요소 | 트리거 | 변화 | 시간·이징 |
|---|---|---|---|
| 카드 | hover / press | border `--border-strong` / `scale(.995)` | 90ms standard |
| 체크 | 완료 | 원 → 체크 드로잉(stroke-dashoffset) | 180ms enter |
| 카드 | 완료 후 | `opacity 1→.45`, 높이 → 0, 아래 카드 상승 | 240ms + 200ms |
| Now Line | 1분 경과 | `translateY` 1px | 600ms linear |
| 에너지 스위치 | 변경 | thumb 3분할 이동, 비활성 카드 opacity .35 | 140ms / 200ms stagger 20ms |
| 토스트 | 이월 | 하단에서 8px 상승 + fade | 160ms in / 140ms out, 1.8s |
| 제안 | 등장 | 카드 하단 1줄 슬라이드 | 200ms enter |
| Focus | 진입/이탈 | 위 5.9 | 240 / 320ms |
| MVS 줄 | 카드 등장 | 제목 아래 1줄 fade + 2px 하강 | 160ms enter (카드당 1회) |
| MVS 줄 | 탭 → 편집 | 인라인 input 전환(카드 높이 유지) | 120ms |
| **재보기 버튼** | 탭 | 상단 1줄 타이머로 축소 이동(공유 요소) | 200ms |
| **재보기 종료** | 시트 등장 | 하단에서 상승, 배경 dim 40% (blur 없음) | 200ms |
| 착수 체크 | [착수 성공] | 반원 채움(`◐`) + 라벨 fade-in | 240ms ease-enter |
| Explain | 열기 | 시트 상승 + dim 40% | 200ms |
| 가중치 미리보기 | 프리셋 탭 | 카드 3장 순서만 재배치 | 200ms |
| 링 | 매초 | `stroke-dashoffset` | 1s linear |

### 5.12 접근성 · ADHD 배려

| 항목 | 기준 |
|---|---|
| 터치 타깃 | 최소 44×44px (아이콘 버튼 포함, 재보기 `×` 포함) |
| 대비 | 본문 4.5:1, 큰 텍스트·아이콘 3:1 |
| 포커스 | `2px solid var(--accent)`, `outline-offset: 2px` — 키보드 사용 시 항상 보임 |
| 모션 | `prefers-reduced-motion` 존중 |
| 스크린리더 | 카드 라벨: `① 인하대 논술 2번 재작성, 예상 45~75분, 19시 시작, 시작 버튼`. 착수한 카드는 `착수함`을 먼저 읽는다 |
| 색맹 | 상태를 색 단독으로 구분하지 않는다. `◐`와 `✓`는 모양이 다르고 라벨이 붙는다 |
| 산만 억제 | Focus Mode에서 알림·배지·Now Line 모두 숨김. 깜빡임 금지 |
| 카피 | 화면당 설명 문단 금지. 안내는 1줄, 20자 내외 |

**키보드 단축키 (PC)**

| 키 | 동작 | | 키 | 동작 |
|---|---|---|---|---|
| `⌘K` / `Ctrl+K` | 빠른 입력 | | `Space` | 완료 |
| `1` `2` `3` | 카드 포커스 | | `→` | 내일로 |
| `Enter` | 선택 카드 시작 | | `Esc` | 시트·Focus 닫기 |
| `T` | 타임라인 탭 | | `⌘Z` | 방금 작업 취소 (10초) |
| `P` | 선택 카드 5분 재보기 | | | |

### 5.13 상태별 화면

| 상황 | 화면 |
|---|---|
| **첫 실행** | 3스텝 온보딩: ① 한 줄 입력 체험(실제로 저장된다) ② 운동 루틴 1개 선택 ③ "하루 경계는 새벽 4시로 둘게요" 확인. **계정·로그인 요청 없음** |
| **빈 하루** | `오늘은 비어 있어요.` + 후보 3개 자동 채움 + `[하나만 골라도 충분해요]` |
| **오프라인** | 상단 점 `--text-3` + `오프라인 · 기기에 저장 중`. 기능 제한 없음 |
| **동기화 오류** | 점 `--held` + 설정에 마지막 성공 시각. **배너·모달 금지** |
| **토큰 만료 D−7** | 상단 점 `--held` + 설정 1줄 `동기화 토큰이 11월 30일 만료돼요 · 갱신`. **모달·푸시 없음** (6.8) |
| **데이터 손상/마이그레이션 실패** | 읽기 전용 + `내보내기` + `백업에서 복원`. 원본은 절대 덮어쓰지 않음 |
| **새 버전** | 하단 1줄 `새 버전이 준비됐어요 · 새로고침` (자동 새로고침 없음) |
| **엔진 데이터 부족(0–3일)** | 카드에 확률·점수 없음. 처음 보는 유형에만 `⏱ 5분만 재보기` 버튼 |
| **엔진 끔** | 설정에서 끄면 3.6 규칙만으로 동작. 화면은 그대로 |
| **재보기 후·착수 직후** | 토스트 없음. 카드에 `◐ 착수함` 한 줄만. 축하·카운터·연속 표시 없음 |

---

## 6. 기기 간 동기화 & 자동 백업

### 6.1 원칙

1. **로컬이 진실의 원본.** 원격은 복제본. 네트워크가 없어도 앱은 100% 동작한다.
2. **쓰기는 즉시 로컬, 전송은 백그라운드.** 저장 버튼은 없다.
3. **동기화 실패가 사용을 막지 않는다.** 점 1개로만 알린다.
4. **충돌은 대화상자로 묻지 않는다.** 결정적 규칙으로 병합하고, 백업으로 되돌린다.
5. **저장소는 교체 가능해야 한다**(`SyncAdapter`).
6. **(v1.2) 백업은 파일로도 꺼낼 수 있어야 한다** — 브라우저 저장소 정리·기기 분실에 대비한 마지막 방어선(6.7).

### 6.2 데이터 흐름

```
[사용자 조작] → [command] (순수 리듀서) → [core 상태]
   │                                            │
   │                                            ├─▶ [selector] → [화면]   즉시(동기)
   ├──▶ [IndexedDB 영속화]  즉시                │
   └──▶ [outbox 큐] ─(30초 디바운스)─▶ [SyncAdapter.push]
[SyncAdapter.pull] ─(앱 시작 / 5분 폴링)─▶ [merge.ts] ─▶ 상태 갱신
                                       └─▶ [backup.ts] ─(하루 1회)─▶ 원격 스냅샷
                                       └─▶ (수동) 파일 내보내기 1탭
```

### 6.3 로컬 저장소 (IndexedDB)

| 스토어 | 키 | 내용 | 인덱스 |
|---|---|---|---|
| `meta` | `'app'` | `AppDataV1` (settings + items + goals + contexts + snapshots + events + engineCache) | — |
| `events` | `id` | `EngineEvent` — append-only (6.6 합집합 병합) | `byDate`, `byItemId` |
| `outbox` | 자동 증가 | 미전송 명령 | `byCreatedAt` |
| `backups` | `date` | 로컬 스냅샷 (최근 14개) | — |
| `secrets` | `'gist-token'` | 동기화 토큰 | **동기화 대상 아님** |

> 규모: 하루 30~40 이벤트 × 3년 ≈ 22,000건 ≈ 1.2MB. `events`를 `meta`와 분리해 **이벤트만 증분 push**할 수 있게 한다. `engineCache`는 로컬 전용.
>
> **`backups`는 같은 브라우저 저장소에 있다** — Safari가 저장소를 정리하면 함께 사라진다. 그래서 로컬 스냅샷은 "실수 되돌리기"용이고, **진짜 백업은 원격(6.7)과 파일 내보내기**다. 이 구분을 화면 문구에도 지킨다: `기기 안 백업` / `파일로 내보내기`.

### 6.4 `SyncAdapter` 인터페이스

```
// src/sync/adapter.ts
export interface ChangeSet {
  baseRev: number;
  upserts: Item[];
  deletes: ItemId[];
  events: EngineEvent[];      // 새 이벤트만 (수정·삭제 없음)
  meta?: Partial<AppDataV1['settings']>;
}
export interface PullResult { rev: number; at: Instant; changes: ChangeSet }

export interface SyncAdapter {
  readonly id: 'gist' | 'repo' | 'supabase' | 'file';
  connect(config: unknown): Promise<{ tokenExpiresAt?: Instant }>;   // v1.2: 만료일 힌트 반환
  disconnect(): Promise<void>;
  isConnected(): boolean;
  pull(sinceRev: number): Promise<PullResult | null>;   // null = 변경 없음
  push(changes: ChangeSet): Promise<{ rev: number; rejected: ItemId[] }>;
  stat(): Promise<{ lastWriteAt?: Instant; sizeBytes?: number }>;
}
```

`app/providers.tsx`가 어댑터를 주입한다. `ui`는 `sync`를 모른다 → 저장소 교체가 화면에 영향 없음.

### 6.5 옵션 비교

| | **A. GitHub Gist** | **B. GitHub Private Repo** | **C. Supabase** | **D. Firebase** |
|---|---|---|---|---|
| 비용 | 무료 | 무료 (Actions 한도 내) | 무료 티어 | 무료 티어 |
| 동기화 | 파일 1개 덮어쓰기 + 리비전 | Contents API 커밋 | 행 단위 upsert | 문서 단위 |
| 실시간성 | 폴링(5분) + 즉시 push | 폴링 / push | Realtime | Realtime |
| 이력·백업 | Gist 리비전 | **커밋 이력 = 무료 백업** | 수동 | 수동 |
| 설정 난이도 | 낮음(토큰 1개) | 낮음~중간 | 중간(SQL·RLS·Auth) | 중간 |
| 다기기 동시 사용 | 약함 | 약함 | **강함** | **강함** |
| 적합 | **v1 동기화** | **v1 일별 백업** | v2 실시간 | 대안 |

**권장 조합 (v1)**: **Gist = 동기화, Private Repo = 일별 백업 커밋.** 같은 계정·같은 토큰이라 추가 가입이 없다. 평상시 체감 지연은 "앱 시작 pull 1회 + 변경 30초 디바운스 push"로 충분(하루 수십 건). 두 기기 **동시 입력**이 잦아져 5분 지연이 문제가 되면 `supabase.ts` 추가 + 설정 1줄. `core`·`ui`는 손대지 않는다.

### 6.6 충돌 방지 — `updatedAt` 기반

**병합 단위**: 항목(Item) 1건. 필드 단위 병합은 v2.

```
export function mergeItems(local: Item[], remote: Item[]): Item[] {
  const byId = new Map<string, Item>();
  for (const it of [...local, ...remote]) {
    const prev = byId.get(it.id);
    byId.set(it.id, prev ? pickNewer(prev, it) : it);
  }
  return [...byId.values()];
}
function pickNewer(a: Item, b: Item): Item {
  const ta = Date.parse(a.updatedAt), tb = Date.parse(b.updatedAt);
  if (ta !== tb) return ta > tb ? a : b;
  return a.id < b.id ? a : b;      // 동률은 id 사전순 — 양쪽이 같은 결과에 도달
}
```

| 규칙 | 내용 |
|---|---|
| 승자 | `updatedAt`이 더 최신인 쪽 (전체 항목 교체, LWW) |
| 동률 | `id` 사전순 (결정적) |
| 삭제 | `deletedAt`도 `updatedAt`을 갱신 → **삭제가 최신이면 삭제가 이긴다** |
| purge | `deletedAt` + 30일 후 실제 제거 |
| 이벤트 | `events`는 **id 합집합**(append-only). 같은 이벤트는 id로 중복 제거, 필드 병합 없음 |
| rev | 원격 `rev` 단조 증가. `baseRev`가 최신이 아니면 거부 → pull 후 재시도 |
| 시계 왜곡 | 서버 `Date` 헤더로 오프셋 보정. 5분 초과 시 설정 1회 안내 |
| 사용자 알림 | **없음.** `merge.log`(로컬)에 남기고 필요 시 백업에서 복구 |

> **승패의 원칙**: `updatedAt`을 올리는 것은 **사용자 행동**뿐이다. 시스템 처리(경계 이월, 강도 제안)는 올리지 않으므로 다른 기기의 진짜 편집을 덮어쓸 수 없다.

| 상황 | iPhone | PC | 결과 |
|---|---|---|---|
| 같은 항목 제목 수정 | 18:30 | 18:32 | PC (최신) |
| 한쪽 완료, 한쪽 이월 | 18:31 완료 | 04:00 이월(updatedAt 불변) | **완료가 이긴다** |
| 한쪽 삭제, 한쪽 편집 | 18:20 삭제 | 18:50 수정 | 편집 (최신) → 살아남는다 (의도) |
| 양쪽에서 착수 | 19:10 `started` | 19:12 `abandon` | 이벤트는 **둘 다** 남고, 항목 상태는 LWW |

**알려진 한계 (v2)**: 같은 항목의 **서로 다른 필드**를 동시에 고치면 한쪽이 사라진다. 완화책은 `subtasks`·`note`·`placement` 3필드만 필드 단위 병합. CRDT는 1인·2기기 규모에서 비용이 이득을 넘어 **지금은 넣지 않는다.**

### 6.7 자동 백업 + **1탭 파일 백업/복원** (v1.2 강화)

| 항목 | 스펙 |
|---|---|
| 트리거 | ① 하루 경계(04:05) ② 앱 실행 시 밀린 백업 catch-up ③ 수동 `지금 백업` ④ **보험**: GitHub Actions가 매일 04:10에 Gist 최신 상태를 `backups/`로 커밋(앱을 한 번도 안 열어도 쌓인다) |
| 원격 대상 | `backups/2026-11-27.json` (private repo 커밋) + 로컬 `backups` 14개 |
| 내용 | `AppDataV1` 전체(**`events` 포함**, `engineCache` 제외) + `{ schemaVersion, createdAt, deviceId, itemCount, eventCount }` |
| 보관 | 일별 7 · 주별 4 · 월별 12 (`policy.backupKeep`) |
| 무결성 | 저장 전 `JSON.stringify` 라운드트립 + `itemCount`/`eventCount` 기록. 복원 시 불일치면 경고. **캐시는 복원 후 이벤트에서 재계산** |
| 실패 시 | 상단 `⚑` 점 + 설정 `마지막 백업: 3일 전`. 모달·배너 금지 |

**파일 백업 — 1탭 접근 (v1.2)**

```
설정 → 데이터
┌──────────────────────────────────────────────
│  기기 안 백업     마지막: 오늘 04:05          │
│  [ 지금 백업 ]   [ 파일로 내보내기 ]   [ 복원 ]│
│  완료 기록 CSV   [ 내보내기 ]                 │
└──────────────────────────────────────────────
```

| 경로 | 동작 | 탭 수 |
|---|---|---|
| `지금 백업` | IndexedDB `backups`에 즉시 1건 + 원격 백업 시도 | 버튼 1회 (설정 진입 포함 총 2) |
| **`파일로 내보내기`** | `timekeeper-2026-11-27.json` 생성 → **iOS는 공유 시트**, 데스크톱은 다운로드. Files·AirDrop·메신저 '나에게 보내기'로 어디든 | **1** |
| `복원` | 파일 선택 → **미리보기**(날짜·항목 수·완료 수) → 복원 전 현재 상태 자동 백업 → 마이그레이션 통과 → 적용 | 4 (미리보기 확인 포함) |
| 자동 안내 | `settings.lastFileBackupAt`이 7일을 넘으면 앱 첫 실행 시 **하루 1회 토스트** `파일 백업이 8일째 없어요.` [내보내기] — 모달 아님, 무시 가능 | 1 |

- **내보내기 형식**: 사람이 읽는 JSON(`{ meta, items, goals, contexts, snapshots, events }`). 복원은 이 형식만 받는다(임의 JSON 거부, `schemaVersion` 필수).
- **왜 파일인가**: 원격 동기화가 깨져도(토큰 만료·Gist 장애·계정 문제) 파일 1개는 남는다. 브라우저 저장소 정리에도 살아남는다. **이것이 유일하게 우리 손 밖에 있는 사본**이다.
- **완료 기록 CSV**는 백업이 아니라 사람이 보는 용도(주간 회고·엑셀).
- **어디서든 1탭**: 상단 상태 점을 **길게 누르면** `[지금 내보내기]` `[파일에서 복원]` 2항목 메뉴 — 설정을 열지 않고 바로 닿는다(복원은 미리보기 확인 단계가 있어 여전히 안전하다).

> 백업은 **"동기화와 별개로"** 동작해야 한다. 동기화가 깨져도 백업은 계속되고, 그 반대도 마찬가지다.

### 6.8 보안 — 그리고 **토큰 만료 7일 전 리마인드** (v1.2)

정적 호스팅에는 서버 비밀이 없다. 토큰은 **사용자 소유**이고, 우리가 지킬 것은 "토큰과 데이터가 새지 않게"다.

| 위험 | 통제 |
|---|---|
| 토큰 번들 노출 | 토큰은 **빌드에 포함하지 않는다.** 설정에서 사용자가 입력 → IndexedDB `secrets`(동기화 제외) |
| 권한 과다 | **Fine-grained PAT**, 권한은 `gists`(또는 대상 repo 1개)만, 만료 90일 |
| XSS | 외부 스크립트 0, CSP `script-src 'self'`, `innerHTML` 금지 lint |
| 공용 기기 | 설정에 `이 기기에 토큰 저장 안 함`(세션 메모리만) |
| 유출 시 | GitHub에서 revoke → 앱은 **로컬 모드로 계속 동작** |
| 데이터 노출 | Gist는 **secret gist** + URL 공유 금지, 백업은 **private repo**만 |
| 백업 파일 유출 | 개인 일정 수준. 별도 암호화는 v2 후보(WebCrypto AES-GCM + 패스프레이즈) |

**PAT 90일 만료 — 조용한 리마인드**

```
① 만료일 확보   connect() 응답 헤더 `github-authentication-token-expiration`을 `settings.sync.tokenExpiresAt`에 저장
                 (헤더가 없으면 발급일 + 90일로 보수적으로 가정. 사용자가 직접 넣을 수도 있다)
② D−7          상단 점 --held + 설정 1줄:  `동기화 토큰이 12월 4일 만료돼요 · 갱신`
                 → 탭하면 GitHub 토큰 발급 화면(새 탭) + 붙여넣기 칸. 모달·푸시·배너 없음
③ D−1          같은 1줄의 문구만 `내일 만료돼요`로 바뀐다 (새 알림을 만들지 않는다)
④ D0 이후      push 실패 → 로컬 모드 유지, 설정에 `동기화 멈춤 · 토큰 갱신 필요` [새 토큰 넣기]
                 데이터는 그대로이고, 갱신 후 outbox가 밀린 변경을 재전송한다
```

| 원칙 | 이유 |
|---|---|
| **모달·푸시 금지, 설정 1줄 + 상태 점만** | 만료는 사용자가 지금 당장 할 일이 아니다. 앱을 막는 순간 "관리해야 하는 앱"이 된다 |
| **7일 전** | 하루 전에 알리면 그날 못 하면 끝나고, 30일 전이면 잊는다. 7일은 "다음에 폰 열 때" 안에 들어온다 |
| **만료돼도 앱은 정상** | 동기화만 멈추고 로컬은 100% 동작. 파일 백업도 그대로(6.7) |
| **갱신은 1붙여넣기** | 새 토큰 발급 화면 링크 + 입력 1칸. 두 기기 모두 입력해야 하면 설정에 `다른 기기에서도 갱신이 필요해요` 1줄 |

> **되돌릴 수 없는 것**: 토큰을 잃어도 데이터는 로컬·파일 백업에 남는다. 반대로 **파일 백업이 없고 토큰까지 만료되면** 기기를 잃는 순간 데이터가 사라진다 — 그래서 6.7의 1탭 내보내기가 보안 항목만큼 중요하다.

---

## 7. 누적 수정 대응 가이드

### 7.1 수정 요청 처리 표준 절차 (SOP)

| 단계 | 하는 일 | 산출물 |
|---|---|---|
| 1. 접수 | 요청을 **한 문장 + 예시 1개**로 정리(`"여백이 답답해" + "카드가 붙어 보여"`) | 요청 문장 |
| 2. 분류 | 2.8 라우팅 표에서 행을 고른다. 없으면 **표부터 확장** | 레이어·파일 목록 |
| 3. 변경 | 해당 레이어 안에서만. 한 요청 = 한 커밋(접두어 규칙) | diff |
| 4. 검증 | typecheck → lint(경계) → 유닛(규칙·엔진 T1–T7·마이그레이션) → 시각 회귀 → PR 프리뷰 링크. **v2부터 `engine:backtest` 추가** | CI green + 프리뷰 URL |
| 5. 배포 | main 머지 → Pages 자동 배포 → 버전 1줄 확인 | 배포 URL |
| 6. 기록 | CHANGELOG 자동 + 롤백 대상 커밋 기록 | 커밋 SHA |

**원칙 3개** — ① 한 커밋에 한 성격("색+규칙+새 화면"을 한 커밋에 넣으면 롤백 단위가 사라진다) ② 요청 5개면 5커밋 ③ 되돌릴 수 없는 변경(필드 삭제·데이터 변환)은 사전에 알리고 백업 후 진행.

> **v1.2의 검증 단계는 v1.1보다 짧다** — 엔진 검증이 백테스트·픽스처 12개에서 **유닛 7종**으로 줄었다. 이 단축이 D13(v1 모델 축소)의 목적 그 자체다: 규칙 하나 바꾸는 데 몇 시간이 아니라 **몇 분**이 걸려야 한다.

### 7.2 예시 ① — "전체 색감·여백 바꿔줘"

> *"색이 너무 차갑고, 카드가 붙어 보여. 글씨도 조금 작아."*

| 단계 | 내용 |
|---|---|
| 분류 | **토큰만**. 컴포넌트·core·sync 미접촉 |
| 파일 | `semantic.dark.css`, `semantic.light.css`, `typography.css`, `space.css` |
| diff | 액센트 채도 ↓, `--surface` 살짝 따뜻하게, `--text-body` 15→16px, **`--pad-card`를 `--space-4` → `--space-5` 매핑 변경**(스케일은 그대로) |
| 검증 | 4장면 × 2테마 스크린샷 + 대비비 자동(axe) |
| 소요 | 수정 5분 + CI 2분 + 확인 2분 |

```
-  --surface: #121316;          +  --surface: #131315;
-  --accent:  #8B9CFF;          +  --accent:  #93A6F2;   /* 채도 -8% */
-  --text-body: 15px;           +  --text-body: 16px;
-  --pad-card: var(--space-4);  +  --pad-card: var(--space-5);   /* 값이 아니라 매핑 */
```

> 간격은 4px 스케일을 깨지 않고 **별칭만** 바꾼다. 이렇게 해두면 "여백 조금 더"가 2줄이 된다.

### 7.3 예시 ② — "이월 규칙, 운동 루틴 바꿔줘"

> *"이월은 3번 말고 5번부터 제안하고, 운동 최소는 10분 걷기로. 밀도 기준도 낮춰서 축약이 덜 뜨게."*

| 단계 | 내용 |
|---|---|
| 분류 | **정책만**(`core/policy.ts`). 규칙 로직·루틴 데이터 변경 없음 |
| 파일 | `policy.ts` 3개 상수 + 경계 테스트 갱신 |
| 검증 | `carryCount 4 → 제안 없음 / 5 → 제안 있음`, `density 0.56 → reduced` |
| 소요 | 10분 |

```
-  carrySplitThreshold: 3,                                  +  carrySplitThreshold: 5,
-  workoutMinimum: { label: '스트레칭·산책', minutes: 15 },  +  workoutMinimum: { label: '가벼운 걷기', minutes: 10 },
-  density: { full: 0.35, reduced: 0.6 },                  +  density: { full: 0.30, reduced: 0.55 },
```

**같은 요청이 규칙 로직을 건드리는 경우** — *"운동은 저녁 7시 이후에만 제안해줘"*: `core/rules/workout-intensity.ts`에 조건 1줄(`if (hour < 19 && target === 'full') return []`), 유닛 3건 추가, 15분. **UI·스키마는 열지 않는다.**

> **이 예시가 구조의 시험대다.** 이런 요청에서 `rules/*.ts`에 숫자를 쓰고 있었다면 구조가 실패한 것이다. 숫자는 반드시 `policy.ts`에서 온다. 운동 최소 기준도 항목에 저장하지 않고 policy에서 파생하므로 **이미 만든 운동 항목에도 즉시 적용**된다.

### 7.4 예시 ③ — "추천이 내 마음과 달라"

> *"오늘 카드가 왜 저 순서인지 모르겠고, 운동이 자꾸 뒤로 밀려. 균형을 더 챙겨줘."*

| 단계 | 내용 |
|---|---|
| 분류 | **엔진 가중치** — 로직·스키마·UI 미접촉 |
| 1. 확인 | `⋯ → 왜 이 카드?`의 7줄을 그대로 보여준다: `긴급 .24 · 균형 .02 · 에너지 .11 · 시간 .15 · 시작 .03 − 전환 .01 · 회복 .00 = 0.54` → **"긴급도가 0.24로 가장 큰데, 균형은 0.02예요"** |
| 2. 변경 | 프리셋 [균형 더] = `wBalance .18→.24`, `wUrgency .28→.22` (합 1.0 유지). 코드가 아니라 `settings.engineOverrides` 1줄 |
| 3. 검증 | 미리보기로 카드 3장 변화 확인. **v1은 여기까지**(T2·T3 통과 확인). v2는 백테스트 NDCG 유지 |
| 4. 롤백 | [되돌리기] 1탭 (override 삭제 = policy 기본값) |
| 소요 | 2분 |

> **"추천이 이상하다"는 로직을 뜯는 요청이 아니라 숫자를 보는 요청이다.** 내역을 먼저 보여주고 가중치 한 줄로 끝낸다. `utility.ts`를 고치는 것은 *항 자체가 틀렸을 때*(예: 전환 비용을 빼먹었다)뿐이고, 그때는 T1–T3을 함께 갱신한다.

### 7.5 예시 ④ — "수면·기분 트래커 추가"

> *"잠 몇 시간 잤는지랑 기분 1~5로 남기고 싶어. 주간으로 보고 싶고."*

| 단계 | 내용 |
|---|---|
| 분류 | **스키마 v2 + 새 컴포넌트 1개 + 화면 1개** (가장 큰 변경) |
| 1. 스키마 | `DailySnapshot`의 예약 필드 `mood`·`sleepMinutes` 확정 → 마이그레이션은 **값 주입만** |
| 2. 마이그레이션 | `v1_to_v2.ts` + `__fixtures__/v1-sample.json` + 스냅샷 테스트 |
| 3. 컴포넌트 | `CheckinSheet`, `WeeklyBars` |
| 4. 화면 | `ArchiveScreen`에 "회고" 섹션 1개 |
| 5. **엔진 연동** | `F` 리셋을 `rollover` 고정에서 `F ← F·exp(−수면분/240)`으로 교체(4.4 한계 해소) — **이 한 줄이 이 기능의 진짜 값어치** |
| 검증 | v1 픽스처 → v2 변환 스냅샷 일치, v1 데이터로 앱이 뜨는지, 체크인 1회 저장·복원 |
| 소요 | 40~60분 |

> **"새 기능 = 스키마 확장 + 독립 컴포넌트 1개 + 화면 등록 1줄"** 로 끝난다. 오늘 보드 코드를 고쳐야 한다면 그건 기능이 아니라 **결합**이 문제다.

### 7.6 자주 올 만한 요청 — 열 파일

| 요청 | 열 파일 | 비고 |
|---|---|---|
| "카드에 마감일도 보이게" | `ItemCard.tsx` + `strings.ko.ts` | 데이터는 이미 있음 |
| "완료한 일 취소할 수 있게" | `app/store.ts`(undo) | `⌘Z` 10초 규칙 재사용 |
| "오늘 카드 4개로" | `policy.maxFocusCards` | 한 줄 |
| "에너지 5단계로" | `schema`, `energyMatch`, `EnergySwitch` | **데이터 변경** → v3 |
| "타임라인 30분 단위로" | `selectors/timeline.ts` + `Timeline.tsx` | 계산만 |
| "운동 루틴 3개 추가" | `core/data/routines.ts` | 코드 아님 |
| "주간 회고 화면" | `ui/features/review/` + `screens` | 7.5 패턴 |
| "추천 순서가 이상해" | `ExplainSheet` → `settings.engineOverrides` | 7.4 |
| **"5분 재보기가 자꾸 떠"** | `policy.engine.time.exploreSigma` ↑ 또는 `exploreMinSamples` ↑ | 로직 아님 |
| **"재보기는 그만, 시작만 하고 싶어"** | `policy.engine.time.probeCooldownDays: 7→3650` | 버튼이 사실상 사라진다 |
| "예상 시간이 자꾸 틀려" | `core/engine/time-model.ts` + `policy.engine.time` | T6 필수 |
| **"MVS 문구가 마음에 안 들어"** | `core/data/mvs.ts`(패턴·템플릿) 또는 카드에서 1줄 편집 | 템플릿은 데이터 |
| "엔진 끄고 싶어" | `settings.engine.enabled = false` | 3.6 규칙만으로 동작 |
| "착수도 완료처럼 집계해줘" | **하지 않는다** — 다른 사실이다. 대신 "오늘 손 댄 것"을 보여준다 | 정직성 |

### 7.7 금지 패턴 — 리뷰에서 반려하는 것

| 금지 | 왜 | 대신 |
|---|---|---|
| 컴포넌트에 `#hex`·px 리터럴 | 테마·일괄 수정 불가 | semantic 토큰 |
| `ui`에서 `localStorage`·`fetch` 직접 | 저장 계층이 둘로 갈라짐 | `app`이 주입한 커맨드 |
| 규칙 로직을 selector·컴포넌트에 | 테스트 불가·설명 불가 | `core/rules` 순수 함수 |
| `core`에서 `window`·`Date.now()` | 결정성 상실 | `now`를 인자로 |
| 스키마 필드 즉시 삭제 | 무손실 원칙 위반 | optional로 남기고 두 버전 뒤 purge |
| policy 숫자 인라인 | "5회로"가 코드 수술이 됨 | `policy.ts` |
| 카피 하드코딩 | 카피 수정이 컴포넌트 수정이 됨 | `strings.ko.ts` |
| 엔진 상수를 `engine/` 안에 인라인 | "가중치 올려"가 코드 수술이 됨 | `policy.engine` |
| 확률을 표본 없이 단정 | 표본 3건의 50%는 정보가 아니다 | 표본 수 병기, 3건 미만 `아직 모름` |
| `ModelState`를 스키마·동기화에 넣기 | 기기마다 다른 모델이 "데이터"가 된다 | 이벤트만 동기화, 캐시는 재계산 |
| 착수를 완료로 집계 | 기록을 믿지 않게 된다 | `started`/`done` 분리 |
| **시작 흐름에 자동 단계 추가** | 마찰 0 원칙 위반 (v1.1의 재보기 자동 삽입이 이 사례) | **버튼·1줄 제안**으로 |
| **측정하지 않는 변수를 수식에 넣기** | 있는 척하는 항이 된다 (v1.1의 수면 조건) | 측정하는 것만, 나머지는 명시적 상수·리셋 |

---

## 8. 구현 로드맵 (v1 → v2)

각 마일스톤은 **"그 자체로 쓸 수 있는 상태"** 로 끝난다(중간에 반쪽 기능을 남기지 않는다). 단계 이름은 메커니즘(M1–M7)과 섞이지 않게 **F(phase)** 를 쓴다.

| 단계 | 기간(작업량) | 산출물 | 완료 조건 |
|---|---|---|---|
| **F0 토대** | 0.5일 | 레포·Vite/TS·lint(boundaries)·`tokens` 초안·`schema/v1`·마이그레이션 하네스·CI/Pages·빈 화면 배포 | URL 접속, main push → 60초 내 반영. `typecheck && test` 통과 |
| **F1 핵심 루프** | 1일 | `QuickCapture`·인박스·오늘 카드 3·완료/이월·하루 경계 롤오버 | 항목 5개 입력 → 3개 골라 완료/이월. 새로고침 후 유지 |
| **F2 ADHD 메커니즘** | 2일 | `NowLine`·타임라인 배치·`FocusMode`+착수 타이머(**선택 사항**)·`EnergySwitch`·밀도↔운동·쪼개기·**MVS 생성+`started`+착수 버튼**·**5분 재보기 버튼** | 규칙 4종이 각 1시나리오에서 동작. 착수/완료 분리 기록. **재보기 버튼이 [시작]을 막지 않고**, 타이머 없이 완료해도 정상. 유닛 고정 |
| **F3 엔진 v1** | 1.5일 | `core/engine/`(4셀·4블록·그리디·P_start·explain)·이벤트 로그·replay·**단위 테스트 7종**·Explain 시트 | T1–T7 통과. 콜드 스타트에서 규칙 폴백. `enabled=false`로 끄면 화면이 그대로 |
| **F4 동기화·백업** | 1일 | IndexedDB(`events` 스토어)·Gist 어댑터·outbox·`merge`(이벤트 합집합)·일별 백업·**1탭 파일 내보내기/복원**·**PAT 만료일 표시** | 두 기기 각 1건 입력 → 5분 내 반영. 이벤트 중복 없음. 파일 내보내기 → 복원 성공. 설정에 만료일 1줄 |
| **F5 폴리시** | 1일 | 모션 스펙·접근성 점검·PWA 매니페스트·온보딩 3스텝·시각 회귀 | 홈 화면 추가 후 앱처럼 실행, reduced-motion에서 애니메이션 비활성, axe 위반 0 |
| **F6 엔진 v2** | 2일 *(2주 사용 후)* | 난이도 12셀·48빈 원형 커널·1,320 조합 최적화·Brier 보정·골든 픽스처 12·`engine:backtest` | MAPE < 25%, Brier < 0.20, NDCG@3 > 0.70. **v1과 선택이 갈리는 사례가 실제로 있을 때만** 켠다 |

**v1 합계 ≈ 7일 작업량** (F0–F5). v1.1 대비 F3가 2일 → 1.5일, 검증이 픽스처 12개 → 유닛 7종으로 줄었다.

**순서의 이유**

- F0에서 **롤백이 되는 상태**를 먼저 만들고 F1부터 기능을 얹는다. 기능을 먼저 만들면 "되돌릴 수 없는 코드"가 쌓여 수정 대응력이 사라진다.
- **엔진(F3)이 동기화(F4)보다 앞**인 이유: 엔진은 로컬 이벤트만으로 완성되고 검증할 수 있다. 동기화는 이미 도는 앱의 데이터를 복제하는 일이라 나중에 붙여도 화면이 바뀌지 않는다.
- **F6을 따로 둔 이유**: v2의 항목은 전부 "데이터가 있어야 의미가 있는" 것이다. 2주 뒤에 (a) 셀 표본이 실제로 있는지 (b) 그리디와 조합 최적화가 실제로 갈리는지 (c) `P_done` 보정이 필요한지 **데이터로 확인하고** 넣는다.

---

## 9. 확정 사항 & 남은 결정 · 리스크

### 9.1 확정된 사항 (v1.2 기준)

아래는 v1.1까지의 논의와 v1.2 검토(5가지 지적)를 거쳐 **정해진 것**이다. 구현은 이 값을 기본으로 시작한다.

| # | 항목 | 확정 | 근거 |
|---|---|---|---|
| 1 | 테마 기본값 | **시스템 자동 + 수동 토글** | 토큰만 바꾸면 되므로 되돌림 비용 0. 밤 작업이 많아도 강제하지 않는다 |
| 2 | 메인 뷰 | **카드 3장 중심** (타임라인은 미니 패널) | ADHD에서 "무엇을 할지" 결정이 "몇 시에"보다 먼저 |
| 3 | 동기화 | **GitHub Gist + private repo 일별 백업** | 추가 가입·비용 0, 설정 1개. 실시간 필요 시 어댑터 교체 |
| 4 | 하루 경계 | **04:00** | 새벽 작업이 "어제"로 밀리면 이월 판정이 어긋난다. **피로 리셋 시점**도 여기(4.4) |
| 5 | 알림 | **v1 없음** (앱 내 Now Line으로 1차 해결), v2에서 픽클 톡 연동 | iOS PWA 알림 제약 + 푸시 피로는 ADHD에 역효과 |
| 6 | 엔진 초기 가중치 | **4.11 기본값 그대로** (`Σw = 1.0`, 7항) | 데이터 없는 상태의 튜닝은 의미 없다. 2주 뒤 Explain을 보고 한 줄씩 |
| 7 | 크기 파악 시간 | **5분** (`explore.minutes`) | 목차·문제 수를 세기엔 충분하고 시작 저항보다 짧다 |
| 8 | **크기 파악 개입 방식** | **카드 버튼(`⏱ 5분만 재보기`)** — [시작] 시 자동 삽입 없음 | (v1.2) 시작 흐름을 끊지 않는다. 노출 조건은 엔진이 정하고 시점은 사용자가 고른다 |
| 9 | 엔진 on/off | **켬** (Explain에서 언제든 끔) | 끄면 3.6 규칙만으로 완전 동작. 숫자가 부담인 주에는 끄고 쓴다 |
| 10 | **엔진 v1 범위** | **분류 4셀 · 4블록 곡선 · 그리디 선정 · P_start(kind)** | (v1.2) 표본이 며칠 안에 수렴하고, 규칙 하나 바꾸는 데 몇 분이 걸린다 |
| 11 | **v2 연기 목록** | 난이도 12셀 · 48빈 커널 · 1,320 조합 최적화 · Brier 보정 · 백테스트·픽스처 | (v1.2) 2주 데이터를 보고 데이터로 판단한다 (8장 F6) |
| 12 | **타이머** | **선택 사항** — 켜지 않고 완료해도 정상. 시간 학습은 켠 세션만 | (v1.2) 완료·이월·착수는 타이머 없이도 관측된다 |
| 13 | **MVS 문구** | **제목 패턴 자동 생성 + 1탭 수정 + 일 단위 로테이션** | (v1.2) 고정 템플릿은 며칠 만에 배경이 된다. 본인 과제 이름이 자동으로 들어간다 |
| 14 | **PAT 만료 대응** | 만료일 자동 확보 + **D−7 설정 1줄**(모달·푸시 없음) + 만료 후 로컬 모드 | (v1.2) 90일 토큰은 반드시 만료된다. 미리 알리되 앱을 막지 않는다 |
| 15 | **파일 백업** | 설정 → 데이터에서 **1탭 내보내기/복원** + 7일 미백업 시 하루 1회 토스트 | (v1.2) 브라우저 저장소 정리는 실제로 일어난다. 우리 손 밖 사본이 필요하다 |

### 9.2 아직 필요한 것 — 은호 님만 아는 정보

| # | 필요한 것 | 왜 | 없으면 |
|---|---|---|---|
| A | **운동 루틴 3개** — 종목 · 주당 횟수 · 장소(집/헬스장) · "최소 기준(15분)"으로 인정할 행동 | 카드에 뜨는 문구와 강도 전환이 본인 루틴이어야 의미가 있다 | 임시 루틴(하체·스트레칭·걷기)으로 시작. 나중에 `routines.ts` 데이터만 교체(코드 0줄) |
| B | **앱 이름** (홈 화면 라벨) | manifest·타이틀에 필요 | `Timekeeper`로 시작. `manifest.webmanifest` 1줄 교체 |
| C | *(선택)* **MVS 문구 보정용 실제 과제 3개** | 자동 생성이 어색한 제목을 잡아줄 수 있다 | 자동 생성 + 1탭 수정으로 충분. 문제 없으면 넘어간다 |
| D | *(선택)* **12/5 인하대 시험을 고정 앵커로 넣을지** | 밀도 계산·운동 강도 제안이 시험 주간에 정확해진다 | 사용자가 직접 `!` 입력으로 추가 가능 |

> A·B는 F0~F1에서 임시값으로 진행할 수 있고, **F2(운동 카드) 전까지** 알려주시면 된다. C·D는 없어도 된다.

### 9.3 알려진 리스크와 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| **iOS PWA 제약** — 백그라운드 동기화·푸시 제한 | 앱을 열 때만 동기화 | "앱 열면 pull + 변경 즉시 push" 전제. 백그라운드 실시간을 약속하지 않는다 |
| **GitHub Pages 캐시**(수 분) | 수정이 안 보임 | `version.json` 폴링 + 새로고침 1줄(자동 새로고침 금지) |
| **토큰 노출** | 저장소 접근 | fine-grained PAT·gist 한정·기기별 입력·revoke 시 로컬 모드 (6.8) |
| **토큰 만료(90일)** | 동기화 중단 | D−7 설정 1줄 + 만료 후 로컬 모드 + 갱신 1붙여넣기 (6.8) |
| **Gist API 한도** | 대량 편집 시 push 실패 | 30초 디바운스 + 지수 백오프, 실패는 큐에 남아 다음 기회 |
| **브라우저 저장소 정리** | 로컬 기록 소실 | 자동 원격 백업 + **1탭 파일 내보내기**(6.7) |
| **과설정** | 관리 부담 = 새 업무 | 설정 1화면 6항목 상한. 새 설정은 policy 기본값 + "고급" 접힘 |
| **규칙 피로** — 제안이 잦으면 잡음 | 무시하게 됨 | 화면당 제안 1개, 거절 시 그날 재제안 금지 |
| **과최적화** — 숫자가 나를 이끄는 느낌 | 자율감 상실 | 점수는 요청 시에만. 가중치는 사용자가 바꾼다. 필요하면 엔진을 끈다 |
| **콜드 스타트 오판** — 3일치로 단정 | 잘못된 추천을 신뢰 | `n_eff < 3`이면 확률 숨김·규칙 폴백. 확률은 표본 수와 함께만 |
| **4셀도 부족할 수 있음**(v1.2 신규) | `σ̂`가 0.45 아래로 안 내려가 재보기 버튼이 계속 뜸 | `exploreSigma` 상향으로 빈도 조절. 7일 뒤 `σ̂` 추이를 보고 셀 확장(v2) 판단 |
| **타이머를 안 켜면 시간 학습이 느리다**(v1.2 신규) | `b`가 오래 1.0에 머묾 | 완료·이월·착수는 계속 학습. 구간 표시가 유지될 뿐 손해 없음. 정확도가 필요하면 카드에서 [시작]만 누르면 된다 |
| **밤샘 시 피로 리셋**(v1.2 신규) | 드물게 과소평가 | 감수(4.4). v2 수면 체크인에서 `F·exp(−수면분/240)`으로 교체 |
| **MVS 문구 로테이션 피로**(v1.2 신규) | 3~7일 뒤 문구가 익숙해져 안 읽힘 | 패턴이 제목에서 나오므로 카드마다 다르다. 같은 유형은 3문구 순환 + 1탭 수정. 그래도 안 읽히면 MVS를 줄이는 게 낫다(강제 아님) |
| **그리디가 조합 최적보다 나쁠 수 있음**(v1.2 신규) | 드물게 2·3순위가 바뀜 | 3장 선택에서 차이는 대개 무의미. v2에서 실제 갈림 사례를 확인 후 교체 |
| **완벽주의의 이동** — MVS가 새 "최소 합격선"이 됨 | 착수마저 평가 대상 | MVS는 행동 문장만. 품질 평가·합격 문구 금지. 착수는 버튼으로만 |
| **설명 피로** — 내역을 매번 펼쳐 봄 | 숫자에 매달림 | Explain 기본 닫힘. 첫 2주 안내 1회, 이후 요청 시에만 |

---

## 10. 부록

### 10.1 파일 책임 체크리스트 (F0에서 만들 것)

| 경로 | 반드시 하는 일 | 절대 하지 않는 일 |
|---|---|---|
| `tokens/semantic.*.css` | 색의 유일한 정의 | 컴포넌트별 예외 색 |
| `core/schema/v1.ts` | 타입 계약 | 로직·기본값 생성 |
| `core/schema/factory.ts` | 기본값 생성 | UI 문구 |
| `core/policy.ts` | 모든 숫자 | 조건문 |
| `core/engine/*` | 확률·점수 계산 (순수) | 저장·렌더·`Date.now()` |
| `core/engine/utility.ts` | 개별 효용 + 그리디 + 하드 제약 (v1) | 조합 최적화(v2 전까지 넣지 않는다) |
| `core/data/mvs.ts` | **MVS 패턴·템플릿 표(데이터)** | 매칭·조립 로직 |
| `core/rules/mvs.ts` | 패턴 매칭·목적어 추출·로테이션 (순수) | 문구 저장·UI |
| `core/data/routines.ts` | 운동 루틴 데이터 | 계산 |
| `core/rules/*` | 판단(제안) — 엔진 폴백 포함 | 저장·렌더 |
| `core/selectors/*` | 파생 계산 | 부작용 |
| `core/content/strings.ko.ts` | 모든 화면 문구 | 로직 |
| `ui/primitives/*` | 도메인 없는 부품 | `Item` 참조 |
| `ui/features/*` | 조합·상호작용 | 계산·저장 |
| `sync/adapter.ts` | 저장 인터페이스 | UI 참조 |
| `sync/backup.ts` | 스냅샷 + **파일 내보내기/복원** | 진단·표시 |
| `app/store.ts` | 명령→상태, 어댑터 주입 | 도메인 규칙 |

### 10.2 커밋 메시지 예

```
tokens: 액센트 채도 하향, 본문 16px, 카드 여백 별칭 +1단계
rules: 이월 임계 3→5, 운동 최소 10분 가벼운 걷기, 밀도 0.30/0.55
engine: E1 셀을 분류 4개로 축소 (MAPE 기준선 확보)
engine: ΔU_recovery 정규화 [0,1] + wRecovery .10 편입
engine: 균형 가중 .18→.24 (설정 override)
rules: MVS 문구 패턴 7종 + 로테이션 (제목 매칭)
ui: 5분 재보기를 카드 버튼으로 이동 (시작 흐름 유지)
sync: PAT 만료 D−7 설정 1줄 + 파일 내보내기 1탭
schema: v2 — 스냅샷에 수면·기분 확정 + v1→v2 마이그레이션
fix: 타임라인 겹침 시 드롭이 거부되던 문제
```

### 10.3 용어

| 용어 | 뜻 |
|---|---|
| **Item** | 일정·업무·할 일·운동을 모두 아우르는 단일 데이터 단위 |
| **Anchor** | 시간이 고정된 일정. `hard`(이동 불가) / `soft`(조정 가능) |
| **Placement** | 항목이 타임라인의 특정 날짜·시각에 놓인 상태 |
| **Proposal** | 규칙 엔진이 내는 제안. 데이터를 바꾸지 않는다 |
| **Day rollover** | `dayStartHour`(04:00) 기준 하루 경계 처리 — 이월 판정 + **피로 리셋** 시점 |
| **Density** | 고정 일정 총량 ÷ 가용 창. 운동 강도 제안의 입력 |
| **Snapshot** | 그날의 사실 기록. 파생값 비저장 원칙의 예외 |
| **EngineEvent** | 발생한 사실(시작·착수·중단·완료·재보기·에너지·경계). 엔진의 유일한 학습 입력 |
| **ModelState** | 이벤트에서 재계산 가능한 캐시. 동기화·백업 제외 |
| **`t̂` / `t` / `t̃`** | 계획 소요 / 실제 소요(타이머 세션) / 보정된 추정(구간으로 표시) |
| **`u` (불확실성)** | 로그 표준편차 `σ̂`. 0.45 이상이면 `5분만 재보기` 버튼 |
| **`b` (보정 계수)** | `exp(μ̂ + σ̂²/2)` — 이 유형은 계획의 몇 배가 걸리는가 |
| **셀(cell)** | v1 = `contextId` 4개. v2 = `(contextId, difficulty)` 12개 |
| **4블록** | v1의 집중 곡선 단위(04–10·10–16·16–22·22–04). v2에서 48빈 |
| **EWMA / 축소** | 지수 가중 이동 평균(α .15) / 표본이 적을 때 상위 평균으로 당기는 것(κ 3) |
| **`E(t)` / `F`** | 시각 t의 집중도(0–1) / 누적 피로도(0–1) |
| **`P_start` / `P_done`** | 착수 확률 / 주어진 빈 시간에 완료할 확률 |
| **`U_i(t)`** | 후보 i를 시각 t에 놓을 때의 효용. `[−0.03, 0.97]` |
| **`ΔU_recovery`** | 운동의 회복 효용. `[0,1]` 정규화, 가중치 .10 |
| **그리디(greedy)** | 점수 순서대로 담되 하드 제약을 지키는 v1 선정 방식 |
| **MVS** | Minimum Viable Start — 0→1 착수 기준(예: `2번 문항 논점 3줄만. 7분.`) |
| **재보기(M6)** | 5분 크기 파악. 결과물이 아니라 크기를 재는 단계. **버튼으로만 시작** |
| **로테이션** | 같은 유형의 MVS 문구를 `(id 해시 + 날짜)`로 돌려 쓰는 것 |
| **콜드 스타트** | 이벤트가 부족해 엔진이 확률을 말하지 않는 구간(0–3일) |
| **v1 / v2 (엔진)** | 지금 만드는 최소 모델 / 2주 데이터 후 확장 모델 (4.0) |
| **Brier / MAPE / NDCG** | 확률 보정 / 시간 오차 / 추천 순서 적합도 — **v2** 검증 지표 (4.12) |

### 10.4 이 문서의 상태

- **설계만 완료.** 코드·레포지토리·배포는 아직 없다.
- 스키마·규칙·토큰·엔진 v1은 **구현 가능한 수준**으로 구체화했다. 9.2의 A·B(운동 루틴·앱 이름)는 임시값으로 진행 가능.
- 수치(밀도 0.35/0.6, 카드 높이, 모션 시간, 엔진 가중치·상수)는 **초기 추정값**이며, 사용 후 `policy.ts`만 조정한다.
- **v1.2의 엔진은 v1 범위로 확정**됐다(4.0). v2 항목은 데이터가 쌓인 뒤 8장 F6에서 판단한다.
- 이 문서 자체가 `docs/design/`에 들어 **구조의 기준 문서**가 된다. 구조를 바꾸는 변경은 이 문서를 함께 갱신한다(문서와 코드가 어긋나면 다음 수정이 잘못된 곳을 고친다).

### 10.5 레퍼런스

- **Linear** — 밀도 높은 목록, 1px 보더, 키보드 우선 흐름
- **Things 3** — 활자 위계, 작은 모션, 카드 호흡
- **Raycast** — 입력창 중심 조작(`⌘K`)
- **ADHD 친화 원칙** — 선택지 축소, 즉시 피드백, 시간의 시각화, 실패 비용 제거

### 10.6 개정 이력

| 버전 | 날짜 | 바뀐 것 |
|---|---|---|
| **v1.0** | 2026-11-27 | 최초 설계 초안 — 4레이어 구조, 스키마 v1, 유기적 연동 규칙 4종, UI/UX 스펙, 동기화·백업, 수정 대응 가이드, 로드맵 |
| **v1.1** | 2026-11-27 | ① **4장 신설** — 수학·통계 엔진(E1 시간·난이도 보정 / E2 에너지·피로 / E3 효용 최적화 / E4 완료 확률 / P_start / Explain / 백테스트) ② M6 크기 파악·M7 MVS 추가 ③ 스키마 확장(`started`, `EngineEvent`, `exploration`, `mvsLabel` 등) ④ UI 5.6·5.7·5.9–5.13 ⑤ 이벤트 동기화·백업 ⑥ 수정 대응 ⑦ 로드맵 F0–F5 ⑧ 결정 4건·리스크 5건 ⑨ **장 번호 재배치**(4장 삽입 → UI 5장, 동기화 6장 …) |
| **v1.2** | 2026-11-27 | **실전용 정밀판 — 5가지 지적 반영 + 문서 압축** ① **엔진 v1/v2 분리(4.0 신설·D13)**: 셀 `(분류×난이도)` 12개 → **분류 4개 + 전체 2단**(4.3), 48빈 커널 평활 → **4블록**(4.4), 1,320 조합 최적화 → **개별 효용 정렬 + 그리디 + 하드 제약**(4.5), 골든 픽스처 12개·백테스트 → **단위 테스트 7종**(4.12)·v2(F6). ② **미측정 변수 제거**: `수면 7시간 → F←0` 삭제, **04:00 일일 리셋**으로 단순화 + 한계 명시(4.4). ③ **효용 스케일 정규화**: `ΔU_recovery`를 `[0,1]`로(평균 + `recoveryScale 0.08` 상한) 가중치 **7번째 항(w .10)** 으로 편입, 6항 재배분 Σ=1.00(4.5). ④ **ADHD 마찰 제거(D12·D14)**: [시작] 시 강제 재보기 시트 **삭제 → 카드 버튼**(1.4 M6·5.9·5.10), 종료 평가 `[예상대로][더 큼]` 2선택 + 쪼개기 1줄, `probeDeclinedAt` → `probeDismissedAt`, **타이머 선택 사항**(4.10 이벤트 매핑). ⑤ **MVS 동적 생성(D15)**: 제목 동사·목적어 패턴 7유형 + 목적어 추출 + `(id+날짜)` 로테이션 + 보드 중복 회피 + 1탭 수정/길게=다시 받기(5.10(2)) — 정적 템플릿 폐기. ⑥ **동기화 현실 보완**: PAT 만료일 헤더 확보 + **D−7 설정 1줄**(6.8), **1탭 파일 내보내기/복원** + 7일 미백업 토스트(6.7). ⑦ **문서 압축**: 2,617줄 → 약 2,350줄 (예시·중복 설명 축약, 신설 표 5종 포함), v1/v2 경계표·이벤트-관측 매핑표·MVS 패턴표 신설, 9.1을 **확정/남은 것**으로 분리 |

> **백업 보관**: v1.0 원본은 `handoffs/🧮-수학-통계-엔진-완벽주의-보완-설계-반영/parts/설계서_v1.0_원본.md`, **v1.1 원본은 `handoffs/✂️-설계서-v1-2-실전용-정제-업데이트/parts/설계서_v1.1_원본.md`** 에 보관한다(비교·롤백용).
