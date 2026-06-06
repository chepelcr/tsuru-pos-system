import { useEffect, useMemo, useState } from 'react';
import { FiltersModal } from '@/components/common/FiltersModal';
import { RangeSlider } from '@/components/common/RangeSlider';
import type {
  ComplexSearchFilters,
  DateMode,
  DateOperator,
  NumericMode,
  NumericOperator,
} from '@/types/document';

// Sales-api doesn't expose a totals bounds endpoint yet (WIP) — use a sensible
// fallback range so the slider is usable today. Swap to a fetched min/max when
// the BE lands one.
const TOTAL_SLIDER_MIN = 0;
const TOTAL_SLIDER_MAX = 1_000_000;

interface ComplexSearchModalProps {
  open: boolean;
  filters: ComplexSearchFilters;
  onApply: (filters: ComplexSearchFilters) => void;
  onClose: () => void;
}

/**
 * Documents advanced filters.
 *
 * Date filtering has two modes:
 *  - `single`: operator (`=` / `>=` / `<=`) + one date. The modal converts
 *    these to `start_date` / `end_date` bounds (per-day inclusive) so the
 *    sales-api can stay range-shaped on the wire.
 *  - `range`:  explicit `start_date` + `end_date`.
 *
 * The sales-api filter contract here is still WIP — we already send the full
 * shape (mode + operator + bounds) so the BE can pick it up without an
 * additional FE round trip when it lands.
 */
export function ComplexSearchModal({ open, filters, onApply, onClose }: ComplexSearchModalProps) {
  const [local, setLocal] = useState<ComplexSearchFilters>({ ...filters });
  const patch = (p: Partial<ComplexSearchFilters>) => setLocal((f) => ({ ...f, ...p }));

  useEffect(() => { if (open) setLocal({ ...filters }); }, [open, filters]);

  const dateMode: DateMode = local.dateMode ?? 'range';

  const setMode = (next: DateMode) => {
    if (next === 'single') {
      patch({
        dateMode: 'single',
        dateOp: local.dateOp ?? '=',
        dateValue: local.dateValue ?? local.start_date ?? local.end_date,
        start_date: undefined,
        end_date: undefined,
      });
    } else {
      patch({
        dateMode: 'range',
        dateValue: undefined,
        dateOp: undefined,
      });
    }
  };

  // Whenever the single-mode value or operator changes, resolve it onto
  // start_date/end_date so the page's query layer can stay range-shaped.
  const setSingleValue = (value: string) => {
    const op = local.dateOp ?? '=';
    patch({
      dateValue: value || undefined,
      start_date: !value ? undefined : op === '<=' ? undefined : value,
      end_date:   !value ? undefined : op === '>=' ? undefined : value,
    });
  };
  const setSingleOp = (op: DateOperator) => {
    const v = local.dateValue;
    patch({
      dateOp: op,
      start_date: !v ? undefined : op === '<=' ? undefined : v,
      end_date:   !v ? undefined : op === '>=' ? undefined : v,
    });
  };

  // ── Voucher total ────────────────────────────────────────────────────────
  const totalMode: NumericMode = local.totalMode ?? 'range';
  const totalSliderValue: [number, number] = useMemo(() => {
    const lo = Math.max(TOTAL_SLIDER_MIN, local.totalMin ?? TOTAL_SLIDER_MIN);
    const hi = Math.min(TOTAL_SLIDER_MAX, local.totalMax ?? TOTAL_SLIDER_MAX);
    return [lo, hi];
  }, [local.totalMin, local.totalMax]);

  const setTotalMode = (next: NumericMode) => {
    if (next === 'single') {
      patch({
        totalMode: 'single',
        totalOp: local.totalOp ?? '=',
        totalMin: undefined,
        totalMax: undefined,
      });
    } else {
      patch({ totalMode: 'range', totalValue: undefined, totalOp: undefined });
    }
  };

  const fmtTotal = (n: number) => n.toLocaleString('es-CR');

  // Clear only the fields the modal owns — `searchTerm` lives on the toolbar
  // and shouldn't get nuked when the user resets advanced filters.
  const clear = () =>
    patch({
      status: undefined,
      dateMode: undefined,
      dateOp: undefined,
      dateValue: undefined,
      start_date: undefined,
      end_date: undefined,
      totalMode: undefined,
      totalOp: undefined,
      totalValue: undefined,
      totalMin: undefined,
      totalMax: undefined,
      sort: undefined,
    });

  return (
    <FiltersModal
      open={open}
      onClose={onClose}
      title="Búsqueda avanzada"
      onClear={clear}
      onApply={() => { onApply(local); onClose(); }}
    >
      {/* Status */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Estado</label>
        <select
          value={local.status ?? ''}
          onChange={(e) => patch({ status: (e.target.value as any) || undefined })}
          className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
        >
          <option value="">Todos</option>
          <option value="validated">Aceptados</option>
          <option value="pending">Pendientes</option>
          <option value="rejected">Rechazados</option>
        </select>
      </div>

      {/* Date filter — label left, mode toggle right-aligned. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Fecha</label>
          <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5 h-9 shrink-0" role="tablist">
            {(['single', 'range'] as DateMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={dateMode === m}
                onClick={() => setMode(m)}
                className={`h-7 px-3 rounded text-[12px] font-semibold transition-colors ${
                  dateMode === m
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'single' ? 'Fecha única' : 'Rango'}
              </button>
            ))}
          </div>
        </div>

        {dateMode === 'single' && (
          <div className="grid grid-cols-[90px_1fr] gap-2">
            <select
              value={local.dateOp ?? '='}
              onChange={(e) => setSingleOp(e.target.value as DateOperator)}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
              aria-label="Operador"
            >
              <option value="=">=</option>
              <option value=">=">≥</option>
              <option value="<=">≤</option>
            </select>
            <input
              type="date"
              value={local.dateValue ?? ''}
              onChange={(e) => setSingleValue(e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {dateMode === 'range' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Desde</label>
              <input
                type="date"
                value={local.start_date ?? ''}
                onChange={(e) => patch({ start_date: e.target.value || undefined })}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hasta</label>
              <input
                type="date"
                value={local.end_date ?? ''}
                onChange={(e) => patch({ end_date: e.target.value || undefined })}
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Voucher total — label left, mode toggle right-aligned. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Monto del comprobante</label>
          <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5 h-9 shrink-0" role="tablist">
            {(['single', 'range'] as NumericMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={totalMode === m}
                onClick={() => setTotalMode(m)}
                className={`h-7 px-3 rounded text-[12px] font-semibold transition-colors ${
                  totalMode === m
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'single' ? 'Valor único' : 'Rango'}
              </button>
            ))}
          </div>
        </div>

        {totalMode === 'single' && (
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <select
              value={local.totalOp ?? '='}
              onChange={(e) => patch({ totalOp: e.target.value as NumericOperator })}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
              aria-label="Operador"
            >
              <option value="=">=</option>
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
            </select>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={local.totalValue ?? ''}
              onChange={(e) =>
                patch({ totalValue: e.target.value ? Number(e.target.value) : undefined })
              }
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
              placeholder="0"
            />
          </div>
        )}

        {totalMode === 'range' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mínimo</label>
                <input
                  type="number"
                  min={TOTAL_SLIDER_MIN}
                  max={TOTAL_SLIDER_MAX}
                  inputMode="numeric"
                  value={local.totalMin ?? ''}
                  onChange={(e) => patch({ totalMin: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
                  placeholder={fmtTotal(TOTAL_SLIDER_MIN)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Máximo</label>
                <input
                  type="number"
                  min={TOTAL_SLIDER_MIN}
                  max={TOTAL_SLIDER_MAX}
                  inputMode="numeric"
                  value={local.totalMax ?? ''}
                  onChange={(e) => patch({ totalMax: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
                  placeholder={fmtTotal(TOTAL_SLIDER_MAX)}
                />
              </div>
            </div>
            <RangeSlider
              min={TOTAL_SLIDER_MIN}
              max={TOTAL_SLIDER_MAX}
              value={totalSliderValue}
              onChange={([lo, hi]) => patch({ totalMin: lo, totalMax: hi })}
              format={fmtTotal}
            />
          </div>
        )}
      </div>

      {/* Sort */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ordenar por</label>
        <select
          value={local.sort ?? ''}
          onChange={(e) => patch({ sort: e.target.value || undefined })}
          className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
        >
          <option value="">Fecha desc (por defecto)</option>
          <option value="sale_date,asc">Fecha asc</option>
          <option value="total_amount,desc">Monto desc</option>
          <option value="total_amount,asc">Monto asc</option>
          <option value="consecutive_number,desc">Consecutivo desc</option>
        </select>
      </div>
    </FiltersModal>
  );
}
