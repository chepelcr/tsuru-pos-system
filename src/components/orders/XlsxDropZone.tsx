import React, { useRef, useState } from 'react';
import { Icon } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Re-skinned xlsx/csv drop zone (POS design system) — models its drag/drop on
 * `ImagePicker` but accepts spreadsheet files. Replaces the dashboard's
 * shadcn `FileDropZone`.
 */

interface XlsxDropZoneProps {
  value: File | null;
  onChange: (file: File | null) => void;
  /** Max size in MB. */
  maxSize?: number;
  accept?: string;
  disabled?: boolean;
}

const DEFAULT_ACCEPT = '.xlsx,.xls';

export function XlsxDropZone({
  value,
  onChange,
  maxSize = 10,
  accept = DEFAULT_ACCEPT,
  disabled = false,
}: XlsxDropZoneProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyFile = (file: File) => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      setError(t('orders.upload.tooLarge'));
      return;
    }
    setError(null);
    onChange(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !value && inputRef.current?.click()}
        className={`w-full rounded-lg border-2 border-dashed flex items-center justify-center p-6 transition-colors ${
          dragging ? 'border-primary bg-primary/[0.06]' : 'border-border bg-muted/35'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : value ? 'cursor-default' : 'cursor-pointer'}`}
      >
        {value ? (
          <div className="flex items-center gap-3 w-full min-w-0">
            <div className="icon-pill icon-pill-success w-10 h-10 flex-shrink-0">
              <Icon name="fileText" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="t-body font-semibold truncate">{value.name}</div>
              <div className="t-xs text-muted-foreground">
                {(value.size / 1024).toFixed(0)} KB
              </div>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                className="btn btn-ghost btn-sm btn-icon text-muted-foreground hover:text-destructive"
                aria-label={t('common.remove')}
              >
                <Icon name="trash" size={15} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground select-none">
            <Icon name="upload" size={26} />
            <div className="text-center">
              <div className="t-body font-semibold">{t('orders.upload.dropHere')}</div>
              <div className="t-xs text-muted-foreground">{t('orders.upload.clickToSelect')}</div>
            </div>
          </div>
        )}
      </div>

      {error && <span className="t-xs text-destructive">{error}</span>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}
