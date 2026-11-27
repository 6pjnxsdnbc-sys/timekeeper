import { describe, expect, it } from 'vitest';
import { captureFromText, parseCapture, selectBoardView } from '@core';
import { TODAY, emptyData, fixedDeps } from '../support/fixtures';

const ctx = { today: TODAY };

describe('parseCapture — 1초 입력의 최소 파서 (M1)', () => {
  it('분류 태그·소요 시간을 읽고 제목에서 걷어낸다', () => {
    const parse = parseCapture('인하대 논술 2번 재작성 /공부 60분', ctx);
    expect(parse.title).toBe('인하대 논술 2번 재작성');
    expect(parse.contextId).toBe('study');
    expect(parse.estimateMin).toBe(60);
    expect(parse.estimateAssumed).toBe(false);
    expect(parse.when).toBe('none');
    expect(parse.parts).toEqual(['공부', '1시간']);
  });

  it("'내일' 은 다음 날 후보로 보낸다", () => {
    const parse = parseCapture('내일 병원 예약 30분', ctx);
    expect(parse.title).toBe('병원 예약');
    expect(parse.when).toBe('tomorrow');
    expect(parse.estimateMin).toBe(30);
  });

  it("'19시' 는 시작 시각이자 오늘이다", () => {
    const parse = parseCapture('수학 기출 19시', ctx);
    expect(parse.startMin).toBe(19 * 60);
    expect(parse.when).toBe('today');
    expect(parse.title).toBe('수학 기출');
    expect(parse.parts).toContain('19:00');
  });

  it("'1시간 30분' 을 90분으로 읽는다 (시각으로 오해하지 않는다)", () => {
    const parse = parseCapture('운동 /운동 1시간 30분', ctx);
    expect(parse.contextId).toBe('workout');
    expect(parse.estimateMin).toBe(90);
    expect(parse.startMin).toBeUndefined();
    expect(parse.title).toBe('운동');
  });

  it("'!' 는 오늘 고정 — 보드로 간다", () => {
    const parse = parseCapture('12/5 인하대 원서 제출 !', ctx);
    expect(parse.pinned).toBe(true);
    expect(parse.when).toBe('today');
    expect(parse.dueDate).toBe('2026-12-05');
    expect(parse.title).toBe('인하대 원서 제출');
  });

  it('읽을 수 없는 입력도 항상 저장 가능한 초안이 된다 (인박스 · 15분)', () => {
    const parse = parseCapture('장학금 서류', ctx);
    expect(parse.title).toBe('장학금 서류');
    expect(parse.contextId).toBe('inbox');
    expect(parse.estimateMin).toBe(15);
    expect(parse.estimateAssumed).toBe(true);
    expect(parse.when).toBe('none');
    expect(parse.parts).toEqual(['15분(기본)']);
  });

  it('빈 입력도 예외를 던지지 않는다', () => {
    const parse = parseCapture('   ', ctx);
    expect(parse.title).toBe('');
    expect(parse.estimateMin).toBe(15);
  });

  it('지난 날짜의 마감은 다음 해로 읽는다', () => {
    const parse = parseCapture('1/5 원서 접수', ctx);
    expect(parse.dueDate).toBe('2027-01-05');
  });

  it('오늘까지 는 마감으로도 기록된다', () => {
    const parse = parseCapture('보고서 정리 오늘까지', ctx);
    expect(parse.dueDate).toBe(TODAY);
    expect(parse.when).toBe('today');
  });
});

describe('capture → 오늘 보드', () => {
  it("'!' 는 오늘 보드에 올리고 '오늘 고정'·시각 라벨을 붙인다", () => {
    const deps = fixedDeps();
    const result = captureFromText({ data: emptyData(), today: TODAY, deps }, '인하대 면접 준비 19시 !');

    expect(result.placedOnBoard).toBe(true);
    const view = selectBoardView(result.data, TODAY);
    expect(view.cards).toHaveLength(1);
    expect(view.cards[0]?.meta.labels).toContain('오늘 고정');
    expect(view.cards[0]?.meta.labels).toContain('19:00');
    expect(view.cards[0]?.item.status).toBe('planned');
  });

  it("'내일' 은 오늘 보드에 올리지 않고 내일 후보로 둔다", () => {
    const deps = fixedDeps();
    const result = captureFromText({ data: emptyData(), today: TODAY, deps }, '병원 예약 내일 30분');

    expect(result.placedOnBoard).toBe(false);
    expect(selectBoardView(result.data, TODAY).candidates).toHaveLength(0);
    expect(selectBoardView(result.data, '2026-11-28').candidates).toHaveLength(1);
  });
});
