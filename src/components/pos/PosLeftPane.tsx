import { cn } from '@/lib/utils';
import { ProductsPanel } from './ProductsPanel';
import { CustomerPanel } from './CustomerPanel';
import { TablesPanel } from './TablesPanel';
import { useBusinessType } from '@/hooks/useBusinessType';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Product } from '@/types';
import type { ClientSearchResult } from '@/hooks/useClientSearch';

export type LeftTab = 'products' | 'clients' | 'tables' | 'cart';

interface CartItem { id: string; qty: number; }

interface PosLeftPaneProps {
  orgId: string;
  activeTab: LeftTab;
  onTabChange: (tab: LeftTab) => void;
  cartItems: CartItem[];
  onAddProduct: (product: Product) => void;
  clients: ClientSearchResult[];
  clientsLoading: boolean;
  clientQuery: string;
  selectedClient: ClientSearchResult | null;
  onClientQueryChange: (v: string) => void;
  onSelectClient: (c: ClientSearchResult) => void;
  /** Session branch code — tables are per branch (TSR-149). */
  branchCode?: number | null;
  activeDocumentId?: string;
  onSelectTable?: (table: import('@/types/table').PosTable) => void;
}

export function PosLeftPane({
  orgId,
  activeTab,
  onTabChange,
  cartItems,
  onAddProduct,
  clients,
  clientsLoading,
  clientQuery,
  selectedClient,
  onClientQueryChange,
  onSelectClient,
  branchCode,
  activeDocumentId,
  onSelectTable,
}: PosLeftPaneProps) {
  const { t } = useLanguage();
  // Fail-closed: the Mesas tab only exists for an org whose business type
  // granted the restaurant module.
  const { isRestaurant } = useBusinessType();
  const TABS: { id: LeftTab; label: string }[] = [
    { id: 'products', label: t('tabs.products') },
    { id: 'clients', label: t('tabs.clients') },
    ...(isRestaurant ? [{ id: 'tables' as LeftTab, label: t('tables.tab') }] : []),
  ];
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-card shrink-0">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'flex-1 py-3 text-[13px] font-semibold transition-colors',
              activeTab === id
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground border-b-2 border-transparent hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'tables' ? (
          <TablesPanel
            orgId={orgId}
            branchCode={branchCode}
            activeDocumentId={activeDocumentId}
            onSelectTable={(tb) => onSelectTable?.(tb)}
          />
        ) : activeTab === 'clients' ? (
          <CustomerPanel
            clients={clients}
            isLoading={clientsLoading}
            query={clientQuery}
            selected={selectedClient}
            onQueryChange={onClientQueryChange}
            onSelect={onSelectClient}
          />
        ) : (
          <ProductsPanel
            orgId={orgId}
            cartItems={cartItems}
            isDesktop={true}
            onAdd={onAddProduct}
          />
        )}
      </div>
    </div>
  );
}
