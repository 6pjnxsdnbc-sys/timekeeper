/**
 * 테마 공급자 — 토큰 교체만 한다. 화면은 mode 를 모르고 resolved 만 그린다.
 * 저장은 localStorage 한 줄(첫 페인트 전 부트스트랩과 같은 키) 이다.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Settings } from '@core/schema/current';

export type ThemeMode = Settings['theme'];
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'timekeeper.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'dark' || value === 'light';
}

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia(DARK_QUERY).matches;
}

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode);
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved: ResolvedTheme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.themeMode = mode;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // 저장소가 막혀 있어도 테마는 이번 세션 동안 동작한다.
    }
  }, [mode, resolved]);

  const setModeStable = useCallback((next: ThemeMode) => setMode(next), []);
  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode: setModeStable }),
    [mode, resolved, setModeStable],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>');
  return value;
}
