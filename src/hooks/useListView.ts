import { useLayoutEffect, useReducer, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { ROUTES } from '@/routePaths';

const values = new Map<string, unknown>();
const scrollPositions = new Map<string, number>();
const detailParents: readonly string[] = [
  ROUTES.DASHBOARD_ORDERS, ROUTES.DASHBOARD_PRODUCTS, ROUTES.DASHBOARD_CLIENTS,
  ROUTES.DASHBOARD_CONFIRMATIONS, ROUTES.DASHBOARD_DOCUMENTS, ROUTES.DASHBOARD_HISTORICAL_DOCUMENTS,
  ROUTES.DASHBOARD_BRANCHES, ROUTES.DASHBOARD_SESSIONS, ROUTES.DASHBOARD_ORG_SETTINGS,
];

export function useDetailPageScroll(location: string) {
  useLayoutEffect(() => {
    const path = location.replace(/\/+$/, '');
    if (window.scrollY && !detailParents.includes(path) && detailParents.some((parent) => path.startsWith(`${parent}/`))) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location]);
}

/** Keep a list's view state while its detail route replaces it. */
export function useListViewState<T>(scope: string, field: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const key = JSON.stringify([scope, field]);
  const [, redraw] = useReducer((count: number) => count + 1, 0);
  const read = () => values.has(key) ? values.get(key) as T : initial;
  const setValue: Dispatch<SetStateAction<T>> = (next) => {
    values.set(key, typeof next === 'function' ? (next as (previous: T) => T)(read()) : next);
    redraw();
  };
  return [read(), setValue];
}

/** Restore after the list has rendered enough content to scroll. */
export function useListViewScroll(scope: string, ready: boolean, container?: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    if (!ready) return;
    const target = container ? container.current : window;
    if (!target) return;
    const position = () => target instanceof HTMLElement ? target.scrollTop : window.scrollY;
    const saved = scrollPositions.get(scope) ?? 0;
    if (position() !== saved) target.scrollTo({ top: saved, behavior: 'instant' });
    const remember = () => { scrollPositions.set(scope, position()); };
    target.addEventListener('scroll', remember, { passive: true });
    return () => target.removeEventListener('scroll', remember);
  }, [scope, ready, container]);
}
