/**
 * Upload queue for the XML document import (TSR-335).
 *
 * Per file:  selected → (user clicks Subir) waiting → uploading (bytes) →
 *            processing → one final state.
 *
 *   1. POST /documents/imports {file_name, size}   → import_id + presigned PUT
 *   2. PUT the file to S3 with progress            → the LAST call; S3 notifies
 *                                                     the import worker itself
 *   3. the result arrives as a `document.import.*` bell notification, relayed
 *      through `onDocumentImportEvent` — no polling. After a socket reconnect
 *      the open rows are re-read once with GET /documents/imports?ids=.
 *
 * Up to three files upload at once. The overall percentage is bytes sent over
 * bytes selected — the part the browser controls; the per-row phase shows the
 * rest.
 *
 * The queue is an app-wide store, not page state: uploads keep running while
 * the user works anywhere else in the dashboard, and `DocumentImportTray`
 * (mounted once in the layout) shows their progress and reopens the drawer.
 * Only closing or reloading the tab stops an upload, and the tray warns first.
 */

import { create } from 'zustand';
import { documentImportsPath, salesApi } from '@/lib/api';
import { uploadWithProgress, type UploadHandle } from '@/lib/uploadWithProgress';
import {
  onDocumentImportEvent,
  onRealtimeControlEvent,
  type DocumentImportEvent,
} from '@/lib/realtimeBus';
import type { DocumentImport, DocumentImportList, DocumentImportUpload } from '@/types/documentImport';

export const MAX_PARALLEL_UPLOADS = 3;

export type ImportPhase =
  | 'selected'
  | 'waiting'
  | 'uploading'
  | 'processing'
  | 'accepted'
  | 'partial'
  | 'rejected'
  | 'imported'
  | 'foreign'
  | 'duplicate'
  | 'failed';

export const FINAL_PHASES: ReadonlySet<ImportPhase> = new Set([
  'accepted', 'partial', 'rejected', 'imported', 'foreign', 'duplicate', 'failed',
]);

export interface ImportRow {
  key: string;
  orgId: string;
  file: File;
  fileName: string;
  size: number;
  loaded: number;
  phase: ImportPhase;
  importId?: string;
  saleId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export type ImportAction =
  | { type: 'add'; files: File[]; orgId?: string }
  | { type: 'start' }
  | { type: 'remove'; key: string }
  | { type: 'clear' }
  | { type: 'started'; key: string; importId: string }
  | { type: 'progress'; key: string; loaded: number }
  | { type: 'uploaded'; key: string }
  | { type: 'failed'; key: string; errorCode?: string | null; errorMessage?: string | null }
  | { type: 'retry'; key: string }
  | { type: 'event'; event: DocumentImportEvent }
  | { type: 'hydrate'; imports: DocumentImport[] };

let sequence = 0;

/** The phase an import-status row or event settles a file on. */
export function phaseFromStatus(status: DocumentImport['status'], atvStatus?: number | null): ImportPhase {
  switch (status) {
    case 'COMPLETED':
      return atvStatus === 1 ? 'accepted' : atvStatus === 2 ? 'partial' : atvStatus === 3 ? 'rejected' : 'imported';
    case 'COMPLETED_FOREIGN':
      return 'foreign';
    case 'DUPLICATE':
      return 'duplicate';
    case 'FAILED':
      return 'failed';
    default:
      return 'processing';
  }
}

export function phaseFromEvent(event: DocumentImportEvent): ImportPhase {
  const kind = event.event_type.slice('document.import.'.length);
  if (kind === 'foreign_environment') return 'foreign';
  if (kind === 'duplicate') return 'duplicate';
  if (kind === 'failed') return 'failed';
  if (kind === 'completed') return phaseFromStatus('COMPLETED', event.atv_status);
  return 'processing';
}

export function importReducer(rows: ImportRow[], action: ImportAction): ImportRow[] {
  const patch = (key: string, next: Partial<ImportRow>) =>
    rows.map((row) => (row.key === key ? { ...row, ...next } : row));
  switch (action.type) {
    case 'add':
      return [
        ...rows,
        ...action.files.map((file) => ({
          key: `${Date.now()}-${sequence++}`,
          orgId: action.orgId ?? '',
          file,
          fileName: file.name,
          size: file.size,
          loaded: 0,
          phase: 'selected' as const,
        })),
      ];
    case 'start':
      return rows.map((row) => (row.phase === 'selected' ? { ...row, phase: 'waiting' as const } : row));
    case 'remove':
      return rows.filter((row) => row.key !== action.key || row.phase === 'uploading');
    case 'clear':
      return rows.filter((row) => !FINAL_PHASES.has(row.phase));
    case 'started':
      return patch(action.key, { phase: 'uploading', importId: action.importId, loaded: 0 });
    case 'progress':
      return patch(action.key, { loaded: action.loaded });
    case 'uploaded':
      return rows.map((row) =>
        row.key === action.key && row.phase === 'uploading' ? { ...row, loaded: row.size, phase: 'processing' } : row,
      );
    case 'failed':
      return patch(action.key, { phase: 'failed', errorCode: action.errorCode ?? null, errorMessage: action.errorMessage ?? null });
    case 'retry':
      return patch(action.key, { phase: 'waiting', loaded: 0, importId: undefined, errorCode: null, errorMessage: null });
    case 'event':
      return rows.map((row) =>
        row.importId === action.event.import_id
          ? {
              ...row,
              loaded: row.size,
              phase: phaseFromEvent(action.event),
              saleId: action.event.sale_id ?? row.saleId,
              errorCode: action.event.error_code ?? row.errorCode,
            }
          : row,
      );
    case 'hydrate': {
      const byId = new Map(action.imports.map((item) => [item.import_id, item]));
      return rows.map((row) => {
        const item = row.importId ? byId.get(row.importId) : undefined;
        if (!item || FINAL_PHASES.has(row.phase)) return row;
        return {
          ...row,
          phase: phaseFromStatus(item.status, item.atv_status),
          saleId: item.sale_id ?? row.saleId,
          errorCode: item.error_code ?? row.errorCode,
          errorMessage: item.error_message ?? row.errorMessage,
        };
      });
    }
    default:
      return rows;
  }
}

/** The files the user already sent off — everything but the ones still only selected. */
export function startedRows(rows: ImportRow[]): ImportRow[] {
  return rows.filter((row) => row.phase !== 'selected');
}

/**
 * Overall progress, 0–100, over the started files. Each file is half upload
 * (its bytes) and half result (Hacienda's verdict, a refusal or a failure), so
 * the bar only fills once every file has settled — not the moment the last
 * byte leaves the browser while the import worker is still busy.
 */
export function overallPercent(rows: ImportRow[]): number {
  const started = startedRows(rows);
  if (!started.length) return 0;
  const share = started.reduce((sum, row) => {
    if (FINAL_PHASES.has(row.phase)) return sum + 1;
    const sent = row.phase === 'waiting' || !row.size ? 0 : Math.min(row.loaded, row.size) / row.size;
    return sum + sent / 2;
  }, 0);
  return Math.floor((share / started.length) * 100);
}

/** Files whose bytes are already in S3 (processing or settled). */
export function uploadedCount(rows: ImportRow[]): number {
  return rows.filter((row) => row.phase === 'processing' || (FINAL_PHASES.has(row.phase) && row.importId)).length;
}

interface DocumentImportState {
  rows: ImportRow[];
  drawer_open: boolean;
  dispatch: (action: ImportAction) => void;
  addFiles: (orgId: string, files: File[]) => void;
  startSelected: () => void;
  remove: (key: string) => void;
  retry: (key: string) => void;
  clearFinished: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

/** In-flight PUTs by row key — outside the store, they are not UI state. */
const handles = new Map<string, UploadHandle>();

export const useDocumentImportStore = create<DocumentImportState>((set, get) => ({
  rows: [],
  drawer_open: false,
  dispatch: (action) => {
    set((state) => ({ rows: importReducer(state.rows, action) }));
    pump();
  },
  addFiles: (orgId, files) => {
    subscribeOnce();
    get().dispatch({ type: 'add', files, orgId });
  },
  startSelected: () => get().dispatch({ type: 'start' }),
  remove: (key) => get().dispatch({ type: 'remove', key }),
  retry: (key) => get().dispatch({ type: 'retry', key }),
  clearFinished: () => get().dispatch({ type: 'clear' }),
  openDrawer: () => set({ drawer_open: true }),
  closeDrawer: () => set({ drawer_open: false }),
}));

const dispatch = (action: ImportAction) => useDocumentImportStore.getState().dispatch(action);

async function upload(row: ImportRow) {
  try {
    const created = await salesApi.post<DocumentImportUpload>(documentImportsPath(row.orgId), {
      file_name: row.fileName,
      size: row.size,
    });
    dispatch({ type: 'started', key: row.key, importId: created.import_id });
    const handle = uploadWithProgress(created.upload_url, row.file, created.upload_headers, ({ loaded }) =>
      dispatch({ type: 'progress', key: row.key, loaded }),
    );
    handles.set(row.key, handle);
    await handle.promise;
    dispatch({ type: 'uploaded', key: row.key });
  } catch (error) {
    dispatch({
      type: 'failed',
      key: row.key,
      errorCode: 'IMPORT_UPLOAD_FAILED',
      errorMessage: error instanceof Error ? error.message : null,
    });
  } finally {
    handles.delete(row.key);
    pump();
  }
}

/** Keep up to MAX_PARALLEL_UPLOADS uploads running. */
function pump() {
  const { rows } = useDocumentImportStore.getState();
  const running = rows.filter((row) => row.phase === 'uploading' || handles.has(row.key)).length;
  const next = rows.filter((row) => row.phase === 'waiting' && !handles.has(row.key));
  next.slice(0, Math.max(0, MAX_PARALLEL_UPLOADS - running)).forEach((row) => {
    // Reserve the slot before the first await so a second pump does not double-start it.
    handles.set(row.key, { promise: Promise.resolve(), abort: () => undefined });
    void upload(row);
  });
}

let subscribed = false;

/** Results over the single AppSync socket (relayed by the bell), plus a re-read after a reconnect. */
function subscribeOnce() {
  if (subscribed) return;
  subscribed = true;
  onDocumentImportEvent((event: DocumentImportEvent) => dispatch({ type: 'event', event }));
  onRealtimeControlEvent((event) => {
    if (event.kind !== 'reconnected') return;
    const open = useDocumentImportStore
      .getState()
      .rows.filter((row) => row.importId && !FINAL_PHASES.has(row.phase));
    const byOrg = new Map<string, string[]>();
    open.forEach((row) => byOrg.set(row.orgId, [...(byOrg.get(row.orgId) ?? []), row.importId as string]));
    byOrg.forEach((ids, orgId) => {
      void salesApi
        .get<DocumentImportList>(documentImportsPath(orgId, `?ids=${ids.join(',')}`))
        .then((list) => dispatch({ type: 'hydrate', imports: list.items }))
        .catch(() => undefined);
    });
  });
}

/** True while a file is still being sent — closing the tab would lose it. */
export function isUploading(rows: ImportRow[]): boolean {
  return rows.some((row) => row.phase === 'waiting' || row.phase === 'uploading');
}

/** The queue as the drawer and the tray read it. */
export function useDocumentImport() {
  const rows = useDocumentImportStore((state) => state.rows);
  const actions = useDocumentImportStore.getState();
  return {
    rows,
    percent: overallPercent(rows),
    settled: rows.filter((row) => FINAL_PHASES.has(row.phase)).length,
    uploaded: uploadedCount(rows),
    started: startedRows(rows).length,
    selected: rows.filter((row) => row.phase === 'selected').length,
    busy: isUploading(rows),
    addFiles: actions.addFiles,
    startSelected: actions.startSelected,
    remove: actions.remove,
    retry: actions.retry,
    clearFinished: actions.clearFinished,
  };
}
