/**
 * TodayScreen — F0의 최소 셸.
 * 오늘 날짜 · 카드 예산 3칸 · 빈 상태 · 테마 토글. 데이터 입력은 F1.
 */
import { STRINGS } from '@core/content/strings.ko';
import { Card } from '@ui/primitives/Card';
import { Chip } from '@ui/primitives/Chip';
import { EmptyState } from '@ui/patterns/EmptyState';
import { ThemeToggle, type ThemeMode } from '@ui/features/theme/ThemeToggle';
import './TodayScreen.css';

export interface TodayScreenProps {
  dateLabel: string;
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  schemaVersion: number;
  appVersion: string;
  /** 카드 예산 — 정책·설정에서 온 값. 화면은 숫자를 만들지 않는다. */
  maxFocusCards: number;
}

export function TodayScreen({
  dateLabel,
  theme,
  onThemeChange,
  schemaVersion,
  appVersion,
  maxFocusCards,
}: TodayScreenProps) {
  const slots = Array.from({ length: maxFocusCards }, (_, i) => i + 1);
  return (
    <div className="shell">
      <header className="shell__top">
        <div className="shell__brand">
          <span className="shell__name">{STRINGS.app.name}</span>
          <Chip>{`${STRINGS.shell.footerSchema} v${schemaVersion}`}</Chip>
        </div>
        <ThemeToggle value={theme} onChange={onThemeChange} label={STRINGS.shell.themeLabel} />
      </header>

      <main className="shell__main">
        <h1 className="today__date num">{dateLabel}</h1>
        <p className="today__lede">{STRINGS.app.tagline}</p>

        <Card className="today__empty" label={STRINGS.shell.today}>
          <EmptyState
            title={STRINGS.shell.emptyBoardTitle}
            body={STRINGS.shell.emptyBoardBody}
            hint={STRINGS.capture.hint}
          />
        </Card>

        <ul className="today__slots" aria-label="오늘 카드 자리">
          {slots.map((n) => (
            <li key={n}>
              <Card tone="ghost" className="today__slot">
                <span className="num">{n}</span>
              </Card>
            </li>
          ))}
        </ul>
      </main>

      <footer className="shell__foot">
        <span className="num">{`${STRINGS.shell.footerBuild} ${appVersion}`}</span>
        <span aria-hidden="true">·</span>
        <span>v1.2 설계 기준</span>
      </footer>
    </div>
  );
}
