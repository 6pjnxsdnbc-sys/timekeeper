/**
 * SyncAdapter — 저장은 이 인터페이스 뒤에 숨는다 (D7 · 6.4).
 * `ui` 는 이 파일을 모른다. `app/providers.tsx` 가 구현을 주입한다.
 */
import type { AppDataV1, EngineEvent, Instant, Item, ItemId } from '@core/schema/current';

export interface ChangeSet {
  baseRev: number;
  upserts: Item[];
  deletes: ItemId[];
  events: EngineEvent[]; // 새 이벤트만 (수정·삭제 없음)
  meta?: Partial<AppDataV1['settings']>;
}

export interface PullResult {
  rev: number;
  at: Instant;
  changes: ChangeSet;
}

export interface SyncStatus {
  lastWriteAt?: Instant;
  sizeBytes?: number;
}

export interface SyncAdapter {
  readonly id: 'gist' | 'repo' | 'supabase' | 'file';
  /** v1.2: PAT 만료일 힌트를 돌려준다 — D−7 설정 1줄에 쓰인다. */
  connect(config: unknown): Promise<{ tokenExpiresAt?: Instant }>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  /** null = 변경 없음 */
  pull(sinceRev: number): Promise<PullResult | null>;
  push(changes: ChangeSet): Promise<{ rev: number; rejected: ItemId[] }>;
  stat(): Promise<SyncStatus>;
}
