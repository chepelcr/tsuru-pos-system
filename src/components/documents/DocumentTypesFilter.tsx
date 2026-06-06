import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPES } from '@/types/invoice';

interface DocumentTypesFilterProps {
  /** Hacienda document type codes ("01", "04", ...). */
  selectedTypes: string[];
  onChange: (types: string[]) => void;
}

/**
 * Multi-select dropdown for document-type filtering.
 * Mirrors the NewDocumentButton dropdown styling but with checkable rows
 * and a "Todos" sentinel that clears the selection.
 */
export function DocumentTypesFilter({ selectedTypes, onChange }: DocumentTypesFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const allSelected = selectedTypes.length === 0;

  const label = allSelected
    ? 'Todos los tipos'
    : selectedTypes.length === 1
      ? DOCUMENT_TYPES.find((d) => d.code === selectedTypes[0])?.short ?? 'Tipos'
      : `${selectedTypes.length} tipos`;

  const toggle = (code: string) => {
    onChange(
      selectedTypes.includes(code)
        ? selectedTypes.filter((c) => c !== code)
        : [...selectedTypes, code]
    );
  };

  return (
    <div ref={containerRef} className="docs-types-filter relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'docs-types-filter-trigger h-10 px-3 rounded-md border text-xs font-semibold flex items-center gap-2 justify-between transition-colors w-full',
          !allSelected
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border bg-card text-muted-foreground hover:border-primary/40'
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          size={14}
          className={cn('shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-tooltip min-w-[14rem] rounded-lg border border-border bg-card shadow-dropdown py-1">
          <button
            onClick={() => onChange([])}
            className="w-full px-3 py-2 text-left text-xs hover:bg-muted flex items-center gap-2 transition-colors"
          >
            <span
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                allSelected
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-border bg-card'
              )}
            >
              {allSelected && <Check size={12} strokeWidth={3} />}
            </span>
            <span className="label-section">Todos</span>
          </button>

          <div className="h-px bg-border my-1 mx-2" />

          {DOCUMENT_TYPES.map((dt) => {
            const isSelected = selectedTypes.includes(dt.code);
            return (
              <button
                key={dt.code}
                onClick={() => toggle(dt.code)}
                className="w-full px-3 py-2 text-left text-xs hover:bg-muted flex items-center gap-2 transition-colors"
              >
                <span
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                    isSelected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border bg-card'
                  )}
                >
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: dt.dotColor }}
                />
                <span className={cn('label-section !text-[10px]', dt.color)}>
                  {dt.short}
                </span>
                <span className="truncate">{dt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
