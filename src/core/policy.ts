/**
 * policy — 모든 숫자 다이얼이 사는 유일한 곳 (D3).
 * 이 파일에는 조건문이 없다. 로직은 rules / engine / selectors 가 가진다.
 *
 * "이월 3회를 5회로", "타이머 10분을 15분으로" — 전부 여기 한 줄이다.
 */
import type { Settings } from './schema/current';

export const POLICY = {
  // ── ADHD 메커니즘 ──────────────────────────────
  maxFocusCards: 3, // M2
  starterTimerMin: 10, // M4
  extendTimerMin: 25,
  breakTimerMin: 5,
  carrySplitThreshold: 3, // M5
  nowPickCount: 2, // M3

  // ── 하루 경계 ─────────────────────────────────
  dayStartHour: 4, // 04:00 — 새벽 작업을 '어제'로 묶는다 + 피로 리셋 시점
  dayEndHour: 24,
  wakingStartHour: 8, // 밀도 계산용 가용 창
  gapBufferMin: 5,

  // ── 운동 강도 ─────────────────────────────────
  density: { full: 0.35, reduced: 0.6 },
  workoutMinimum: { label: '스트레칭·산책', minutes: 15 },

  // ── 데이터 ────────────────────────────────────
  tombstoneDays: 30,
  backupKeep: { daily: 7, weekly: 4, monthly: 12 },
  fileBackupNudgeDays: 7,

  // ── 엔진 v1 파라미터 (4.11) ─────────────────────
  engine: {
    enabled: true,
    version: 'e1.2',
    time: {
      priorSdLog: 0.6,
      priorStrength: 3,
      ewmaAlpha: 0.15,
      minFactor: 0.4,
      maxFactor: 3.0,
      exploreSigma: 0.45,
      exploreMinSamples: 3,
      probeCooldownDays: 7,
      roundMin: 5,
    },
    energy: {
      blockHours: 6,
      priorAlpha: 2,
      priorBeta: 2,
      fatiguePerHour: 0.18,
      restTauMin: 90,
      exerciseRecovery: 0.25,
      exerciseWindowMin: 90,
    },
    utility: {
      wUrgency: 0.28,
      wBalance: 0.18,
      wEnergy: 0.18,
      wFit: 0.18,
      wStart: 0.05,
      wSwitch: 0.03,
      wRecovery: 0.1,
      urgencyLambda: 0.35,
      balanceTargets: { study: 0.5, errand: 0.3, workout: 0.2 },
      switchContext: 0.12,
      switchPlace: 0.08,
      switchReentry: 0.05,
      maxSameContext: 2,
      candidateCap: 40,
    },
    recovery: { scale: 0.08 },
    completion: {
      doneCutoff: 0.5,
      splitTarget: 0.75,
      chunkMin: 20,
      minChunkMin: 10,
      calibFactor: 1.0,
    },
    start: { priorAlpha: 2, priorBeta: 2, shrink: 2, mvsBonus: 0.1, restartBonus: 0.1 },
    mvs: {
      targetMin: 7,
      autoFor: ['high-energy', 'never-started', 'high-uncertainty'],
      rotateDaily: true,
    },
    explore: { minutes: 5, stepOptions: [15, 30, 60] },
  },
} as const;

export type Policy = typeof POLICY;

/**
 * settings 는 "사용자가 명시적으로 바꾼 값"만 갖는다.
 * 판정은 항상 `settings.X ?? POLICY.X` 순서다 (설계서 3.2 주석).
 */
export function resolveFocusCards(settings: Pick<Settings, 'maxFocusCards'>): number {
  return settings.maxFocusCards ?? POLICY.maxFocusCards;
}

/** 엔진 가중치 7항의 합. 1.0 이어야 한다 (4.11 · T2). */
export function engineWeightSum(
  w: Policy['engine']['utility'] = POLICY.engine.utility,
): number {
  return (
    w.wUrgency + w.wBalance + w.wEnergy + w.wFit + w.wStart + w.wSwitch + w.wRecovery
  );
}
