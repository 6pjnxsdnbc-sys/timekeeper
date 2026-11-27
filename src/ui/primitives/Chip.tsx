/**
 * Chip — 라벨 한 조각. 분류에 색을 주지 않는다 (5.4 ②).
 */
import './Chip.css';

export interface ChipProps {
  children: string;
  tone?: 'neutral' | 'accent';
}

export function Chip({ children, tone = 'neutral' }: ChipProps) {
  return <span className={`chip chip--${tone}`}>{children}</span>;
}
