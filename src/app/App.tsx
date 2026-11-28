/**
 * App — 조립만 한다 (설계서 2.1). store·화면 설정·단축키·토스트를 화면에 연결한다.
 *
 * F2·F3: 에너지 스위치 · 집중 타이머 · 5분 재보기 · 타임라인 배치 · 운동 플랜 B.
 * 계산은 전부 core 에서 끝나고, 여기서는 "무엇을 눌렀을 때 어떤 명령을 보내는가"만 정한다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Energy, ItemId } from '@core/schema/current';
import { SCHEMA_VERSION } from '@core/schema/current';
import {
  POLICY,
  STRINGS,
  currentEnergy,
  recommendationContext,
  selectInsight,
  suggestSplit,
} from '@core';
import { DEFAULT_DATA_KEY, createPersistedStore } from '@sync';
import {
  ExplainSheet,
  FocusOverlay,
  ProbeOverlay,
  QuickCapture,
  Toast,
  TodayScreen,
  type ViewMode,
} from '@ui';
import { APP_VERSION } from '@app/version';
import { useTheme } from '@app/providers';
import { useRoute } from '@app/routes';
import { createAppStore } from '@app/store';
import { browserKeyValue } from '@app/storage';
import { useAppStore } from '@app/useAppStore';

interface ToastState {
  id: number;
  message: string;
  undoable: boolean;
}

function currentMinute(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function App() {
  const { studio, setStudio, resetStudio, view, setView } = useTheme();
  const route = useRoute();
  const store = useMemo(
    () => createAppStore({ storage: createPersistedStore(browserKeyValue()) }),
    [],
  );
  const { data, today } = useAppStore(store);

  const [captureOpen, setCaptureOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [explainId, setExplainId] = useState<ItemId | null>(null);
  const [minute, setMinute] = useState(currentMinute);
  const toastSeq = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setMinute(currentMinute()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const showToast = useCallback((message: string, undoable: boolean) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message, undoable });
  }, []);

  const energy = currentEnergy(data, today);
  const insight = useMemo(() => selectInsight(data, today, minute, energy), [data, today, minute, energy]);

  const handleUndo = useCallback(() => {
    store.undo();
    setToast(null);
  }, [store]);

  const handleCapture = useCallback(
    (text: string) => {
      const result = store.capture(text);
      setCaptureOpen(false);
      if (!result.ok) return;
      showToast(
        result.reason === 'full' ? STRINGS.toast.savedToInbox : STRINGS.toast.saved,
        result.undoable,
      );
    },
    [store, showToast],
  );

  const runCommand = useCallback(
    (command: (id: ItemId) => { ok: boolean; undoable: boolean; reason?: string }, message: string) =>
      (id: ItemId) => {
        const result = command(id);
        if (result.ok) showToast(message, result.undoable);
        else if (result.reason === 'full') showToast(STRINGS.toast.full, false);
      },
    [showToast],
  );

  const onComplete = useMemo(
    () => runCommand((id) => store.complete(id), STRINGS.toast.completed),
    [runCommand, store],
  );
  const onPostpone = useMemo(
    () => runCommand((id) => store.postpone(id), STRINGS.toast.postponed),
    [runCommand, store],
  );
  const onDemote = useMemo(
    () => runCommand((id) => store.demote(id), STRINGS.toast.demoted),
    [runCommand, store],
  );
  const onRemove = useMemo(
    () => runCommand((id) => store.remove(id), STRINGS.toast.removed),
    [runCommand, store],
  );
  const onPromote = useCallback(
    (id: ItemId) => {
      const result = store.promote(id);
      if (!result.ok && result.reason === 'full') showToast(STRINGS.toast.full, false);
    },
    [store, showToast],
  );

  // ── F2: 집중·재보기·에너지·배치 ────────────────────
  const handleStart = useCallback(
    (id: ItemId) => {
      const item = store.getState().items[id];
      if (!item) return;
      const minutes = Math.min(
        POLICY.starterTimerMin * 3,
        Math.max(POLICY.starterTimerMin, Math.min(25, item.estimateMin)),
      );
      const result = store.startFocus(id, minutes);
      if (!result.ok && result.reason === 'session-busy') {
        showToast(STRINGS.toast.sessionBusy, false);
      }
    },
    [store, showToast],
  );

  const handleProbe = useCallback(
    (id: ItemId) => {
      const result = store.startProbe(id);
      if (!result.ok && result.reason === 'session-busy') {
        showToast(STRINGS.toast.sessionBusy, false);
      }
    },
    [store, showToast],
  );

  const handleEnergy = useCallback(
    (level: Energy) => {
      store.setEnergy(level);
    },
    [store],
  );

  const handleMvs = useCallback(
    (id: ItemId, label: string) => {
      store.setMvs(id, label);
    },
    [store],
  );

  const handleSchedule = useCallback(
    (id: ItemId, startMin: number) => {
      const result = store.schedule(id, startMin);
      if (result.ok) showToast(STRINGS.toast.scheduled, true);
    },
    [store, showToast],
  );

  const handleUnschedule = useCallback(
    (id: ItemId) => {
      const result = store.unschedule(id);
      if (result.ok) showToast(STRINGS.toast.unscheduled, true);
    },
    [store, showToast],
  );

  const handleSample = useCallback(() => {
    const result = store.loadSample();
    if (result.ok) showToast(STRINGS.sample.done, true);
    else if (result.reason === 'not-empty') showToast(STRINGS.sample.notEmpty, false);
  }, [store, showToast]);

  const handleWorkoutPlan = useCallback(
    (plan: 'full' | 'planB') => {
      const existing = insight.workout.item;
      if (existing) {
        store.setWorkoutPlan(existing.id, plan);
        return;
      }
      const created = store.ensureWorkout();
      if (!created.ok) return;
      const item = Object.values(store.getState().items).find(
        (candidate) => candidate.kind === 'workout' && candidate.status !== 'done',
      );
      if (item) store.setWorkoutPlan(item.id, plan);
    },
    [insight.workout.item, store],
  );

  const handleWorkoutDone = useCallback(() => {
    const item = insight.workout.item;
    if (!item) return;
    const minutes =
      insight.workout.plan === 'planB' || item.kind !== 'workout'
        ? POLICY.workoutMinimum.minutes
        : item.plannedMinutes;
    const result = store.completeWorkout(item.id, minutes);
    if (result.ok) showToast(STRINGS.toast.workoutDone, true);
  }, [insight.workout.item, insight.workout.plan, store, showToast]);

  const handleWorkoutStart = useCallback(() => {
    const item = insight.workout.item;
    if (item) handleStart(item.id);
  }, [insight.workout.item, handleStart]);

  const focusSession = data.focusSession;
  const focusItem = focusSession ? data.items[focusSession.itemId] : undefined;
  const focusEstimate = focusSession ? insight.estimates[focusSession.itemId] : undefined;
  const focusMvs = focusSession ? insight.mvs[focusSession.itemId]?.label : undefined;

  const handleFocusComplete = useCallback(() => {
    const result = store.completeFocus();
    if (result.ok) showToast(STRINGS.toast.completed, true);
  }, [store, showToast]);

  const handleFocusStarted = useCallback(() => {
    if (!focusSession) return;
    const result = store.markStarted(focusSession.itemId);
    if (result.ok) showToast(STRINGS.toast.started, true);
  }, [focusSession, store, showToast]);

  const handleFocusLeave = useCallback(() => {
    const result = store.abandonFocus();
    if (result.ok) showToast(STRINGS.toast.leftFocus, true);
  }, [store, showToast]);

  const probeSplit = useMemo(() => {
    if (!focusSession || focusSession.mode !== 'probe' || !focusItem) return null;
    const input = recommendationContext(data, today, minute, energy, insight.model, insight.timeline);
    return suggestSplit(focusItem, insight.timeline.untilNextBlock, input);
  }, [data, today, minute, energy, insight.model, insight.timeline, focusSession, focusItem]);

  const handleProbeVerdict = useCallback(
    (verdict: 'kept' | 'bigger', revisedMin?: number) => {
      if (!focusSession) return;
      const actualMin = Math.max(
        0,
        Math.round((Date.now() - Date.parse(focusSession.startedAt)) / 60_000),
      );
      const result = store.applyProbe(focusSession.itemId, verdict, revisedMin, actualMin);
      if (result.ok) {
        showToast(
          verdict === 'kept' ? STRINGS.toast.probeKept : STRINGS.toast.probeBigger,
          true,
        );
      }
    },
    [focusSession, store, showToast],
  );

  const handleProbeDismiss = useCallback(() => {
    if (focusSession) store.dismissProbe(focusSession.itemId);
  }, [focusSession, store]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCaptureOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => store.syncDay(), 60_000);
    return () => clearInterval(timer);
  }, [store]);

  // 같은 브라우저의 다른 탭이 저장하면 다시 읽는다 — 오래된 탭이 덮어쓰지 않게.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === DEFAULT_DATA_KEY || event.key === null) store.reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [store]);

  if (route !== 'today') return null;

  const explainItem = explainId ? data.items[explainId] : undefined;
  const explainBreakdown = explainId ? (insight.scores[explainId] ?? null) : null;
  const explainEstimate = explainId ? (insight.estimates[explainId] ?? null) : null;

  return (
    <>
      <TodayScreen
        data={data}
        today={today}
        studio={studio}
        view={view as ViewMode}
        onStudioChange={setStudio}
        onStudioReset={resetStudio}
        onViewChange={setView}
        onOpenCapture={() => setCaptureOpen(true)}
        onPromote={onPromote}
        onDemote={onDemote}
        onComplete={onComplete}
        onPostpone={onPostpone}
        onRemove={onRemove}
        schemaVersion={SCHEMA_VERSION}
        appVersion={APP_VERSION}
        nowMinute={minute}
        energy={energy}
        insight={insight}
        onEnergy={handleEnergy}
        onStart={handleStart}
        onProbe={handleProbe}
        onExplain={(id) => setExplainId(id)}
        onMvsChange={handleMvs}
        onSchedule={handleSchedule}
        onUnschedule={handleUnschedule}
        onWorkoutPlan={handleWorkoutPlan}
        onWorkoutDone={handleWorkoutDone}
        onWorkoutStart={handleWorkoutStart}
        onSample={handleSample}
      />

      <QuickCapture
        open={captureOpen}
        today={today}
        contexts={data.contexts}
        onClose={() => setCaptureOpen(false)}
        onSubmit={handleCapture}
      />

      <ExplainSheet
        open={Boolean(explainId)}
        item={explainItem ?? null}
        breakdown={explainBreakdown}
        estimate={explainEstimate}
        onClose={() => setExplainId(null)}
      />

      {focusSession && focusItem && focusSession.mode === 'focus' ? (
        <FocusOverlay
          session={focusSession}
          item={focusItem}
          mvs={focusMvs}
          estimate={focusEstimate}
          onComplete={handleFocusComplete}
          onStarted={handleFocusStarted}
          onLeave={handleFocusLeave}
          onPause={() => store.pauseFocus()}
          onResume={() => store.resumeFocus()}
          onExtend={(minutes) => store.extendFocus(minutes)}
        />
      ) : null}

      {focusSession && focusItem && focusSession.mode === 'probe' ? (
        <ProbeOverlay
          session={focusSession}
          item={focusItem}
          estimate={focusEstimate ?? { plannedMin: focusItem.estimateMin, correctedMin: focusItem.estimateMin, lo: focusItem.estimateMin, hi: focusItem.estimateMin, u: 0.6, cellN: 0, factor: 1 }}
          split={probeSplit ? { chunks: probeSplit.chunks, chunkMin: probeSplit.chunkMin } : null}
          onVerdict={handleProbeVerdict}
          onDismiss={handleProbeDismiss}
        />
      ) : null}

      {toast ? (
        <Toast
          key={toast.id}
          message={toast.message}
          actionLabel={toast.undoable ? STRINGS.toast.undo : undefined}
          onAction={toast.undoable ? handleUndo : undefined}
          onDismiss={() => setToast(null)}
          durationMs={toast.undoable ? 8000 : 2500}
        />
      ) : null}
    </>
  );
}
