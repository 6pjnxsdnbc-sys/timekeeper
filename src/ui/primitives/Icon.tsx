/**
 * Icon — 선 1.6px 의 최소 아이콘 세트. 색은 currentColor 만 쓴다.
 * (아이콘 파일은 색을 모른다 — 테마는 부모의 color 로 온다.)
 */
import type { CSSProperties, ReactNode } from 'react';
import './Icon.css';

export type IconName =
  | 'plus'
  | 'check'
  | 'x'
  | 'arrowRight'
  | 'arrowDown'
  | 'arrowUp'
  | 'cards'
  | 'rows'
  | 'columns'
  | 'grid'
  | 'contrast'
  | 'inbox'
  | 'clock';

const SHAPES: Record<IconName, ReactNode> = {
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  check: <path d="M5 12.6l4.4 4.4L19 7.4" />,
  x: <path d="M6.6 6.6l10.8 10.8M17.4 6.6L6.6 17.4" />,
  arrowRight: <path d="M4.5 12h14M13 6.5l5.5 5.5L13 17.5" />,
  arrowDown: <path d="M12 4.5v14M6.5 13L12 18.5 17.5 13" />,
  arrowUp: <path d="M12 19.5v-14M6.5 11L12 5.5 17.5 11" />,
  cards: (
    <>
      <rect x="3.6" y="3.6" width="16.8" height="7.6" rx="2.4" />
      <rect x="3.6" y="13.4" width="16.8" height="7" rx="2.4" />
    </>
  ),
  rows: <path d="M4 7h16M4 12h16M4 17h10" />,
  columns: (
    <>
      <rect x="3.6" y="4" width="7" height="16" rx="2" />
      <rect x="13.4" y="4" width="7" height="16" rx="2" />
    </>
  ),
  grid: (
    <>
      <rect x="3.6" y="3.8" width="7.2" height="7.2" rx="2" />
      <rect x="13.2" y="3.8" width="7.2" height="7.2" rx="2" />
      <rect x="3.6" y="13.2" width="7.2" height="7.2" rx="2" />
      <rect x="13.2" y="13.2" width="7.2" height="7.2" rx="2" />
    </>
  ),
  contrast: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 3.8a8.2 8.2 0 0 1 0 16.4z" fill="currentColor" stroke="none" />
    </>
  ),
  inbox: (
    <>
      <path d="M4.2 13.2l2.1-6.1A2.6 2.6 0 0 1 8.8 5.3h6.4a2.6 2.6 0 0 1 2.5 1.8l2.1 6.1v4.2a1.6 1.6 0 0 1-1.6 1.6H5.8a1.6 1.6 0 0 1-1.6-1.6z" />
      <path d="M4.2 13.2h4l1.1 2.1h5.4l1.1-2.1h4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.6V12l3 1.9" />
    </>
  ),
};

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, className, style }: IconProps) {
  const classes = ['icon', className].filter(Boolean).join(' ');
  return (
    <svg
      className={classes}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {SHAPES[name]}
    </svg>
  );
}
