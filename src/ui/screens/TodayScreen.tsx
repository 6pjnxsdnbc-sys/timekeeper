/**
 * TodayScreen — 오늘 화면의 배치 (설계서 5.7 · 5.8).
 * 계산은 core selector 가, 상태는 app 이 갖는다. 여기는 배치와 문구뿐이다.
 */
import { useMemo, useState } from 'react';
import type { AppDataV1, ItemId, LocalDate } from '@core/schema/current';
import { POLICY, STRINGS, selectBoardView } from '@core';
import { CompletedPanel } from '@ui/features/focus-board/CompletedPanel';
import { TodayBoard } from '@ui/features/focus-board/TodayBoard';
import { InboxList } from '@ui/features/inbox/InboxList';
import { ThemeToggle, type ThemeMode } from '@ui/features/theme/ThemeToggle';
import './TodayScreen.css';

export interface TodayScreenProps {
  data: AppDataV1;
  today: LocalDate;
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onOpenCapture: () => void;
  onPromote: (id: ItemId) => void;
  onDemote: (id: ItemId) => void;
  onComplete: (id: ItemId) => void;
  onPostpone: (id: ItemId) => void;
  onRemove: (id: ItemId) => void;
  schemaVersion: number;
  appVersion: string;
}

function parseLocalDate(date: LocalDate): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function TodayScreen({
  data,
  today,
  theme,
  onThemeChange,
  onOpenCapture,
  onPromote,
  onDemote,
  onComplete,
  onPostpone,
  onRemove,
  schemaVersion,
  appVersion,
}: TodayScreenProps) {
  const [expanded, setExpanded] = useState(false);
  const capacity = data.settings.maxFocusCards || POLICY.maxFocusCards;

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(
        parseLocalDate(today),
      ),
    [today],
  );

  const view = useMemo(
    () =>
      selectBoardView(data, today, {
        capacity,
        inboxLimit: expanded ? 500 : POLICY.inboxVisibleLimit,
      }),
    [data, today, capacity, expanded],
  );

  return (
    <div className="shell">
      <header className="shell__top">
        <div className="shell__brand">
          <span className="shell__name">{STRINGS.app.name}</span>
          <span className="shell__dot" aria-hidden="true">
            ·
          </span>
          <span className="shell__date num">{dateLabel}</span>
        </div>
        <div className="shell__tools">
          <button type="button" className="shell__capture" onClick={onOpenCapture}>
            <span className="shell__capture-plus" aria-hidden="true">
              +
            </span>
            <span className="shell__capture-label">{STRINGS.capture.open}</span>
            <kbd className="shell__kbd">{STRINGS.shell.captureShortcut}</kbd>
          </button>
          <ThemeToggle value={theme} onChange={onThemeChange} label={STRINGS.shell.themeLabel} />
        </div>
      </header>

      <main className="shell__main">
        <section className="shell__board" aria-label={STRINGS.shell.today}>
          <h1 className="today__date num">{dateLabel}</h1>
          <p className="today__lede">{STRINGS.app.tagline}</p>
          <TodayBoard
            view={view}
            onComplete={onComplete}
            onPostpone={onPostpone}
            onDemote={onDemote}
            onRemove={onRemove}
            onOpenCapture={onOpenCapture}
          />
        </section>

        <aside className="shell__inbox">
          <InboxList
            view={view}
            expanded={expanded}
            onToggleMore={() => setExpanded((value) => !value)}
            onPromote={onPromote}
          />
        </aside>

        <aside className="shell__done">
          <CompletedPanel items={view.completed} />
        </aside>
      </main>

      <footer className="shell__foot">
        <span className="num">{`${STRINGS.shell.footerSchema} v${schemaVersion}`}</span>
        <span aria-hidden="true">·</span>
        <span className="num">{`${STRINGS.shell.footerBuild} ${appVersion}`}</span>
      </footer>

      <button type="button" className="shell__fab" onClick={onOpenCapture} aria-label={STRINGS.capture.open}>
        +
      </button>
    </div>
  );
}
