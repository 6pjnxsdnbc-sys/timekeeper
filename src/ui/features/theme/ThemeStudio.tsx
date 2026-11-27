/**
 * ThemeStudio — 화면·테마 스튜디오. 고르면 바로 적용되고, 바로 저장된다.
 * 값의 원천은 tokens/themes.ts 이고 여기는 표시·입력만 한다 (계산 없음).
 */
import type { CSSProperties, ReactNode } from 'react';
import {
  ACCENT_SWATCHES,
  DENSITY_OPTIONS,
  RADIUS_OPTIONS,
  SURFACE_OPTIONS,
  THEMES,
  TYPOGRAPHY_OPTIONS,
  themeById,
} from '@tokens/themes';
import { STRINGS } from '@core';
import { Icon } from '@ui/primitives/Icon';
import { Overlay } from '@ui/primitives/Overlay';
import type { StudioState } from './types';
import './ThemeStudio.css';

export interface ThemeStudioProps {
  open: boolean;
  state: StudioState;
  onChange: (patch: Partial<StudioState>) => void;
  onReset: () => void;
  onClose: () => void;
}

function cssVars(vars: Readonly<Record<string, string>>): CSSProperties {
  return vars as unknown as CSSProperties;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="studio__section">
      <header className="studio__section-head">
        <h3 className="studio__section-title">{title}</h3>
        {hint ? <span className="studio__section-hint">{hint}</span> : null}
      </header>
      {children}
    </section>
  );
}

export function ThemeStudio({ open, state, onChange, onReset, onClose }: ThemeStudioProps) {
  const active = themeById(state.themeId);
  const currentAccent = state.accent ?? active.palette.accent;

  return (
    <Overlay open={open} onClose={onClose} label={STRINGS.studio.title} size="lg" placement="center">
      <div className="studio">
        <header className="studio__head">
          <div className="studio__headings">
            <h2 className="studio__title">{STRINGS.studio.title}</h2>
            <p className="studio__subtitle">{STRINGS.studio.subtitle}</p>
          </div>
          <button
            type="button"
            className="studio__close"
            onClick={onClose}
            aria-label={STRINGS.studio.close}
          >
            <Icon name="x" size={16} />
          </button>
        </header>

        <div className="studio__body">
          <Section title={STRINGS.studio.presetSection}>
            <div className="presets">
              {THEMES.map((theme) => {
                const selected = theme.id === state.themeId;
                const preview = cssVars({
                  '--p-bg': theme.palette.bg,
                  '--p-surface': theme.palette.surface,
                  '--p-line': theme.palette.border,
                  '--p-accent': theme.palette.accent,
                  '--p-text': theme.palette.text1,
                  '--p-muted': theme.palette.text3,
                });
                return (
                  <button
                    key={theme.id}
                    type="button"
                    className="preset"
                    aria-pressed={selected}
                    onClick={() => onChange({ themeId: theme.id, accent: null })}
                  >
                    <span className="preset__preview" style={preview} aria-hidden="true">
                      <span className="preset__bar" />
                      <span className="preset__bar preset__bar--short" />
                      <span className="preset__line" />
                    </span>
                    <span className="preset__meta">
                      <span className="preset__row">
                        <span className="preset__name">{theme.name}</span>
                        <span className="preset__mode">
                          {theme.mode === 'dark'
                            ? STRINGS.studio.modeDark
                            : STRINGS.studio.modeLight}
                        </span>
                      </span>
                      <span className="preset__mood">{theme.mood}</span>
                    </span>
                    {selected ? (
                      <span className="preset__check" aria-hidden="true">
                        <Icon name="check" size={11} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title={STRINGS.studio.accentSection} hint={STRINGS.studio.accentHint}>
            <div className="swatches">
              <button
                type="button"
                className="swatch swatch--auto"
                aria-pressed={state.accent === null}
                onClick={() => onChange({ accent: null })}
              >
                <span
                  className="swatch__dot"
                  style={{ background: active.palette.accent }}
                  aria-hidden="true"
                />
                <span className="swatch__text">{STRINGS.studio.accentAuto}</span>
              </button>
              {ACCENT_SWATCHES.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  className="swatch swatch--dot"
                  aria-pressed={state.accent === swatch.value}
                  aria-label={swatch.name}
                  title={swatch.name}
                  onClick={() => onChange({ accent: swatch.value })}
                >
                  <span
                    className="swatch__dot"
                    style={{ background: swatch.value }}
                    aria-hidden="true"
                  />
                </button>
              ))}
              <label className="swatch swatch--picker" title={STRINGS.studio.accentCustom}>
                <input
                  type="color"
                  value={currentAccent}
                  aria-label={STRINGS.studio.accentCustom}
                  onChange={(event) => onChange({ accent: event.target.value })}
                />
                <span className="swatch__ring" aria-hidden="true" />
                <span className="swatch__text">{STRINGS.studio.accentCustom}</span>
              </label>
            </div>
          </Section>

          <Section title={STRINGS.studio.surfaceSection}>
            <div className="choices">
              {SURFACE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="choice"
                  aria-pressed={state.surface === option.id}
                  onClick={() => onChange({ surface: option.id })}
                >
                  <span className="choice__demo" style={cssVars(option.vars)} aria-hidden="true">
                    <span className="choice__surface" />
                  </span>
                  <span className="choice__text">
                    <span className="choice__name">{option.name}</span>
                    <span className="choice__hint">{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section title={STRINGS.studio.radiusSection}>
            <div className="choices">
              {RADIUS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="choice"
                  aria-pressed={state.radius === option.id}
                  onClick={() => onChange({ radius: option.id })}
                >
                  <span className="choice__demo" aria-hidden="true">
                    <span
                      className="choice__shape"
                      style={{ borderRadius: option.vars['--radius-md'] }}
                    />
                  </span>
                  <span className="choice__text">
                    <span className="choice__name">{option.name}</span>
                    <span className="choice__hint">{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section title={STRINGS.studio.typographySection}>
            <div className="choices">
              {TYPOGRAPHY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="choice"
                  aria-pressed={state.typography === option.id}
                  onClick={() => onChange({ typography: option.id })}
                >
                  <span className="choice__demo" aria-hidden="true">
                    <span
                      className="choice__sample"
                      style={{ fontFamily: option.vars['--font-display'] }}
                    >
                      Aa 가
                    </span>
                  </span>
                  <span className="choice__text">
                    <span className="choice__name">{option.name}</span>
                    <span className="choice__hint">{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </Section>

          <Section title={STRINGS.studio.densitySection}>
            <div className="choices">
              {DENSITY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="choice"
                  aria-pressed={state.density === option.id}
                  onClick={() => onChange({ density: option.id })}
                >
                  <span
                    className="choice__demo choice__demo--density"
                    style={{ gap: `calc(${option.vars['--gap-card']} / 3)` }}
                    aria-hidden="true"
                  >
                    <span className="choice__bar" />
                    <span className="choice__bar" />
                    <span className="choice__bar" />
                  </span>
                  <span className="choice__text">
                    <span className="choice__name">{option.name}</span>
                    <span className="choice__hint">{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </Section>
        </div>

        <footer className="studio__foot">
          <button type="button" className="studio__reset" onClick={onReset}>
            {STRINGS.studio.reset}
          </button>
          <span className="studio__saved">{STRINGS.studio.savedHint}</span>
        </footer>
      </div>
    </Overlay>
  );
}
