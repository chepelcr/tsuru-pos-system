import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBusinessType } from '@/hooks/useBusinessType';
import { useTableMutations, useTables } from '@/hooks/useTables';
import { Icon, Spinner } from '@/components/ui';
import { EmptyState } from '@/components/ui/EmptyState';
import type { PosTable } from '@/types/table';

interface TablesPanelProps {
  orgId?: string;
  /** Integer branch code from the POS session (TSR-149). */
  branchCode?: number | null;
  /** Document tab currently open in the editor, bound when a table is picked. */
  activeDocumentId?: string;
  onSelectTable: (table: PosTable) => void;
}

/**
 * Mesas (restaurant) and cuentas abiertas (bar) in one panel.
 *
 * They are the same object — a named holding place for a cart — so the bar
 * vertical adds a section here rather than a second screen. The "open a tab"
 * affordance only appears for an org with the `bar` module.
 */
export function TablesPanel({
  orgId,
  branchCode,
  activeDocumentId,
  onSelectTable,
}: TablesPanelProps) {
  const { t } = useLanguage();
  const { isBar } = useBusinessType();
  const { data, isLoading } = useTables(orgId, branchCode);
  const { createTable, deleteTable } = useTableMutations(orgId, branchCode);
  const [tabName, setTabName] = useState('');

  const tables = data?.data ?? [];
  const floor = useMemo(() => tables.filter((tb) => !tb.is_dynamic), [tables]);
  const openTabs = useMemo(() => tables.filter((tb) => tb.is_dynamic), [tables]);

  const openTab = async () => {
    const name = tabName.trim();
    if (!name) return;
    await createTable.mutateAsync({
      // The customer's name IS the code for a tab — it is what the bartender
      // calls it, and it only has to be unique while the tab is open.
      code: name.slice(0, 20),
      name,
      is_dynamic: true,
    });
    setTabName('');
  };

  if (branchCode == null) {
    return <EmptyState icon="home" title={t('tables.needsBranch')} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Spinner size={20} />
      </div>
    );
  }

  const renderTable = (tb: PosTable) => {
    const held = !!tb.held_document_id;
    const isCurrent = held && tb.held_document_id === activeDocumentId;
    return (
      <button
        key={tb.table_id}
        onClick={() => onSelectTable(tb)}
        className={cn(
          'flex flex-col items-start gap-1 p-3 rounded-md border text-left transition-colors',
          isCurrent
            ? 'border-primary bg-primary/[0.06]'
            : held
              ? 'border-warning/40 bg-warning/[0.06] hover:border-warning'
              : 'border-border bg-card hover:border-primary/40',
        )}
      >
        <div className="flex items-center gap-1.5 w-full">
          <span className="t-sm font-semibold truncate">{tb.name || tb.code}</span>
          {held && (
            <span className="status-dot status-dot-warning ml-auto shrink-0" />
          )}
        </div>
        <span className="t-xs text-muted-foreground">
          {held
            ? t('tables.held')
            : tb.seats
              ? t('tables.seats', { n: tb.seats })
              : t('tables.free')}
        </span>
        {tb.zone && <span className="badge badge-mini">{tb.zone}</span>}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4 p-3 overflow-y-auto h-full">
      <div>
        <div className="label-section mb-2">{t('tables.floor')}</div>
        {floor.length === 0 ? (
          <p className="t-xs text-muted-foreground">{t('tables.empty')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">{floor.map(renderTable)}</div>
        )}
      </div>

      {isBar && (
        <div>
          <div className="label-section mb-2">{t('tables.tabs')}</div>

          <div className="flex gap-2 mb-2">
            <input
              className="input input-sm flex-1"
              placeholder={t('tables.openTab.name')}
              value={tabName}
              onChange={(e) => setTabName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && openTab()}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={openTab}
              disabled={!tabName.trim() || createTable.isPending}
            >
              <Icon name="plus" size={14} />
              {t('tables.openTab')}
            </button>
          </div>

          {openTabs.length === 0 ? (
            <p className="t-xs text-muted-foreground">{t('tables.emptyTabs')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {openTabs.map((tb) => (
                <div key={tb.table_id} className="relative">
                  {renderTable(tb)}
                  {/* Closing is blocked server-side while an order is held, so
                      the button is hidden rather than showing a doomed action. */}
                  {!tb.held_document_id && (
                    <button
                      className="btn-icon-ghost-xs absolute top-1.5 right-1.5"
                      title={t('tables.close')}
                      onClick={() => deleteTable.mutate(tb.table_id)}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
