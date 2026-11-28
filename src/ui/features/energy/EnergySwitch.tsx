/**
 * EnergySwitch — 상단 바의 3분할 스위치 (설계서 5.6 · 5.7).
 *
 * 누르는 즉시 추천·타임라인 제안이 바뀐다. 숫자가 아니라 상태 셋뿐이다.
 */
import type { Energy } from '@core/schema/current';
import { STRINGS } from '@core';
import './EnergySwitch.css';

export interface EnergySwitchProps {
  value: Energy;
  onChange: (level: Energy) => void;
}

const LEVELS: ReadonlyArray<{ id: Energy; short: string; label: string }> = [
  { id: 'high', short: '상', label: STRINGS.energy.high },
  { id: 'mid', short: '중', label: STRINGS.energy.mid },
  { id: 'low', short: '하', label: STRINGS.energy.low },
];

export function EnergySwitch({ value, onChange }: EnergySwitchProps) {
  return (
    <div className="energy-switch" role="group" aria-label={STRINGS.energy.label} title={STRINGS.energy.hint}>
      {LEVELS.map((level) => (
        <button
          key={level.id}
          type="button"
          className="energy-switch__btn"
          data-level={level.id}
          aria-pressed={value === level.id}
          aria-label={`${STRINGS.energy.label} ${level.label}`}
          onClick={() => onChange(level.id)}
        >
          <span className="energy-switch__bar" aria-hidden="true" />
          <span className="energy-switch__text num">{level.short}</span>
        </button>
      ))}
    </div>
  );
}
