import { create } from 'zustand';
import { orderFileError, orderFileIdentity, uploadOrderFile, type OrderFileError } from '@/lib/orderImport';

export type OrderImportPhase = 'selected' | 'waiting' | 'processing' | 'imported' | 'failed';
export interface OrderImportRow {
  key: string;
  orgId: string;
  file: File;
  phase: OrderImportPhase;
  error?: string;
}
export interface RejectedOrderFile { name: string; reason: OrderFileError }

interface OrderImportState {
  rows: OrderImportRow[];
  drawerOpen: boolean;
  addFiles: (orgId: string, files: File[]) => RejectedOrderFile[];
  startSelected: (orgId: string) => void;
  retry: (key: string) => void;
  remove: (key: string) => void;
  clearFinished: (orgId: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const MAX_PARALLEL_ORDER_IMPORTS = 3;
export const isOrderImportBusy = (row: OrderImportRow) => row.phase === 'waiting' || row.phase === 'processing';
export const isOrderImportFinished = (row: OrderImportRow) => row.phase === 'imported' || row.phase === 'failed';
let sequence = 0;

/** In-memory queue, like XML imports: closing the drawer never cancels a batch. */
export const useOrderImportStore = create<OrderImportState>((set, get) => ({
  rows: [],
  drawerOpen: false,
  addFiles: (orgId, files) => {
    const rejected: RejectedOrderFile[] = [];
    const seen = new Set(get().rows.filter(row => row.orgId === orgId && !isOrderImportFinished(row)).map(row => orderFileIdentity(row.file)));
    const rows: OrderImportRow[] = [];
    for (const file of files) {
      const identity = orderFileIdentity(file);
      const reason = orderFileError(file) ?? (seen.has(identity) ? 'duplicate' : undefined);
      if (reason) rejected.push({ name: file.name, reason });
      else {
        seen.add(identity);
        rows.push({ key: `${Date.now()}-${sequence++}`, orgId, file, phase: 'selected' });
      }
    }
    set(state => ({ rows: [...state.rows, ...rows] }));
    return rejected;
  },
  startSelected: orgId => {
    set(state => ({ rows: state.rows.map(row => row.orgId === orgId && row.phase === 'selected' ? { ...row, phase: 'waiting' } : row) }));
    pump();
  },
  retry: key => {
    set(state => ({ rows: state.rows.map(row => row.key === key && row.phase === 'failed' ? { ...row, phase: 'waiting', error: undefined } : row) }));
    pump();
  },
  remove: key => set(state => ({ rows: state.rows.filter(row => row.key !== key || isOrderImportBusy(row)) })),
  clearFinished: orgId => set(state => ({ rows: state.rows.filter(row => row.orgId !== orgId || !isOrderImportFinished(row)) })),
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
}));

async function processFile(row: OrderImportRow) {
  try {
    const { queryClient } = await import('@/lib/queryClient');
    const order = await uploadOrderFile(row.orgId, row.file);
    queryClient.setQueryData(['order', row.orgId, order.document_number], order);
    void queryClient.invalidateQueries({ queryKey: ['orders', row.orgId] });
    useOrderImportStore.setState(state => ({ rows: state.rows.map(item => item.key === row.key ? { ...item, phase: 'imported' } : item) }));
  } catch (error) {
    useOrderImportStore.setState(state => ({ rows: state.rows.map(item => item.key === row.key
      ? { ...item, phase: 'failed', error: error instanceof Error ? error.message : undefined }
      : item) }));
  } finally {
    pump();
  }
}

function pump() {
  const { rows } = useOrderImportStore.getState();
  const running = rows.filter(row => row.phase === 'processing').length;
  const next = rows.filter(row => row.phase === 'waiting').slice(0, Math.max(0, MAX_PARALLEL_ORDER_IMPORTS - running));
  // Reserve every slot before awaiting, so adding/retrying files cannot start a request twice.
  const keys = new Set(next.map(row => row.key));
  if (!keys.size) return;
  useOrderImportStore.setState(state => ({ rows: state.rows.map(row => keys.has(row.key) ? { ...row, phase: 'processing' } : row) }));
  next.forEach(row => { void processFile(row); });
}

export function useOrderImport(orgId: string) {
  const allRows = useOrderImportStore(state => state.rows);
  const rows = allRows.filter(row => row.orgId === orgId);
  const started = rows.filter(row => row.phase !== 'selected').length;
  const finished = rows.filter(isOrderImportFinished).length;
  return {
    rows, started, finished,
    selected: rows.filter(row => row.phase === 'selected').length,
    busy: rows.some(isOrderImportBusy),
    percent: started ? Math.floor(finished / started * 100) : 0,
  };
}
