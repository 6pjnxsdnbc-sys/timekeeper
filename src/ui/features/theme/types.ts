/**
 * 스튜디오 상태의 모양 — ui 가 정의하고 app 이 같은 모양으로 들고 있는다.
 * 값의 원천은 tokens/themes.ts 다.
 */
import type {
  DensityId,
  RadiusId,
  SurfaceStyleId,
  ThemeId,
  TypographyId,
} from '@tokens/themes';

export interface StudioState {
  themeId: ThemeId;
  /** null = 프리셋 액센트 그대로 */
  accent: string | null;
  surface: SurfaceStyleId;
  radius: RadiusId;
  typography: TypographyId;
  density: DensityId;
}
