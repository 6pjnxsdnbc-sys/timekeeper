/**
 * TodayScreen — 오늘 화면의 배치 (설계서 5.7 · 5.8).
 * 계산은 core selector 가, 상태는 app 이 갖는다. 여기는 배치와 문구뿐이다.
 *
 * 네 가지 배치:
 *  - dashboard: 집중 보드 + 실시간 타임라인 + 에너지/추천/통계 위젯 (기본)
 *  - focus / list / split: F1 의 세 배치에 타임라인·인사이트를 덧붙인다.
 * 모바일에서는 dashboard 가 하단 3탭(오늘 / 타임라인 / 인사이트)으로 접힌다.
 */
import { useMemo, useState } from 'react';
import type { AppDataV1, Energy, Estimate, ItemId, LocalDate } from '@core/schema/current';
import {
  POLICY,
  STRINGS,
  currentEnergy,
  selectBoardView,
  selectInsight,
  type InsightView,
  type MvsView,
} from '@core';
import { EnergySwitch } from '@ui/features/energy/EnergySwitch';
import { CompletedPanel } from '@ui/features/focus-board/CompletedPanel';
import { TodayBoard } from '@ui/features/focus-board/TodayBoard';
import { InboxList } from '@ui/features/inbox/InboxList';
import { InsightsPanel } from '@ui/features/insights/InsightsPanel';
import { RecommendStrip } from '@ui/features/recommend/RecommendStrip';
import { ThemeStudio } from '@ui/features/theme/ThemeStudio';
import type { StudioState } from '@ui/features/theme/types';
import {
  TimelinePanel,
  type PendingPlacement,
  type TimelineSuggestion,
} from '@ui/features/timeline/TimelinePanel';
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

  // ── F2·F3 (없으면 계산만 하고 버튼은 숨긴다) ─────────
  nowMinute?: number;
  energy?: Energy;
  insight?: InsightView;
  onEnergy?: (level: Energy) => void;
  onStart?: (id: ItemId) => void;
  onProbe?: (id: ItemId) => void;
  onExplain?: (id: ItemId) => void;
  onMvsChange?: (id: ItemId, label: string) => void;
  onSchedule?: (id: ItemId, startMin: number) => void;
  onUnschedule?: (id: ItemId) => void;
  onWorkoutPlan?: (plan: 'full' | 'planB') => void;
  onWorkoutDone?: () => void;
  onWorkoutStart?: () => void;
  onSample?: () => void;
  onSelectTab?: (tab: 'today' | 'timeline' | 'insight') => void;
}

type SplitPane = 'inbox' | 'today' | 'done';
type MobileTab = 'today' | 'timeline' | 'insight';

function parseLocalDate(date: LocalDate): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function nowMinuteNow(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
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
  nowMinute,
  energy,
  insight: providedInsight,
  onEnergy,
  onStart,
  onProbe,
  onExplain,
  onMvsChange,
  onSchedule,
  onUnschedule,
  onWorkoutPlan,
  onWorkoutDone,
  onWorkoutStart,
  onSample,
  onSelectTab,
}: TodayScreenProps) {
  const [expanded, setExpanded] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [pane, setPane] = useState<SplitPane>('today');
  const [tab, setTab] = useState<MobileTab>('today');
  const [pending, setPending] = useState<PendingPlacement | null>(null);
  const capacity = data.settings.maxFocusCards || POLICY.maxFocusCards;
  const minute = nowMinute ?? nowMinuteNow();
  const level = energy ?? currentEnergy(data, today);

  const insight: InsightView = useMemo(
    () => providedInsight ?? selectInsight(data, today, minute, level),
    [providedInsight, data, today, minute, level],
  );

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

  const estimateFor = (id: ItemId): Estimate | undefined => insight.estimates[id];
  const mvsFor = (id: ItemId): MvsView | undefined => insight.mvs[id];

  const handleTab = (next: MobileTab) => {
    setTab(next);
    onSelectTab?.(next);
  };

  const board = (
    <TodayBoard
      view={boardView}
      variant={view === 'list' ? 'list' : 'board'}
      estimateFor={estimateFor}
      mvsFor={mvsFor}
      probeOffers={insight.probeOffers}
      onComplete={onComplete}
      onPostpone={onPostpone}
      onDemote={onDemote}
      onRemove={onRemove}
      onStart={onStart}
      onProbe={onProbe}
      onExplain={onExplain}
      onMvsChange={onMvsChange}
      onOpenCapture={onOpenCapture}
      onSample={onSample}
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

  const suggestion = useMemo<TimelineSuggestion | null>(() => {
    const rec = insight.recommendation;
    if (!rec) return null;
    const item = data.items[rec.itemId];
    const estimate = insight.estimates[rec.itemId];
    if (!item || !estimate) return null;
    if (item.placement?.date === today) return null;
    const gap = insight.timeline.untilNextBlock;
    if (gap < 5) return null;
    const startMin = Math.max(
      insight.timeline.dayStartMin,
      Math.min(insight.timeline.dayEndMin - 15, Math.ceil(minute / 15) * 15),
    );
    return {
      itemId: item.id,
      title: item.title,
      startMin,
      durationMin: Math.max(5, Math.min(estimate.correctedMin, gap)),
    };
  }, [insight, data.items, today, minute]);

  const timelinePanel = (
    <TimelinePanel
      timeline={insight.timeline}
      suggestion={suggestion}
      pending={pending}
      onPick={setPending}
      onPlace={(id, startMin) => {
        setPending(null);
        onSchedule?.(id, startMin);
      }}
      onUnschedule={(id) => onUnschedule?.(id)}
      onStart={(id) => onStart?.(id)}
    />
  );

  const insightPanel = (
    <InsightsPanel
      insight={insight}
      onWorkoutPlan={(plan) => onWorkoutPlan?.(plan)}
      onWorkoutDone={() => onWorkoutDone?.()}
      onWorkoutStart={() => onWorkoutStart?.()}
    />
  );

  const recommend = (
    <RecommendStrip
      insight={insight}
      items={data.items}
      onStart={(id) => onStart?.(id)}
      onExplain={(id) => onExplain?.(id)}
    />
  );

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
            {onEnergy ? <EnergySwitch value={level} onChange={onEnergy} /> : null}
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

      {view === 'dashboard' ? (
        <main className="main main--dash">
          <div className="dash" data-tab={tab}>
            <aside className="dash__col dash__col--inbox" aria-label={STRINGS.inbox.title}>
              {inbox}
            </aside>

            <section className="dash__col dash__col--center">
              {recommend}
              {board}
              <div className="dash__timeline">{timelinePanel}</div>
            </section>

            <aside className="dash__col dash__col--side">
              {insightPanel}
              <div className="dash__done">{done}</div>
            </aside>
          </div>

          <nav className="mobtabs" aria-label={STRINGS.shell.today}>
            {(
              [
                { id: 'today', label: STRINGS.shell.today },
                { id: 'timeline', label: STRINGS.shell.timeline },
                { id: 'insight', label: STRINGS.insight.title },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className="mobtabs__btn"
                aria-pressed={tab === item.id}
                onClick={() => handleTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </main>
      ) : null}

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

          {recommend}
          {board}

          <div className="dash__timeline">{timelinePanel}</div>

          <div className="tray">{inbox}</div>

          {insightPanel}

          <div className="tail">{done}</div>
        </main>
      ) : null}

      {view === 'list' ? (
        <main className="main main--list">
          <header className="listhead">
            <h1 className="listhead__title num">{dateLabel}</h1>
            <p className="listhead__lede">{STRINGS.app.tagline}</p>
          </header>
          {recommend}
          <div className="liststack">
            <div className="liststack__section">{board}</div>
            <div className="liststack__section">{timelinePanel}</div>
            <div className="liststack__section">{inbox}</div>
            <div className="liststack__section">{insightPanel}</div>
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
              {recommend}
              {board}
              <div className="dash__timeline">{timelinePanel}</div>
            </section>

            <section
              className="split__col split__col--done"
              data-col="done"
              data-active={pane === 'done'}
              aria-label={STRINGS.board.doneTitle}
            >
              {insightPanel}
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
