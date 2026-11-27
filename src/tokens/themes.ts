/**
 * themes — 큐레이션 프리셋 6종과 커스터마이징 스케일의 유일한 정의처.
 *
 * 이 파일은 값만 갖는다 (계산·DOM 없음). 실제 적용은 app 이
 * `document.documentElement.style` 에 CSS 변수로 심는다 — 컴포넌트는 여전히
 * semantic 변수만 참조하므로 테마 전환은 "토큰 교체" 하나로 끝난다.
 *
 * 색 리터럴이 TS 에 있는 것은 의도다: tokens 레이어 밖(.css)에는 색이 없다.
 */

export type ThemeModeName = 'dark' | 'light';

export type ThemeId =
  | 'midnight-slate'
  | 'warm-espresso'
  | 'forest-moss'
  | 'nordic-paper'
  | 'soft-mist'
  | 'obsidian-mono';

export type SurfaceStyleId = 'flat' | 'elevated' | 'glass';
export type RadiusId = 'sharp' | 'smooth' | 'round';
export type TypographyId = 'clean' | 'editorial' | 'mono';
export type DensityId = 'relaxed' | 'balanced' | 'compact';

/**
 * semantic 색 한 벌. 키 이름은 CSS 변수 이름과 1:1 이다 (camelCase → kebab).
 * 파생색(--accent-weak 등)은 component.css 의 color-mix 가 만든다.
 */
export interface ThemePalette {
  bg: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  surfaceHover: string;
  borderSubtle: string;
  border: string;
  borderStrong: string;
  text1: string;
  text2: string;
  text3: string;
  textInverse: string;
  accent: string;
  done: string;
  held: string;
  danger: string;
  /** 페이지 상단의 은은한 빛무리 */
  glow: string;
  scrim: string;
  /** 그림자 색 (알파 포함) */
  shadowColor: string;
  /** Glass 표면의 상단 하이라이트 */
  highlightColor: string;
}

export interface ThemePreset {
  id: ThemeId;
  /** 스튜디오 카드에 크게 쓰는 이름 */
  name: string;
  /** 한 줄 설명 — 색의 방향 */
  mood: string;
  mode: ThemeModeName;
  palette: ThemePalette;
}

export const THEMES: readonly ThemePreset[] = [
  {
    id: 'midnight-slate',
    name: 'Midnight Slate',
    mood: '딥 슬레이트 네이비 · 아이스 블루',
    mode: 'dark',
    palette: {
      bg: '#0b1017',
      surface: '#121a24',
      surfaceRaised: '#18222e',
      surfaceSunken: '#0d141d',
      surfaceHover: '#16202b',
      borderSubtle: '#1a2431',
      border: '#223041',
      borderStrong: '#31445a',
      text1: '#e8eef6',
      text2: '#9aabbf',
      text3: '#71839a',
      textInverse: '#0b1017',
      accent: '#7cc4ff',
      done: '#4fd1a5',
      held: '#e3b264',
      danger: '#ff7b72',
      glow: 'rgba(90, 150, 255, 0.16)',
      scrim: 'rgba(4, 8, 14, 0.66)',
      shadowColor: 'rgba(0, 0, 0, 0.55)',
      highlightColor: 'rgba(255, 255, 255, 0.08)',
    },
  },
  {
    id: 'warm-espresso',
    name: 'Warm Espresso',
    mood: '다크 에스프레소 · 웜 앰버',
    mode: 'dark',
    palette: {
      bg: '#14100d',
      surface: '#1b1611',
      surfaceRaised: '#241d16',
      surfaceSunken: '#100c0a',
      surfaceHover: '#221b15',
      borderSubtle: '#2a221a',
      border: '#372c21',
      borderStrong: '#4c3c2c',
      text1: '#f2e9dd',
      text2: '#b3a290',
      text3: '#8f7e6c',
      textInverse: '#14100d',
      accent: '#e9a25a',
      done: '#8fbd6f',
      held: '#d9b46a',
      danger: '#e2705f',
      glow: 'rgba(233, 162, 90, 0.14)',
      scrim: 'rgba(12, 8, 5, 0.68)',
      shadowColor: 'rgba(0, 0, 0, 0.55)',
      highlightColor: 'rgba(255, 236, 214, 0.07)',
    },
  },
  {
    id: 'forest-moss',
    name: 'Forest Moss',
    mood: '딥 세이지 · 소프트 민트',
    mode: 'dark',
    palette: {
      bg: '#0c1210',
      surface: '#121a17',
      surfaceRaised: '#18231e',
      surfaceSunken: '#0a100e',
      surfaceHover: '#16201c',
      borderSubtle: '#1c2823',
      border: '#27372f',
      borderStrong: '#3a4d42',
      text1: '#e6efe9',
      text2: '#9db0a6',
      text3: '#6d8177',
      textInverse: '#0c1210',
      accent: '#8ee0b4',
      done: '#7fd4a2',
      held: '#d2b26a',
      danger: '#e08276',
      glow: 'rgba(110, 220, 170, 0.12)',
      scrim: 'rgba(5, 11, 9, 0.68)',
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      highlightColor: 'rgba(226, 255, 240, 0.07)',
    },
  },
  {
    id: 'nordic-paper',
    name: 'Nordic Paper',
    mood: '웜 오프화이트 페이퍼 · 코발트',
    mode: 'light',
    palette: {
      bg: '#f6f3ec',
      surface: '#fffdf9',
      surfaceRaised: '#ffffff',
      surfaceSunken: '#efeae0',
      surfaceHover: '#f8f4ec',
      borderSubtle: '#eae3d6',
      border: '#ded6c7',
      borderStrong: '#c8bda9',
      text1: '#1c1a17',
      text2: '#5f594e',
      text3: '#736c60',
      textInverse: '#fffdf9',
      accent: '#2f4fd0',
      done: '#2c7a5a',
      held: '#94651a',
      danger: '#b23c34',
      glow: 'rgba(47, 79, 208, 0.07)',
      scrim: 'rgba(32, 28, 21, 0.3)',
      shadowColor: 'rgba(74, 62, 44, 0.14)',
      highlightColor: 'rgba(255, 255, 255, 0.75)',
    },
  },
  {
    id: 'soft-mist',
    name: 'Soft Mist',
    mood: '쿨 그레이 라벤더 · 인디고',
    mode: 'light',
    palette: {
      bg: '#f1f2f8',
      surface: '#fbfbff',
      surfaceRaised: '#ffffff',
      surfaceSunken: '#e8eaf3',
      surfaceHover: '#f4f4fb',
      borderSubtle: '#e4e6f1',
      border: '#d8dbe9',
      borderStrong: '#c2c7da',
      text1: '#1a1c26',
      text2: '#5a6076',
      text3: '#656d80',
      textInverse: '#fbfbff',
      accent: '#5b5bd6',
      done: '#27795a',
      held: '#8a6a22',
      danger: '#b8493f',
      glow: 'rgba(91, 91, 214, 0.09)',
      scrim: 'rgba(22, 24, 38, 0.28)',
      shadowColor: 'rgba(40, 45, 80, 0.13)',
      highlightColor: 'rgba(255, 255, 255, 0.8)',
    },
  },
  {
    id: 'obsidian-mono',
    name: 'Obsidian Mono',
    mood: '깊은 흑요석 · 절제된 시안',
    mode: 'dark',
    palette: {
      bg: '#07090a',
      surface: '#0e1113',
      surfaceRaised: '#141819',
      surfaceSunken: '#080a0b',
      surfaceHover: '#121718',
      borderSubtle: '#161b1d',
      border: '#1f2527',
      borderStrong: '#2d3639',
      text1: '#e9edef',
      text2: '#98a3a8',
      text3: '#6e7a7e',
      textInverse: '#07090a',
      accent: '#48d8c4',
      done: '#4fd0a4',
      held: '#c9a961',
      danger: '#e0675f',
      glow: 'rgba(72, 216, 196, 0.1)',
      scrim: 'rgba(0, 2, 3, 0.74)',
      shadowColor: 'rgba(0, 0, 0, 0.62)',
      highlightColor: 'rgba(255, 255, 255, 0.06)',
    },
  },
];

/** 팔레트 → CSS 변수 이름. app 이 이 목록을 그대로 setProperty 한다. */
export function paletteVars(palette: ThemePalette): Record<string, string> {
  return {
    '--bg': palette.bg,
    '--surface': palette.surface,
    '--surface-raised': palette.surfaceRaised,
    '--surface-sunken': palette.surfaceSunken,
    '--surface-hover': palette.surfaceHover,
    '--border-subtle': palette.borderSubtle,
    '--border': palette.border,
    '--border-strong': palette.borderStrong,
    '--text-1': palette.text1,
    '--text-2': palette.text2,
    '--text-3': palette.text3,
    '--text-inverse': palette.textInverse,
    '--accent': palette.accent,
    '--done': palette.done,
    '--held': palette.held,
    '--danger': palette.danger,
    '--glow': palette.glow,
    '--scrim': palette.scrim,
    '--shadow-color': palette.shadowColor,
    '--highlight-color': palette.highlightColor,
    '--scrollbar-thumb': palette.borderStrong,
  };
}

export const DEFAULT_THEME_ID: ThemeId = 'midnight-slate';
export const DEFAULT_LIGHT_THEME_ID: ThemeId = 'nordic-paper';

export function themeById(id: ThemeId): ThemePreset {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]!;
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEMES.some((theme) => theme.id === value);
}

// ── 스케일 ────────────────────────────────────────────────
// 값은 전부 CSS 변수 이름 → 문자열. app 이 그대로 setProperty 한다.

export type TokenVars = Readonly<Record<string, string>>;

export interface RadiusOption {
  id: RadiusId;
  name: string;
  hint: string;
  vars: TokenVars;
}

export const RADIUS_OPTIONS: readonly RadiusOption[] = [
  {
    id: 'sharp',
    name: 'Sharp',
    hint: '6px · 각진 인상',
    vars: {
      '--radius-sm': '3px',
      '--radius-md': '5px',
      '--radius-lg': '6px',
      '--radius-xl': '10px',
    },
  },
  {
    id: 'smooth',
    name: 'Smooth',
    hint: '14px · 부드러운 기본',
    vars: {
      '--radius-sm': '6px',
      '--radius-md': '10px',
      '--radius-lg': '14px',
      '--radius-xl': '20px',
    },
  },
  {
    id: 'round',
    name: 'Round',
    hint: '20px · 둥근 인상',
    vars: {
      '--radius-sm': '8px',
      '--radius-md': '14px',
      '--radius-lg': '20px',
      '--radius-xl': '28px',
    },
  },
];

export interface SurfaceOption {
  id: SurfaceStyleId;
  name: string;
  hint: string;
  vars: TokenVars;
}

export const SURFACE_OPTIONS: readonly SurfaceOption[] = [
  {
    id: 'flat',
    name: 'Flat',
    hint: '미세한 1px 보더',
    vars: {
      '--card-bg': 'var(--surface)',
      '--card-border-color': 'var(--border)',
      '--card-shadow': 'none',
      '--card-shadow-hover': 'none',
      '--card-blur': 'none',
      '--card-highlight': 'transparent',
    },
  },
  {
    id: 'elevated',
    name: 'Elevated',
    hint: '부드러운 그림자 · 입체',
    vars: {
      '--card-bg': 'var(--surface)',
      '--card-border-color': 'var(--border-subtle)',
      '--card-shadow': '0 1px 2px var(--shadow-color), 0 16px 32px -22px var(--shadow-color)',
      '--card-shadow-hover':
        '0 2px 4px var(--shadow-color), 0 26px 48px -24px var(--shadow-color)',
      '--card-blur': 'none',
      '--card-highlight': 'transparent',
    },
  },
  {
    id: 'glass',
    name: 'Glass',
    hint: '반투명 블러 · 하이라이트',
    vars: {
      '--card-bg': 'color-mix(in srgb, var(--surface-raised) 68%, transparent)',
      '--card-border-color': 'color-mix(in srgb, var(--text-1) 14%, transparent)',
      '--card-shadow': '0 1px 1px var(--shadow-color), 0 22px 44px -26px var(--shadow-color)',
      '--card-shadow-hover':
        '0 2px 6px var(--shadow-color), 0 30px 60px -28px var(--shadow-color)',
      '--card-blur': 'blur(18px) saturate(150%)',
      '--card-highlight': 'var(--highlight-color)',
    },
  },
];

export interface TypographyOption {
  id: TypographyId;
  name: string;
  hint: string;
  vars: TokenVars;
}

export const TYPOGRAPHY_OPTIONS: readonly TypographyOption[] = [
  {
    id: 'clean',
    name: 'Clean Sans',
    hint: '정돈된 산세리프',
    vars: {
      '--font-display': 'var(--font-sans)',
      '--font-meta': 'var(--font-sans)',
      '--text-display-weight': '650',
      '--text-display-tracking': '-0.025em',
      '--text-title-weight': '600',
      '--text-headline-weight': '600',
      '--text-headline-tracking': '-0.012em',
      '--label-tracking': '0.01em',
    },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    hint: '명조 계열 제목',
    vars: {
      '--font-display':
        "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Nanum Myeongjo', 'AppleMyungjo', 'Batang', serif",
      '--font-meta': 'var(--font-sans)',
      '--text-display-weight': '600',
      '--text-display-tracking': '-0.01em',
      '--text-title-weight': '600',
      '--text-headline-weight': '600',
      '--text-headline-tracking': '0em',
      '--label-tracking': '0.04em',
    },
  },
  {
    id: 'mono',
    name: 'Mono accent',
    hint: '숫자·라벨은 모노스페이스',
    vars: {
      '--font-display': 'var(--font-sans)',
      '--font-meta': 'var(--font-mono)',
      '--text-display-weight': '700',
      '--text-display-tracking': '-0.03em',
      '--text-title-weight': '650',
      '--text-headline-weight': '650',
      '--text-headline-tracking': '-0.015em',
      '--label-tracking': '0.06em',
    },
  },
];

export interface DensityOption {
  id: DensityId;
  name: string;
  hint: string;
  vars: TokenVars;
}

export const DENSITY_OPTIONS: readonly DensityOption[] = [
  {
    id: 'relaxed',
    name: 'Relaxed',
    hint: '여유',
    vars: {
      '--pad-card': '24px',
      '--gap-card': '20px',
      '--gap-stack': '14px',
      '--pad-panel': '28px',
      '--gap-section': '44px',
      '--row-pad-y': '14px',
      '--card-min-h': '116px',
      '--text-display-size': '32px',
      '--text-headline-size': '18px',
      '--text-body-size': '15px',
      '--text-body-line': '1.66',
      '--text-body-sm-size': '13px',
      '--text-body-sm-line': '1.6',
      '--text-caption-size': '12px',
      '--text-caption-line': '1.45',
      '--text-micro-size': '11px',
      '--text-micro-line': '1.4',
    },
  },
  {
    id: 'balanced',
    name: 'Balanced',
    hint: '표준',
    vars: {
      '--pad-card': '16px',
      '--gap-card': '16px',
      '--gap-stack': '12px',
      '--pad-panel': '24px',
      '--gap-section': '32px',
      '--row-pad-y': '10px',
      '--card-min-h': '96px',
      '--text-display-size': '28px',
      '--text-headline-size': '17px',
      '--text-body-size': '15px',
      '--text-body-line': '1.55',
      '--text-body-sm-size': '13px',
      '--text-body-sm-line': '1.5',
      '--text-caption-size': '12px',
      '--text-caption-line': '1.4',
      '--text-micro-size': '11px',
      '--text-micro-line': '1.35',
    },
  },
  {
    id: 'compact',
    name: 'Compact',
    hint: '촘촘',
    vars: {
      '--pad-card': '12px',
      '--gap-card': '8px',
      '--gap-stack': '8px',
      '--pad-panel': '18px',
      '--gap-section': '20px',
      '--row-pad-y': '6px',
      '--card-min-h': '76px',
      '--text-display-size': '24px',
      '--text-headline-size': '16px',
      '--text-body-size': '14px',
      '--text-body-line': '1.45',
      '--text-body-sm-size': '12.5px',
      '--text-body-sm-line': '1.42',
      '--text-caption-size': '11.5px',
      '--text-caption-line': '1.35',
      '--text-micro-size': '10.5px',
      '--text-micro-line': '1.3',
    },
  },
];

/** 액센트 스와치 — 큐레이션 10색. 값은 accent 로 바로 쓰인다. */
export interface AccentSwatch {
  name: string;
  value: string;
}

export const ACCENT_SWATCHES: readonly AccentSwatch[] = [
  { name: '아이스 블루', value: '#7cc4ff' },
  { name: '코발트', value: '#4a5cd6' },
  { name: '인디고', value: '#7b7bf0' },
  { name: '바이올렛', value: '#b58cf0' },
  { name: '로즈', value: '#f08ca8' },
  { name: '코랄', value: '#f08a6e' },
  { name: '앰버', value: '#e9a25a' },
  { name: '라임', value: '#b9d96a' },
  { name: '민트', value: '#8ee0b4' },
  { name: '시안', value: '#48d8c4' },
];

/** 밝은 액센트 위에 얹는 글자색 / 어두운 액센트 위에 얹는 글자색. */
export const CONTRAST_ON_LIGHT = '#0a0d12';
export const CONTRAST_ON_DARK = '#ffffff';

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match?.[1]) return null;
  const int = Number.parseInt(match[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** 액센트 위에 올릴 글자색 — 흰색/잉크 중 대비가 큰 쪽. */
export function readableOn(hex: string): string {
  const luminance = relativeLuminance(hex);
  if (luminance === null) return CONTRAST_ON_LIGHT;
  return luminance > 0.45 ? CONTRAST_ON_LIGHT : CONTRAST_ON_DARK;
}

/** 본문 대비 게이트용 — 테스트가 테마를 검사한다. */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  if (a === null || b === null) return 0;
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
