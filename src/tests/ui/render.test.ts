import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { captureFromText, promotedToToday } from '@core';
import { TodayScreen } from '@ui';
import { NOW, TODAY, emptyData, fixedDeps } from '../support/fixtures';

const STUDIO = {
  themeId: 'midnight-slate' as const,
  accent: null,
  surface: 'elevated' as const,
  radius: 'smooth' as const,
  typography: 'clean' as const,
  density: 'balanced' as const,
};

function renderScreen(view: 'focus' | 'list' | 'split' = 'focus') {
  const deps = fixedDeps();
  let data = emptyData();
  const captured = captureFromText({ data, today: TODAY, deps }, '인하대 논술 2번 재작성 /공부 1시간');
  data = captured.data;
  const placed = promotedToToday({ data, today: TODAY, deps }, captured.item.id);
  data = placed.data;
  data = captureFromText({ data, today: TODAY, deps }, '장학금 서류 15분').data;

  const html = renderToStaticMarkup(
    createElement(TodayScreen, {
      data,
      today: TODAY,
      studio: STUDIO,
      view,
      onStudioChange: () => undefined,
      onStudioReset: () => undefined,
      onViewChange: () => undefined,
      onOpenCapture: () => undefined,
      onPromote: () => undefined,
      onDemote: () => undefined,
      onComplete: () => undefined,
      onPostpone: () => undefined,
      onRemove: () => undefined,
      schemaVersion: 1,
      appVersion: 'test',
    }),
  );
  return { html, captured, now: NOW };
}

describe('TodayScreen — 렌더 스모크', () => {
  it('카드·인박스·완료 영역이 실제 데이터로 그려진다', () => {
    const { html } = renderScreen();
    expect(html).toContain('인하대 논술 2번 재작성');
    expect(html).toContain('공부');
    expect(html).toContain('1시간');
    expect(html).toContain('인박스');
    expect(html).toContain('오늘로');
    expect(html).toContain('빈 자리');
    expect(html).toContain('오늘 한 것');
  });

  it('세 가지 뷰가 모두 같은 데이터를 그린다', () => {
    for (const view of ['focus', 'list', 'split'] as const) {
      const { html } = renderScreen(view);
      expect(html).toContain('인하대 논술 2번 재작성');
      expect(html).toContain('장학금 서류');
      expect(html).toContain(`data-view="${view}"`);
    }
  });

  it('테마 스튜디오 진입점이 있다', () => {
    const { html } = renderScreen();
    expect(html).toContain('화면·테마 스튜디오');
  });

  it('이월 횟수는 화면 어디에도 숫자로 나오지 않는다 (P4)', () => {
    const { html } = renderScreen();
    expect(html).not.toContain('이월');
    expect(html).not.toContain('carryCount');
  });
});
