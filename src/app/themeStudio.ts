/**
 * themeStudio — 화면·테마 스튜디오의 상태·저장·적용.
 *
 * 색과 스케일의 값은 tokens/themes.ts 에만 있고, 여기서는
 *  ① localStorage 에서 읽고  ② documentElement 의 CSS 변수로 심는다.
 * 두 가지만 한다. React 상태는 providers 가 갖는다.
 */
import type { ThemePalette } from '@tokens/themes';
import type { StudioState } from '@ui';
import {
  DENSITY_OPTIONS,
  DEFAULT_LIGHT_THEME_ID,
  DEFAULT_THEME_ID,
  RADIUS_OPTIONS,
  SURFACE_OPTIONS,
  TYPOGRAPHY_OPTIONS,
  isThemeId,
  paletteVars,
  readableOn,
  themeById,
} from '@tokens/themes';

export const STUDIO_STORAGE_KEY = 'timekeeper.studio';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** 스튜디오 상태는 ui 가 정의한 모양과 같다 (단일 정의). */
export type ThemeStudio = StudioState;

export const DEFAULT_STUDIO: ThemeStudio = {
  themeId: DEFAULT_THEME_ID,
  accent: null,
  surface: 'elevated',
  radius: 'smooth',
  typography: 'clean',
  density: 'balanced',
};

const SURFACE_IDS = SURFACE_OPTIONS.map((option) => option.id);
const RADIUS_IDS = RADIUS_OPTIONS.map((option) => option.id);
const TYPOGRAPHY_IDS = TYPOGRAPHY_OPTIONS.map((option) => option.id);
const DENSITY_IDS = DENSITY_OPTIONS.map((option) => option.id);

function pickOption<T extends string>(value: unknown, ids: readonly T[], fallback: T): T {
  return typeof value === 'string' && (ids as readonly string[]).includes(value) ? (value as T) : fallback;
}

function prefersLight(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches;
  } catch {
    return false;
  }
}

/** 첫 방문이면 시스템 밝기에 맞는 프리셋으로 시작한다. */
export function defaultStudio(): ThemeStudio {
  return { ...DEFAULT_STUDIO, themeId: prefersLight() ? DEFAULT_LIGHT_THEME_ID : DEFAULT_THEME_ID };
}

export function readStudio(): ThemeStudio {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STUDIO_STORAGE_KEY);
  } catch {
    return defaultStudio();
  }
  if (!raw) return defaultStudio();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultStudio();
    const stored = parsed as Partial<Record<keyof ThemeStudio, unknown>>;
    return {
      themeId: isThemeId(stored.themeId) ? stored.themeId : DEFAULT_STUDIO.themeId,
      accent: typeof stored.accent === 'string' && HEX_COLOR.test(stored.accent) ? stored.accent : null,
      surface: pickOption(stored.surface, SURFACE_IDS, DEFAULT_STUDIO.surface),
      radius: pickOption(stored.radius, RADIUS_IDS, DEFAULT_STUDIO.radius),
      typography: pickOption(stored.typography, TYPOGRAPHY_IDS, DEFAULT_STUDIO.typography),
      density: pickOption(stored.density, DENSITY_IDS, DEFAULT_STUDIO.density),
    };
  } catch {
    return defaultStudio();
  }
}

export function saveStudio(studio: ThemeStudio): void {
  try {
    // mode 는 themeId 에서 나온 값이지만, 첫 페인트 전 index.html 이 읽어야 해서 함께 둔다.
    const payload = { ...studio, mode: themeById(studio.themeId).mode };
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // 저장소가 막혀도 이번 세션 동안은 동작한다.
  }
}

function writeVars(root: HTMLElement, vars: Readonly<Record<string, string>>): void {
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
}

/** 팔레트 + 액센트 + 스케일을 한 번에 심는다. */
export function applyStudio(studio: ThemeStudio, root: HTMLElement = document.documentElement): void {
  const preset = themeById(studio.themeId);
  const palette: ThemePalette = preset.palette;

  root.dataset.theme = preset.mode;
  root.dataset.themeId = preset.id;
  root.dataset.surface = studio.surface;
  root.dataset.radius = studio.radius;
  root.dataset.typography = studio.typography;
  root.dataset.density = studio.density;

  writeVars(root, paletteVars(palette));

  const accent = studio.accent ?? palette.accent;
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-contrast', readableOn(accent));

  writeVars(root, SURFACE_OPTIONS.find((option) => option.id === studio.surface)?.vars ?? {});
  writeVars(root, RADIUS_OPTIONS.find((option) => option.id === studio.radius)?.vars ?? {});
  writeVars(
    root,
    TYPOGRAPHY_OPTIONS.find((option) => option.id === studio.typography)?.vars ?? {},
  );
  writeVars(root, DENSITY_OPTIONS.find((option) => option.id === studio.density)?.vars ?? {});

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', palette.bg);
}
