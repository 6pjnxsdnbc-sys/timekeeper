import { describe, expect, it } from 'vitest';
import { POLICY, engineWeightSum } from '@core/policy';

describe('policy — 모든 다이얼이 한 곳에 (D3)', () => {
  it('ADHD 메커니즘 기본값이 v1.2 확정값과 같다', () => {
    expect(POLICY.maxFocusCards).toBe(3);
    expect(POLICY.starterTimerMin).toBe(10);
    expect(POLICY.extendTimerMin).toBe(25);
    expect(POLICY.breakTimerMin).toBe(5);
    expect(POLICY.carrySplitThreshold).toBe(3);
    expect(POLICY.nowPickCount).toBe(2);
    expect(POLICY.engine.mvs.targetMin).toBe(7);
  });

  it('하루 경계는 04:00 이고 가용 창은 08:00–24:00 이다', () => {
    expect(POLICY.dayStartHour).toBe(4);
    expect(POLICY.dayEndHour).toBe(24);
    expect(POLICY.wakingStartHour).toBe(8);
    expect(POLICY.gapBufferMin).toBe(5);
  });

  it('운동 강도 경계는 0.35 / 0.6 이다', () => {
    expect(POLICY.density.full).toBe(0.35);
    expect(POLICY.density.reduced).toBe(0.6);
    expect(POLICY.workoutMinimum.minutes).toBe(15);
  });

  it('엔진 효용 가중치 7항의 합은 정확히 1.0 이다 (T2 · 4.11)', () => {
    expect(engineWeightSum()).toBeCloseTo(1.0, 10);
  });

  it('MVS 목표 시간은 착수 타이머보다 짧다 (M4 · M7)', () => {
    expect(POLICY.engine.mvs.targetMin).toBeLessThan(POLICY.starterTimerMin);
  });

  it('엔진 v1 파라미터가 설계 값 그대로다', () => {
    expect(POLICY.engine.version).toBe('e1.2');
    expect(POLICY.engine.time.roundMin).toBe(5);
    expect(POLICY.engine.time.exploreSigma).toBe(0.45);
    expect(POLICY.engine.time.probeCooldownDays).toBe(7);
    expect(POLICY.engine.utility.maxSameContext).toBe(2);
    expect(POLICY.engine.completion.doneCutoff).toBe(0.5);
    expect(POLICY.engine.explore.minutes).toBe(5);
  });
});
