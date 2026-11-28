/**
 * ViewSwitcher — 집중 / 리스트 / 스플릿. 배치만 바꾼다 (데이터 그대로).
 */
import { STRINGS } from '@core';
import { Icon, type IconName } from '@ui/primitives/Icon';
import './ViewSwitcher.css';

export type ViewMode = 'dashboard' | 'focus' | 'list' | 'split';

interface ViewOption {
  id: ViewMode;
  label: string;
  hint: string;
  icon: IconName;
}

const OPTIONS: readonly ViewOption[] = [
  { id: 'dashboard', label: STRINGS.views.dashboard, hint: STRINGS.views.dashboardHint, icon: 'grid' },
  { id: 'focus', label: STRINGS.views.focus, hint: STRINGS.views.focusHint, icon: 'cards' },
  { id: 'list', label: STRINGS.views.list, hint: STRINGS.views.listHint, icon: 'rows' },
  { id: 'split', label: STRINGS.views.split, hint: STRINGS.views.splitHint, icon: 'columns' },
];

export interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <div className="view-switch" role="group" aria-label={STRINGS.views.label}>
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className="view-switch__btn"
          aria-pressed={value === option.id}
          title={option.hint}
          onClick={() => onChange(option.id)}
        >
          <Icon name={option.icon} size={15} />
          <span className="view-switch__label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
