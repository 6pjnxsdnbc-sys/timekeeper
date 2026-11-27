/**
 * TodayScreen — 오늘 화면의 배치 (설계서 5.7 · 5.8).
 * 계산은 core selector 가, 상태는 app 이 갖는다. 여기는 배치와 문구뿐이다.
 *
 * 세 가지 배치: 집중 카드(focus) · 컴팩트 리스트(list) · 스플릿 보드(split).
 * 같은 데이터·같은 컴포넌트를 다른 골격에 놓을 뿐이다.
 */
import { useMemo, useState } from 'react';
import type { AppDataV1, ItemId, LocalDate } from '@core/schema/current';
import { POLICY, STRINGS, selectBoardView } from '@core';
import { CompletedPanel } from '@ui/features/focus-board/CompletedPanel';
import { TodayBoard } from '@ui/features/focus-board/TodayBoard';
import { InboxList } from '@ui/features/inbox/InboxList';
import { ThemeStudio } from '@ui/features/theme/ThemeStudio';
import type { StudioState } from '@ui/features/theme/types';
import { ViewSwitcher, type ViewMode } from '@ui/features/views/ViewSwitcher';
import { Icon } from '@ui/primitives/Icon';
import './TodayScreen.css';

export interface TodayScreenProps {
  data: AppDataV1;
  today: LocalDate;
  studio: StudioState;
  view: ViewMode;
  onStudioChange: (patch: Partial<StudioState>) => void;
  onStudioReset: () => void;
  onViewChange: (mode: ViewMode) => void;
  onOpenCapture: () => void;
  onPromote: (id: ItemId) => void;
  onDemote: (id: ItemId) => void;
  onComplete: (id: ItemId) => void;
  onPostpone: (id: ItemId) => void;
  onRemove: (id: ItemId) => void;
  schemaVersion: number;
  appVersion: string;
}

type SplitPane = 'inbox' | 'today' | 'done';

function parseLocalDate(date: LocalDate): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function TodayScreen({
  data,
  today,
  studio,
  view,
  onStudioChange,
  onStudioReset,
  onViewChange,
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
  const [studioOpen, setStudioOpen] = useState(false);
  const [pane, setPane] = useState<SplitPane>('today');
  const capacity = data.settings.maxFocusCards || POLICY.maxFocusCards;

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(
        parseLocalDate(today),
      ),
    [today],
  );

  const boardView = useMemo(
    () =>
      selectBoardView(data, today, {
        capacity,
        inboxLimit: expanded ? 500 : POLICY.inboxVisibleLimit,
      }),
    [data, today, capacity, expanded],
  );

  const inboxTotal = boardView.candidates.length + boardView.hiddenCandidateCount;

  const board = (
    <TodayBoard
      view={boardView}
      variant={view === 'list' ? 'list' : 'board'}
      onComplete={onComplete}
      onPostpone={onPostpone}
      onDemote={onDemote}
      onRemove={onRemove}
      onOpenCapture={onOpenCapture}
    />
  );

  const inbox = (
    <InboxList
      view={boardView}
      expanded={expanded}
      onToggleMore={() => setExpanded((value) => !value)}
      onPromote={onPromote}
    />
  );

  const done = <CompletedPanel items={boardView.completed} />;

  return (
    <div className="shell" data-view={view}>
      <header className="top">
        <div className="top__inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true" />
            <span className="brand__text">
              <span className="brand__name">{STRINGS.app.name}</span>
              <span className="brand__date num">{dateLabel}</span>
            </span>
          </div>

          <div className="top__tools">
            <ViewSwitcher value={view} onChange={onViewChange} />
            <button type="button" className="top__capture" onClick={onOpenCapture}>
              <Icon name="plus" size={15} />
              <span className="top__capture-label">{STRINGS.capture.open}</span>
              <kbd className="top__kbd">{STRINGS.shell.captureShortcut}</kbd>
            </button>
            <button
              type="button"
              className="top__icon"
              onClick={() => setStudioOpen(true)}
              aria-label={STRINGS.studio.open}
              title={STRINGS.studio.open}
            >
              <Icon name="contrast" size={17} />
            </button>
          </div>
        </div>
      </header>

      {view === 'focus' ? (
        <main className="main main--focus">
          <section className="hero">
            <p className="hero__eyebrow">
              <span className="hero__pulse" aria-hidden="true" />
              {STRINGS.shell.today}
            </p>
            <h1 className="hero__title num">{dateLabel}</h1>
            <p className="hero__lede">{STRINGS.app.tagline}</p>
            <div className="hero__stats">
              <span className="stat">
                <span className="stat__value num">{`${boardView.cards.length}/${capacity}`}</span>
                <span className="stat__label">{STRINGS.board.statCards}</span>
              </span>
              <span className="stat">
                <span className="stat__value num">{boardView.completed.length}</span>
                <span className="stat__label">{STRINGS.board.statDone}</span>
              </span>
              <span className="stat">
                <span className="stat__value num">{inboxTotal}</span>
                <span className="stat__label">{STRINGS.board.statInbox}</span>
              </span>
            </div>
          </section>

          {board}

          <div className="tray">{inbox}</div>

          <div className="tail">{done}</div>
        </main>
      ) : null}

      {view === 'list' ? (
        <main className="main main--list">
          <header className="listhead">
            <h1 className="listhead__title num">{dateLabel}</h1>
            <p className="listhead__lede">{STRINGS.app.tagline}</p>
          </header>
          <div className="liststack">
            <div className="liststack__section">{board}</div>
            <div className="liststack__section">{inbox}</div>
            <div className="liststack__section">{done}</div>
          </div>
        </main>
      ) : null}

      {view === 'split' ? (
        <main className="main main--split">
          <div className="segments" role="group" aria-label={STRINGS.views.label}>
            {(
              [
                { id: 'inbox', label: STRINGS.views.paneInbox },
                { id: 'today', label: STRINGS.views.paneToday },
                { id: 'done', label: STRINGS.views.paneDone },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className="segments__btn"
                aria-pressed={pane === item.id}
                onClick={() => setPane(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="split" data-pane={pane}>
            <section
              className="split__col split__col--inbox"
              data-col="inbox"
              data-active={pane === 'inbox'}
              aria-label={STRINGS.inbox.title}
            >
              {inbox}
            </section>

            <section
              className="split__col split__col--today"
              data-col="today"
              data-active={pane === 'today'}
              aria-label={STRINGS.board.title}
            >
              {board}
            </section>

            <section
              className="split__col split__col--done"
              data-col="done"
              data-active={pane === 'done'}
              aria-label={STRINGS.board.doneTitle}
            >
              {done}
            </section>
          </div>
        </main>
      ) : null}

      <footer className="foot">
        <span className="num">{`${STRINGS.shell.footerSchema} v${schemaVersion}`}</span>
        <span aria-hidden="true">·</span>
        <span className="num">{`${STRINGS.shell.footerBuild} ${appVersion}`}</span>
      </footer>

      <button type="button" className="fab" onClick={onOpenCapture} aria-label={STRINGS.capture.open}>
        <Icon name="plus" size={20} />
      </button>

      <ThemeStudio
        open={studioOpen}
        state={studio}
        onChange={onStudioChange}
        onReset={onStudioReset}
        onClose={() => setStudioOpen(false)}
      />
    </div>
  );
}
