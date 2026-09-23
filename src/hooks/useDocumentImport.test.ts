/** The XML import queue's state machine (TSR-335) — pure, no network. */
import { describe, expect, it } from 'vitest';
import {
  importReducer,
  overallPercent,
  phaseFromEvent,
  phaseFromStatus,
  type ImportRow,
} from './useDocumentImport';

const file = (name: string, size: number) => new File(['x'.repeat(size)], name, { type: 'application/xml' });

/** Selected AND sent — what "Subir" does. */
function added(...files: File[]): ImportRow[] {
  return importReducer(importReducer([], { type: 'add', files }), { type: 'start' });
}

describe('phases', () => {
  it('maps the import status and the Hacienda verdict', () => {
    expect(phaseFromStatus('COMPLETED', 1)).toBe('accepted');
    expect(phaseFromStatus('COMPLETED', 2)).toBe('partial');
    expect(phaseFromStatus('COMPLETED', 3)).toBe('rejected');
    expect(phaseFromStatus('COMPLETED_FOREIGN')).toBe('foreign');
    expect(phaseFromStatus('DUPLICATE')).toBe('duplicate');
    expect(phaseFromStatus('FAILED')).toBe('failed');
    expect(phaseFromStatus('PROCESSING')).toBe('processing');
  });

  it('maps the bell events', () => {
    const event = (kind: string, atv_status?: number) => ({ event_type: `document.import.${kind}`, import_id: 'i', atv_status });
    expect(phaseFromEvent(event('completed', 1))).toBe('accepted');
    expect(phaseFromEvent(event('foreign_environment'))).toBe('foreign');
    expect(phaseFromEvent(event('duplicate'))).toBe('duplicate');
    expect(phaseFromEvent(event('failed'))).toBe('failed');
  });
});

describe('queue', () => {
  it('selecting files only lists them; Subir queues them', () => {
    const rows = importReducer([], { type: 'add', files: [file('a.xml', 1)] });
    expect(rows[0].phase).toBe('selected');
    expect(overallPercent(rows)).toBe(0);
    expect(importReducer(rows, { type: 'start' })[0].phase).toBe('waiting');
  });

  it('a file goes waiting → uploading → processing → settled by its event', () => {
    let rows = added(file('a.xml', 100));
    const key = rows[0].key;
    expect(rows[0].phase).toBe('waiting');
    rows = importReducer(rows, { type: 'started', key, importId: 'imp-1' });
    rows = importReducer(rows, { type: 'progress', key, loaded: 40 });
    expect(rows[0]).toMatchObject({ phase: 'uploading', loaded: 40 });
    rows = importReducer(rows, { type: 'uploaded', key });
    expect(rows[0].phase).toBe('processing');
    rows = importReducer(rows, {
      type: 'event',
      event: { event_type: 'document.import.completed', import_id: 'imp-1', sale_id: 's-1', atv_status: 1 },
    });
    expect(rows[0]).toMatchObject({ phase: 'accepted', saleId: 's-1' });
  });

  it("a document that is not the org's settles as failed with its code", () => {
    let rows = added(file('ajeno.xml', 10));
    rows = importReducer(rows, { type: 'started', key: rows[0].key, importId: 'imp-2' });
    rows = importReducer(rows, { type: 'uploaded', key: rows[0].key });
    rows = importReducer(rows, {
      type: 'event',
      event: { event_type: 'document.import.failed', import_id: 'imp-2', error_code: 'IMPORT_NOT_ORG_DOCUMENT' },
    });
    expect(rows[0]).toMatchObject({ phase: 'failed', errorCode: 'IMPORT_NOT_ORG_DOCUMENT' });
  });

  it('a rehydrate after a reconnect settles what the socket missed, never an already-settled row', () => {
    let rows = added(file('a.xml', 10), file('b.xml', 10));
    rows = importReducer(rows, { type: 'started', key: rows[0].key, importId: 'a' });
    rows = importReducer(rows, { type: 'started', key: rows[1].key, importId: 'b' });
    rows = importReducer(rows, { type: 'uploaded', key: rows[0].key });
    rows = importReducer(rows, { type: 'uploaded', key: rows[1].key });
    rows = importReducer(rows, { type: 'event', event: { event_type: 'document.import.duplicate', import_id: 'b' } });
    rows = importReducer(rows, {
      type: 'hydrate',
      imports: [
        { import_id: 'a', file_name: 'a.xml', status: 'COMPLETED_FOREIGN' },
        { import_id: 'b', file_name: 'b.xml', status: 'COMPLETED', atv_status: 1 },
      ],
    });
    expect(rows.map((row) => row.phase)).toEqual(['foreign', 'duplicate']);
  });

  it('the bar is half upload, half result — full only once every file settled', () => {
    let rows = added(file('a.xml', 300), file('b.xml', 100));
    expect(overallPercent(rows)).toBe(0);
    rows = importReducer(rows, { type: 'started', key: rows[0].key, importId: 'a' });
    rows = importReducer(rows, { type: 'progress', key: rows[0].key, loaded: 150 });
    expect(overallPercent(rows)).toBe(12); // a: 0.5 sent × ½ = 0.25 of 2 files
    rows = importReducer(rows, { type: 'uploaded', key: rows[0].key });
    rows = importReducer(rows, { type: 'started', key: rows[1].key, importId: 'b' });
    rows = importReducer(rows, { type: 'uploaded', key: rows[1].key });
    expect(overallPercent(rows)).toBe(50); // both uploaded, none processed
    rows = importReducer(rows, { type: 'event', event: { event_type: 'document.import.completed', import_id: 'a', atv_status: 1 } });
    expect(overallPercent(rows)).toBe(75);
    rows = importReducer(rows, { type: 'event', event: { event_type: 'document.import.duplicate', import_id: 'b' } });
    expect(overallPercent(rows)).toBe(100);
  });

  it('clear keeps what is still in flight', () => {
    let rows = added(file('a.xml', 1), file('b.xml', 1));
    rows = importReducer(rows, { type: 'failed', key: rows[0].key, errorCode: 'IMPORT_UPLOAD_FAILED' });
    rows = importReducer(rows, { type: 'clear' });
    expect(rows.map((row) => row.fileName)).toEqual(['b.xml']);
  });
});
