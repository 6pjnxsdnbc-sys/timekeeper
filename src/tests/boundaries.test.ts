/**
 * 구조 게이트 — lint(boundaries)와 별개로 CI 에서 한 번 더 강제한다.
 * 규칙이 설정에서 빠져도 레이어가 무너지면 테스트가 실패한다.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../', import.meta.url));

const ALLOWED: Record<string, readonly string[]> = {
  tokens: [],
  core: ['core'],
  ui: ['ui', 'core', 'tokens'],
  sync: ['sync', 'core'],
  app: ['app', 'ui', 'core', 'sync', 'tokens'],
};

const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .map((p: string) => p.split('\\').join('/'))
  .filter((p: string) => !p.startsWith('tests/'))
  .filter((p: string) => p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.css'));

function layerOfFile(pathFromSrc: string): string | undefined {
  return pathFromSrc.split('/')[0];
}

function layerOfSpecifier(fromFile: string, specifier: string): string | undefined {
  if (specifier.startsWith('@')) {
    const layer = specifier.slice(1).split('/')[0];
    return layer === 'app' || layer === 'core' || layer === 'ui' || layer === 'sync' || layer === 'tokens'
      ? layer
      : undefined;
  }
  if (!specifier.startsWith('.')) return undefined; // 외부 패키지·node: 내장
  const resolved = normalize(join(dirname(fromFile), specifier));
  return layerOfFile(resolved);
}

function importsOf(source: string): string[] {
  const found: string[] = [];
  const patterns = [
    /(?:import|export)\s+(?:type\s+)?[^'"\n]*?from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    for (const match of source.matchAll(re)) {
      if (match[1]) found.push(match[1]);
    }
  }
  return found;
}

describe('레이어 경계 (2.1)', () => {
  it('허용되지 않은 레이어 import 가 없다', () => {
    const violations: string[] = [];

    for (const file of files) {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
      const from = layerOfFile(file);
      if (!from || !(from in ALLOWED)) continue;

      for (const specifier of importsOf(readFileSync(join(SRC, file), 'utf8'))) {
        const to = layerOfSpecifier(file, specifier);
        if (!to) continue;
        if (!ALLOWED[from]?.includes(to)) {
          violations.push(`${file} → ${specifier} (${from} ↛ ${to})`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('레이어마다 공개 배럴(index.ts)이 있다', () => {
    for (const layer of ['tokens', 'core', 'ui', 'sync', 'app']) {
      const isCssLayer = layer === 'tokens';
      const entry = isCssLayer ? 'tokens/index.css' : `${layer}/index.ts`;
      expect(() => readFileSync(join(SRC, entry))).not.toThrow();
    }
  });

  it('core · sync 는 DOM 을 만지지 않는다', () => {
    const offenders = files
      .filter((f: string) => (f.startsWith('core/') || f.startsWith('sync/')) && /\.tsx?$/.test(f))
      .filter((f: string) =>
        /(?:window|document|localStorage|sessionStorage)\s*\.|\bfetch\s*\(/.test(
          readFileSync(join(SRC, f), 'utf8'),
        ),
      );

    expect(offenders).toEqual([]);
  });

  it('색 리터럴은 tokens 밖에 없다 (테마 전환은 토큰 교체만)', () => {
    const offenders = files
      .filter((f: string) => f.endsWith('.css') && !f.startsWith('tokens/'))
      .filter((f: string) => /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(readFileSync(join(SRC, f), 'utf8')));

    expect(offenders).toEqual([]);
  });
});
