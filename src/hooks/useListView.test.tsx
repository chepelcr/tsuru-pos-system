import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useDetailPageScroll, useListViewScroll, useListViewState } from './useListView';

it('restores the list filter and page on return and scopes them to the organization', () => {
  const first = renderHook(() => useListViewState('orders:org-a', 'filters', { page: 1, term: '' }));
  act(() => first.result.current[1]({ page: 2, term: '9598' }));
  first.unmount();

  const next = renderHook(({ scope }) => useListViewState(scope, 'filters', { page: 1, term: '' }), {
    initialProps: { scope: 'orders:org-a' },
  });
  expect(next.result.current[0]).toEqual({ page: 2, term: '9598' });
  next.rerender({ scope: 'orders:org-b' });
  expect(next.result.current[0]).toEqual({ page: 1, term: '' });
});

it('restores the list scroll offset after its records load', () => {
  const element = document.createElement('div');
  element.scrollTo = vi.fn();
  const ref = { current: element };
  const first = renderHook(() => useListViewScroll('orders:scroll-test:2', true, ref));
  element.scrollTop = 420;
  element.dispatchEvent(new Event('scroll'));
  first.unmount();
  element.scrollTop = 0;

  const next = renderHook(({ ready }) => useListViewScroll('orders:scroll-test:2', ready, ref), {
    initialProps: { ready: false },
  });
  expect(element.scrollTo).not.toHaveBeenCalled();
  next.rerender({ ready: true });
  expect(element.scrollTo).toHaveBeenCalledWith({ top: 420, behavior: 'instant' });
});

it('starts details at the top and leaves returning lists to restore their position', () => {
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('scrollY', 450);
  try {
    const view = renderHook(({ path }) => useDetailPageScroll(path), { initialProps: { path: '/dashboard/orders' } });
    expect(scroll).not.toHaveBeenCalled();
    view.rerender({ path: '/dashboard/orders/2900679598' });
    expect(scroll).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
    scroll.mockClear();
    view.rerender({ path: '/dashboard/orders' });
    expect(scroll).not.toHaveBeenCalled();
    view.rerender({ path: '/dashboard/documents/historical/5060101' });
    expect(scroll).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
    scroll.mockClear();
    view.rerender({ path: '/dashboard/documents/historical' });
    expect(scroll).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
    scroll.mockRestore();
  }
});
