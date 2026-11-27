/**
 * 테마·화면 공급자 — 스튜디오 상태를 들고, 토큰만 교체한다.
 * 화면은 색을 모르고 값만 올린다. 적용은 useLayoutEffect 라 첫 페인트 전에 끝난다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ThemeId, ThemeModeName, ThemePreset } from '@tokens/themes';
import { themeById } from '@tokens/themes';
import type { ThemeStudio } from './themeStudio';
import { applyStudio, defaultStudio, readStudio, saveStudio } from './themeStudio';
import type { ViewMode } from './viewMode';
import { readViewMode, saveViewMode } from './viewMode';

/** 예전 이름 호환 — 화면은 해석된 밝기만 알면 된다. */
export type ResolvedTheme = ThemeModeName;
export type ThemeMode = ThemeModeName;

interface DisplayContextValue {
  studio: ThemeStudio;
  preset: ThemePreset;
  mode: ThemeModeName;
  setStudio: (patch: Partial<ThemeStudio>) => void;
  setTheme: (id: ThemeId) => void;
  resetStudio: () => void;
  view: ViewMode;
  setView: (mode: ViewMode) => void;
}

const DisplayContext = createContext<DisplayContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [studio, setStudioState] = useState<ThemeStudio>(readStudio);
  const [view, setViewState] = useState<ViewMode>(readViewMode);

  // 첫 페인트 전에 토큰을 심는다 — 새로고침해도 깜빡임이 없다.
  useLayoutEffect(() => {
    applyStudio(studio);
    saveStudio(studio);
  }, [studio]);

  const setStudio = useCallback((patch: Partial<ThemeStudio>) => {
    setStudioState((previous) => ({ ...previous, ...patch }));
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setStudioState((previous) => ({ ...previous, themeId: id }));
  }, []);

  const resetStudio = useCallback(() => {
    setStudioState(defaultStudio());
  }, []);

  const setView = useCallback((mode: ViewMode) => {
    setViewState(mode);
    saveViewMode(mode);
  }, []);

  const preset = themeById(studio.themeId);
  const value = useMemo<DisplayContextValue>(
    () => ({
      studio,
      preset,
      mode: preset.mode,
      setStudio,
      setTheme,
      resetStudio,
      view,
      setView,
    }),
    [studio, preset, setStudio, setTheme, resetStudio, view, setView],
  );

  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>;
}

export function useTheme(): DisplayContextValue {
  const value = useContext(DisplayContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
