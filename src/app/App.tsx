/**
 * App — 조립만 한다 (설계서 2.1). store·테마·단축키·토스트를 화면에 연결한다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ItemId } from '@core/schema/current';
import { SCHEMA_VERSION } from '@core/schema/current';
import { STRINGS } from '@core/content/strings.ko';
import { DEFAULT_DATA_KEY, createPersistedStore } from '@sync';
import { QuickCapture, Toast, TodayScreen } from '@ui';
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

export function App() {
  const { mode, setMode } = useTheme();
  const route = useRoute();
  const store = useMemo(
    () => createAppStore({ storage: createPersistedStore(browserKeyValue()) }),
    [],
  );
  const { data, today } = useAppStore(store);

  const [captureOpen, setCaptureOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastSeq = useRef(0);

  const showToast = useCallback((message: string, undoable: boolean) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message, undoable });
  }, []);

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

  return (
    <>
      <TodayScreen
        data={data}
        today={today}
        theme={mode}
        onThemeChange={setMode}
        onOpenCapture={() => setCaptureOpen(true)}
        onPromote={onPromote}
        onDemote={onDemote}
        onComplete={onComplete}
        onPostpone={onPostpone}
        onRemove={onRemove}
        schemaVersion={SCHEMA_VERSION}
        appVersion={APP_VERSION}
      />

      <QuickCapture
        open={captureOpen}
        today={today}
        contexts={data.contexts}
        onClose={() => setCaptureOpen(false)}
        onSubmit={handleCapture}
      />

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
