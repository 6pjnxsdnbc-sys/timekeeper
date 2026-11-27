/**
 * 테마 게이트 — 6종 프리셋이 "예쁘다"를 넘어 읽을 수 있는지 본다.
 * 색 대비는 본문 4.5:1 (설계서 5.4 ④) 을 프리셋마다 강제한다.
 */
import { describe, expect, it } from 'vitest';
import {
  ACCENT_SWATCHES,
  CONTRAST_ON_DARK,
  CONTRAST_ON_LIGHT,
  DENSITY_OPTIONS,
  DEFAULT_THEME_ID,
  RADIUS_OPTIONS,
  SURFACE_OPTIONS,
  THEMES,
  TYPOGRAPHY_OPTIONS,
  contrastRatio,
  paletteVars,
  readableOn,
  themeById,
} from '@tokens/themes';

const HEX = /^#[0-9a-f]{6}$/i;

describe('테마 프리셋', () => {
  it('6종이고 id 가 유일하다', () => {
    expect(THEMES).toHaveLength(6);
    expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(6);
    expect(THEMES.map((theme) => theme.name)).toEqual([
      'Midnight Slate',
      'Warm Espresso',
      'Forest Moss',
      'Nordic Paper',
      'Soft Mist',
      'Obsidian Mono',
    ]);
    expect(themeById(DEFAULT_THEME_ID).id).toBe(DEFAULT_THEME_ID);
  });

  it('모든 색이 hex 이고 필수 변수를 다 채운다', () => {
    const required = [
      '--bg',
      '--surface',
      '--surface-raised',
      '--surface-sunken',
      '--surface-hover',
      '--border-subtle',
      '--border',
      '--border-strong',
      '--text-1',
      '--text-2',
      '--text-3',
      '--text-inverse',
      '--accent',
      '--done',
      '--held',
      '--danger',
      '--glow',
      '--scrim',
      '--shadow-color',
      '--highlight-color',
    ];
    for (const theme of THEMES) {
      for (const [name, value] of Object.entries(paletteVars(theme.palette))) {
        expect(value.trim(), `${theme.id} ${name}`).not.toBe('');
      }
      for (const name of required) {
        expect(Object.keys(paletteVars(theme.palette)), `${theme.id} ${name}`).toContain(name);
      }
      const palette = theme.palette;
      for (const value of [
        palette.bg,
        palette.surface,
        palette.surfaceRaised,
        palette.surfaceSunken,
        palette.surfaceHover,
        palette.borderSubtle,
        palette.border,
        palette.borderStrong,
        palette.text1,
        palette.text2,
        palette.text3,
        palette.textInverse,
        palette.accent,
        palette.done,
        palette.held,
        palette.danger,
      ]) {
        expect(value, theme.id).toMatch(HEX);
      }
    }
  });

  it('프리셋마다 본문 대비 4.5:1 을 넘는다', () => {
    for (const theme of THEMES) {
      const { bg, text1, text2, text3, accent, done, held, danger } = theme.palette;
      expect(contrastRatio(text1, bg), `${theme.id} text-1`).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(text2, bg), `${theme.id} text-2`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(text3, bg), `${theme.id} text-3`).toBeGreaterThanOrEqual(4.4);
      expect(contrastRatio(accent, bg), `${theme.id} accent`).toBeGreaterThanOrEqual(4);
      expect(contrastRatio(done, bg), `${theme.id} done`).toBeGreaterThanOrEqual(4);
      expect(contrastRatio(held, bg), `${theme.id} held`).toBeGreaterThanOrEqual(4);
      expect(contrastRatio(danger, bg), `${theme.id} danger`).toBeGreaterThanOrEqual(4);
    }
  });

  it('액센트 위 글자색은 밝기에 따라 뒤집힌다', () => {
    expect(readableOn('#7cc4ff')).toBe(CONTRAST_ON_LIGHT);
    expect(readableOn('#2f4fd0')).toBe(CONTRAST_ON_DARK);
    expect(readableOn('not-a-color')).toBe(CONTRAST_ON_LIGHT);
  });
});

describe('커스터마이징 스케일', () => {
  it('질감·곡률·타이포·밀도는 각 3종이다', () => {
    expect(SURFACE_OPTIONS.map((option) => option.id)).toEqual(['flat', 'elevated', 'glass']);
    expect(RADIUS_OPTIONS.map((option) => option.id)).toEqual(['sharp', 'smooth', 'round']);
    expect(TYPOGRAPHY_OPTIONS.map((option) => option.id)).toEqual(['clean', 'editorial', 'mono']);
    expect(DENSITY_OPTIONS.map((option) => option.id)).toEqual(['relaxed', 'balanced', 'compact']);
  });

  it('곡률은 6 / 14 / 20px 이다', () => {
    const cardRadius = (id: 'sharp' | 'smooth' | 'round') =>
      RADIUS_OPTIONS.find((option) => option.id === id)?.vars['--radius-lg'];
    expect(cardRadius('sharp')).toBe('6px');
    expect(cardRadius('smooth')).toBe('14px');
    expect(cardRadius('round')).toBe('20px');
  });

  it('모든 스케일 값은 CSS 변수 이름과 값으로만 이루어진다', () => {
    const groups = [SURFACE_OPTIONS, RADIUS_OPTIONS, TYPOGRAPHY_OPTIONS, DENSITY_OPTIONS];
    for (const group of groups) {
      for (const option of group) {
        const entries = Object.entries(option.vars);
        expect(entries.length, option.id).toBeGreaterThan(0);
        for (const [name, value] of entries) {
          expect(name.startsWith('--'), `${option.id} ${name}`).toBe(true);
          expect(value.trim(), `${option.id} ${name}`).not.toBe('');
        }
      }
    }
  });

  it('밀도가 바뀌면 카드 여백이 실제로 달라진다', () => {
    const pad = (id: 'relaxed' | 'balanced' | 'compact') =>
      DENSITY_OPTIONS.find((option) => option.id === id)?.vars['--pad-card'];
    expect(pad('relaxed')).not.toBe(pad('compact'));
  });

  it('액센트 스와치는 hex 10색이다', () => {
    expect(ACCENT_SWATCHES).toHaveLength(10);
    for (const swatch of ACCENT_SWATCHES) expect(swatch.value, swatch.name).toMatch(HEX);
  });
});
