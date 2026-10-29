import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

const requests = vi.hoisted(() => [] as Array<{
  path: string; name: string; done: boolean;
  resolve: (value: { document_number: string }) => void;
  reject: (error: Error) => void;
}>);
vi.mock('@/lib/api', () => ({
  ordersStoreOrgPath: (org: string, suffix: string) => `/orgs/${org}${suffix}`,
  ordersStoreApi: { post: vi.fn((path: string, body: { name: string }) => new Promise((resolve, reject) => {
    const request = { path, name: body.name, done: false,
      resolve: (value: { document_number: string }) => { request.done = true; resolve(value); },
      reject: (error: Error) => { request.done = true; reject(error); } };
    requests.push(request);
  })) },
}));
vi.mock('@/lib/queryClient', () => ({ queryClient: { setQueryData: vi.fn(), invalidateQueries: vi.fn() } }));

import { queryClient } from '@/lib/queryClient';
import { MAX_PARALLEL_ORDER_IMPORTS, isOrderImportBusy, useOrderImportStore } from './useOrderImport';
const file = (name: string) => new File(['spreadsheet'], name, { lastModified: 42 });
const store = () => useOrderImportStore.getState();
const complete = () => requests.filter(request => !request.done).forEach(request => request.resolve({ document_number: request.name }));

describe('order spreadsheet import queue', () => {
  beforeEach(() => {
    requests.length = 0;
    vi.clearAllMocks();
    useOrderImportStore.setState({ rows: [], drawerOpen: false });
  });
  afterEach(async () => {
    await waitFor(() => { complete(); expect(store().rows.some(isOrderImportBusy)).toBe(false); });
  });

  it('selects multiple files before upload, limits concurrent requests and continues with the drawer closed', async () => {
    store().addFiles('org-1', ['a', 'b', 'c', 'd'].map(name => file(`${name}.xlsx`)));
    expect(requests).toHaveLength(0);
    expect(store().rows.every(row => row.phase === 'selected')).toBe(true);
    store().openDrawer();
    store().startSelected('org-1');
    store().startSelected('org-1');
    store().closeDrawer();
    await waitFor(() => expect(requests).toHaveLength(MAX_PARALLEL_ORDER_IMPORTS));
    expect(store().rows.map(row => row.phase)).toEqual(['processing', 'processing', 'processing', 'waiting']);

    requests[0].resolve({ document_number: 'PO-1' });
    await waitFor(() => expect(requests).toHaveLength(4));
    expect(store().rows[0].phase).toBe('imported');
    expect(store().drawerOpen).toBe(false);
    complete();
    await waitFor(() => expect(store().rows.every(row => row.phase === 'imported')).toBe(true));
    expect(requests.every(request => request.path === '/orgs/org-1/orders/parse')).toBe(true);
    expect(queryClient.setQueryData).toHaveBeenCalledWith(['order', 'org-1', 'PO-1'], { document_number: 'PO-1' });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['orders', 'org-1'] });
  });

  it('keeps successful files and retries only the failed file', async () => {
    store().addFiles('org-1', [file('a.xlsx'), file('b.xlsx')]);
    store().startSelected('org-1');
    await waitFor(() => expect(requests).toHaveLength(2));
    requests[0].resolve({ document_number: 'PO-A' });
    requests[1].reject(new Error('Unreadable spreadsheet'));
    await waitFor(() => expect(store().rows.map(row => row.phase)).toEqual(['imported', 'failed']));
    expect(store().rows[1].error).toBe('Unreadable spreadsheet');
    store().retry(store().rows[1].key);
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests.map(request => request.name)).toEqual(['a.xlsx', 'b.xlsx', 'b.xlsx']);
    requests[2].resolve({ document_number: 'PO-B' });
    await waitFor(() => expect(store().rows.every(row => row.phase === 'imported')).toBe(true));
    expect(store().rows[1].error).toBeUndefined();
    store().clearFinished('org-1');
    expect(store().rows).toEqual([]);
  });

  it('rejects unsupported, oversized and duplicate selections while keeping valid files', () => {
    const valid = file('valid.xlsx');
    const tooLarge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.xls');
    const rejected = store().addFiles('org-1', [valid, file('invoice.xml'), tooLarge, valid]);
    expect(rejected.map(item => item.reason)).toEqual(['unsupported', 'tooLarge', 'duplicate']);
    expect(store().rows.map(row => row.file.name)).toEqual(['valid.xlsx']);
    expect(store().addFiles('org-1', [valid])[0].reason).toBe('duplicate');
    store().remove(store().rows[0].key);
    expect(store().rows).toEqual([]);
  });

  it('pins requests to their original organizations and protects files already being processed', async () => {
    store().addFiles('org-1', [file('one.xls')]);
    store().addFiles('org-2', [file('two.xlsx')]);
    store().startSelected('org-1');
    const firstKey = store().rows[0].key;
    store().remove(firstKey);
    expect(store().rows).toHaveLength(2);
    expect(store().rows[1].phase).toBe('selected');
    await waitFor(() => expect(requests).toHaveLength(1));
    store().startSelected('org-2');
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests.map(request => [request.path, request.name])).toEqual([
      ['/orgs/org-1/orders/parse', 'one.xls'], ['/orgs/org-2/orders/parse', 'two.xlsx'],
    ]);
    complete();
    await waitFor(() => expect(store().rows.every(row => row.phase === 'imported')).toBe(true));
    store().clearFinished('org-2');
    expect(store().rows.map(row => row.orgId)).toEqual(['org-1']);
  });
});
