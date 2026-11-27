# ROLLBACK — 배포·코드 되돌리기

데이터 롤백은 코드 롤백과 **분리**한다. 코드를 되돌려도 데이터는 건드리지 않는다.
데이터 복원은 앱 안의 1탭 파일 복원(6.7)으로 처리한다.

| 단계 | 상황 | 방법 | 소요 |
|---|---|---|---|
| 1 | 방금 배포가 이상하다 | Actions → 마지막 정상 run → **Re-run deploy** | ~60초 |
| 2 | 코드를 되돌려야 한다 | `git revert <sha>` → push (자동 재배포) | ~2분 |
| 3 | 여러 커밋이 엉켰다 | `git checkout <tag> && git push origin HEAD:main --force-with-lease` | ~3분 |

태그는 배포 시점마다 남긴다: `git tag v0.1.x && git push origin v0.1.x`

## 확인 순서

1. Actions 탭에서 `Deploy` 실패 단계 확인 (typecheck / lint / test / build 중 어디인가)
2. 로컬에서 같은 명령 재현
3. Pages 캐시는 수 분 걸릴 수 있다 — `version.json`을 확인하고 새로고침 1줄로 안내한다
   (자동 새로고침 금지 — Focus Mode 도중 화면이 바뀌면 안 된다)
