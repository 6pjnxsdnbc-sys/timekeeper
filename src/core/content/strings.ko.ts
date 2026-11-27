/**
 * 화면 문구 — 로직 없음 (설계서 2.2 · 2.8).
 * "이월 버튼 이름 바꿔" 는 이 파일만 고친다.
 */
export const STRINGS = {
  app: {
    name: 'Timekeeper',
    tagline: '생각난 순간 던지면, 지금 할 수 있는 세 개만 남습니다.',
  },
  shell: {
    today: '오늘',
    timeline: '타임라인',
    archive: '보관',
    settings: '설정',
    emptyBoardTitle: '아직 오늘의 카드가 없어요',
    emptyBoardBody: '떠오른 것을 한 줄로 던져두면, 여기에 세 개까지 놓입니다.',
    emptyBoardAction: '한 줄로 적기',
    emptyTimeline: '고정 일정이 없으면 하루 전체가 빈 시간이에요.',
    footerSchema: '스키마',
    footerBuild: '빌드',
    themeLabel: '테마',
  },
  theme: {
    system: '시스템',
    dark: '다크',
    light: '라이트',
    switchTo: (next: string) => `테마: ${next}`,
  },
  capture: {
    placeholder: '지금 떠오른 것 한 줄',
    hint: '분류는 묻지 않습니다. 저장하면 인박스로 갑니다.',
  },
} as const;
