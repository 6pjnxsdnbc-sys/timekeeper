/**
 * 운동 루틴 — 임시 데이터 (설계서 9.2 A).
 * 사용자의 실제 루틴을 받으면 이 파일만 교체한다. 코드는 0줄 바뀐다.
 *
 * '최소 기준'(15분 스트레칭·산책)은 루틴이 아니라 POLICY.workoutMinimum 에 있다 —
 * 어떤 루틴을 골랐든 "오늘 0점은 아니다"라는 마지막 성공 조건은 하나여야 한다.
 */
import type { WorkoutRoutine } from '../schema/current';

export const ROUTINES: readonly WorkoutRoutine[] = [
  {
    id: 'lower-body',
    label: '하체 루틴',
    fullMinutes: 60,
    reducedMinutes: 30,
    equipment: 'gym',
    steps: ['스쿼트', '런지', '레그프레스'],
  },
  {
    id: 'stretch',
    label: '전신 스트레칭',
    fullMinutes: 20,
    reducedMinutes: 10,
    equipment: 'none',
    steps: ['목·어깨', '척추 비틀기', '하체 스트레칭'],
  },
  {
    id: 'walk',
    label: '빠르게 걷기',
    fullMinutes: 40,
    reducedMinutes: 20,
    equipment: 'none',
    steps: ['밖으로 나가 20분 걷기'],
  },
] as const;

export function findRoutine(id: string): WorkoutRoutine | undefined {
  return ROUTINES.find((r) => r.id === id);
}
