import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

/**
 * GitHub Pages 는 `https://<user>.github.io/<repo>/` 하위 경로로 서빙된다.
 * 배포 워크플로가 `--base=/<repo>/` 를 넘기고, 로컬/기본값은 같은 경로를 쓴다.
 * PR 프리뷰는 `--base=/<repo>/preview/pr-<n>/` 로 덮어쓴다 (설계서 2.7).
 */
const base = process.env.VITE_BASE_PATH ?? '/timekeeper/';

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@tokens': fileURLToPath(new URL('./src/tokens', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@sync': fileURLToPath(new URL('./src/sync', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  // 일부 CI·샌드박스에는 localhost 가 hosts 에 없어 Vite 서버 기동이 실패한다.
  // 루프백 IP 로 고정해 환경과 무관하게 테스트가 돈다.
  server: { host: '127.0.0.1' },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    passWithNoTests: false,
  },
});
