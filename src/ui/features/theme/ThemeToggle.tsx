/**
 * ThemeToggle — 테마는 토큰 교체만 한다. 이 버튼은 "어떤 모드인가"만 옮긴다.
 * 상태는 app 이 갖고, 여기는 표시·입력만 한다 (계산 없음).
 */
import type { Settings } from '@core/schema/current';
import './ThemeToggle.css';

export type ThemeMode = Settings['theme'];

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: '시스템' },
  { mode: 'dark', label: '다크' },
  { mode: 'light', label: '라이트' },
];

export interface ThemeToggleProps {
  value: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  label: string;
}

export function ThemeToggle({ value, onChange, label }: ThemeToggleProps) {
  return (
    <div className="theme-toggle" role="group" aria-label={label}>
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          className="theme-toggle__option"
          aria-pressed={value === option.mode}
          onClick={() => onChange(option.mode)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
