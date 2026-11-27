import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const rootPath = fileURLToPath(new URL('.', import.meta.url));

/**
 * 레이어 경계는 lint 에서 강제한다 (설계서 2.1).
 * tokens ← ui (ui 만 참조) · core 는 아무도 모른다 · sync 는 core 만 · app 은 전부.
 *
 * 별칭(@core/*)과 실제 경로(src/core/*) 둘 다 element 로 인식시켜,
 * 상대경로로 우회해도 같은 규칙을 적용한다.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: { boundaries },
    settings: {
      'boundaries/root-path': rootPath,
      'boundaries/include': ['src/**/*'],
      'boundaries/ignore': ['src/tests/**/*', 'src/**/*.test.ts'],
      // TS path alias(@core/*)를 실제 파일로 풀어야 element 분류가 된다.
      'import/resolver': { typescript: { alwaysTryTypes: true } },
      'boundaries/elements': [
        {
          type: 'tokens',
          mode: 'full',
          pattern: ['src/tokens/**/*', '@tokens/**/*', '@tokens'],
        },
        {
          type: 'core',
          mode: 'full',
          pattern: ['src/core/**/*', '@core/**/*', '@core'],
        },
        {
          type: 'ui',
          mode: 'full',
          pattern: ['src/ui/**/*', '@ui/**/*', '@ui'],
        },
        {
          type: 'sync',
          mode: 'full',
          pattern: ['src/sync/**/*', '@sync/**/*', '@sync'],
        },
        {
          type: 'app',
          mode: 'full',
          pattern: ['src/app/**/*', '@app/**/*', '@app'],
        },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'tokens', allow: [] },
            { from: 'core', allow: ['core'] },
            { from: 'ui', allow: ['ui', 'core', 'tokens'] },
            { from: 'sync', allow: ['sync', 'core'] },
            { from: 'app', allow: ['app', 'ui', 'core', 'sync', 'tokens'] },
          ],
        },
      ],
      // 상대경로 3단계 이상 금지 — 레이어를 가로지르는 우회로를 막는다.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../../*', '../../../../*', '../../../../../*'],
              message: '상대경로 3단계 이상 금지 — @core / @ui / @tokens 별칭을 쓰세요.',
            },
          ],
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
    },
  },
  {
    // core · sync 는 DOM 을 모른다 (순수 계산·저장 계층).
    files: ['src/core/**/*.{ts,tsx}', 'src/sync/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'localStorage', 'sessionStorage', 'fetch', 'navigator'].map(
          (name) => ({
            name,
            message: 'core·sync 는 DOM/브라우저 API 를 모릅니다 (설계서 2.1).',
          }),
        ),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'globalThis', property: 'localStorage', message: '저장은 sync 어댑터에서만.' },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
