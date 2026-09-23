/**
 * The import queue runs outside React (TSR-335): nothing has to stay mounted
 * for uploads to progress, so leaving the page that started them loses nothing.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pending: Array<() => void> = [];

vi.mock('@/lib/api', () => ({
  documentImportsPath: (org: string) => `/orgs/${org}/documents/imports`,
  salesApi: {
    post: vi.fn(async (_path: string, body: { file_name: string }) => ({
      import_id: `imp-${body.file_name}`,
      upload_url: 'https://s3/put',
      upload_headers: {},
    })),
    get: vi.fn(),
  },
}));

vi.mock('@/lib/uploadWithProgress', () => ({
  uploadWithProgress: () => {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => { resolve = r; });
    pending.push(resolve);
    return { promise, abort: () => undefined };
  },
}));

import { MAX_PARALLEL_UPLOADS, useDocumentImportStore } from './useDocumentImport';

const flush = () => new Promise((r) => setTimeout(r, 0));
const file = (name: string) => new File(['<x/>'], name, { type: 'application/xml' });
const phases = () => useDocumentImportStore.getState().rows.map((row) => row.phase);

describe('app-wide import queue', () => {
  beforeEach(() => {
    pending.length = 0;
    useDocumentImportStore.setState({ rows: [], drawer_open: false });
  });

  it('uploads with no component mounted, three at a time, and refills the slots', async () => {
    useDocumentImportStore.getState().addFiles('org-1', ['a', 'b', 'c', 'd'].map((n) => file(`${n}.xml`)));
    await flush();
    expect(pending).toHaveLength(0); // selected, not sent
    useDocumentImportStore.getState().startSelected();
    await flush();
    expect(pending).toHaveLength(MAX_PARALLEL_UPLOADS);
    expect(phases()).toEqual(['uploading', 'uploading', 'uploading', 'waiting']);

    pending[0]();
    await flush();
    await flush();
    expect(phases()).toEqual(['processing', 'uploading', 'uploading', 'uploading']);
    expect(useDocumentImportStore.getState().rows.every((row) => row.orgId === 'org-1')).toBe(true);
  });

  it('closing the drawer leaves the uploads running', async () => {
    const store = useDocumentImportStore.getState();
    store.openDrawer();
    store.addFiles('org-1', [file('a.xml')]);
    store.startSelected();
    store.closeDrawer();
    await flush();
    expect(phases()).toEqual(['uploading']);
    pending[0]();
    await flush();
    expect(phases()).toEqual(['processing']);
  });
});
