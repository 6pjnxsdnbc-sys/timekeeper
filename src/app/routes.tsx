/**
 * routes — 화면 이름만 안다 (설계서 2.6: screens 만 라우팅을 안다).
 * v1은 오늘 화면 하나. 새 화면은 여기 한 줄 + features 폴더 하나다.
 */
import { useEffect, useState } from 'react';

export type RouteId = 'today';

export const ROUTES: Record<RouteId, { label: string }> = {
  today: { label: '오늘' },
};

export const DEFAULT_ROUTE: RouteId = 'today';

export function resolveRoute(hash: string): RouteId {
  const raw = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  return raw in ROUTES ? (raw as RouteId) : DEFAULT_ROUTE;
}

export function useRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(() => resolveRoute(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(resolveRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
