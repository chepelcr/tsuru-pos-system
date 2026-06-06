import { useState, useEffect } from "react";
import { useAssignment } from "@/hooks/useAssignment";
import { useOrganization } from "@/hooks/useOrganization";
import { useSessionContext } from "@/store/sessionContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useCartFlow } from "@/hooks/useCartFlow";
import { useClientSearch } from "@/hooks/useClientSearch";
import { useSync } from "@/hooks/useSync";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { DocumentCurrencyProvider } from "@/contexts/DocumentCurrencyContext";
import { useCart } from "@/store/cart";
import { useDocumentStore } from "@/store/documentStore";
import { cn } from "@/lib/utils";
import { PosHeader } from "@/components/pos/PosHeader";
import { PosLeftPane, type LeftTab } from "@/components/pos/PosLeftPane";
import { CartSidebar } from "@/components/pos/CartSidebar";
import { CheckoutDrawer } from "@/components/pos/checkout/CheckoutDrawer";
import { ClientDrawerForm } from "@/components/clients/ClientDrawerForm";
import { POSPageSkeleton } from "@/components/pos/POSPageSkeleton";
import SessionSetupScreen from "@/pages/pos/SessionSetupScreen";
import type { CurrencyCode, DocTypeCode, InvoiceFormData } from "@/types/invoice";
import type { ClientSearchResult } from "@/hooks/useClientSearch";
import type { SaleReceiver } from "@/types/receiver";


interface POSIntegratedPageProps {
  /** When rendered inside DocumentEditor: drives the doc-type badge in CartSidebar */
  docType?: DocTypeCode;
  /** Active document tab id — drives per-tab state hydration */
  tabId?: string;
}

export default function POSIntegratedPage({ docType, tabId }: POSIntegratedPageProps = {}) {
  console.log('[POSIntegratedPage] Component rendering with docType:', docType, 'tabId:', tabId);
  
  const syncStatus = useSync();
  const { user } = useAuthContext();
  console.log('[POSIntegratedPage] User:', user?.userId);
  
  const { useDefaultOrganization } = useOrganization();
  const { data: org, isLoading: orgLoading } = useDefaultOrganization(user?.userId);
  console.log('[POSIntegratedPage] Org loading:', orgLoading, 'org:', org?.id);
  
  const { data: assignment, isLoading: assignmentLoading } = useAssignment();
  console.log('[POSIntegratedPage] Assignment loading:', assignmentLoading, 'assignment:', assignment?.assignment_id);
  
  const sessionCtx = useSessionContext();
  console.log('[POSIntegratedPage] Session context:', sessionCtx);
  
  const { t } = useLanguage();
  // When rendered as the editor body for a document tab, let DocumentsPage own
  // the title (`Documents - New - {docType}`). Only set the POS shell title for
  // the standalone /dashboard/pos route, where `tabId` is undefined.
  usePageTitle([t("shell.pos")], !tabId);
  const isDesktop = useIsDesktop(768);

  const [leftTab, setLeftTab] = useState<LeftTab>("products");
  const [showCheckout, setShowCheckout] = useState(false);
  const [receiverDrawerOpen, setReceiverDrawerOpen] = useState(false);
  const [localReceiver, setLocalReceiver] = useState<SaleReceiver>({});

  // selected_client is per-tab — read from active tab, write via updateDocumentTab.
  // Falls back to local state only when launched without a tabId (legacy /dashboard/pos route).
  const activeTab = useDocumentStore((s) =>
    tabId ? s.open_documents.find((d) => d.id === tabId) ?? null : null
  );
  const updateDocumentTab = useDocumentStore((s) => s.updateDocumentTab);
  const [localSelectedClient, setLocalSelectedClient] = useState<ClientSearchResult | null>(null);
  const selectedClient = tabId ? activeTab?.selected_client ?? null : localSelectedClient;
  // Per-tab receiver (in InvoiceFormData.data.receiver) with local fallback
  const currentReceiver: SaleReceiver =
    (tabId ? (activeTab?.data?.receiver as SaleReceiver | undefined) : undefined) ?? localReceiver;
  const handleSaveReceiver = (next: SaleReceiver) => {
    if (tabId) {
      const data = (activeTab?.data ?? {}) as Partial<InvoiceFormData>;
      updateDocumentTab(tabId, { data: { ...data, receiver: next }, is_dirty: true });
    } else {
      setLocalReceiver(next);
    }
  };

  const setSelectedClient = (c: ClientSearchResult | null) => {
    // Clear the per-sale receiver whenever the client changes so the drawer
    // re-derives from the new client instead of keeping the prior client's edits.
    const isDifferent = c?.client_id !== selectedClient?.client_id;
    if (tabId) {
      const patch: Parameters<typeof updateDocumentTab>[1] = { selected_client: c };
      if (isDifferent) {
        const data = (activeTab?.data ?? {}) as Partial<InvoiceFormData>;
        patch.data = { ...data, receiver: {} };
      }
      updateDocumentTab(tabId, patch);
    } else {
      setLocalSelectedClient(c);
      if (isDifferent) setLocalReceiver({});
    }
  };

  // Get cart actions
  const cartItems = useCart((s) => s.items);
  const setDocType = useCart((s) => s.setDocType);
  const setCartItems = useCart((s) => s.setItems);
  const clearCart = useCart((s) => s.clear);

  // Sync cart store's doc_type when launched from a document tab
  useEffect(() => {
    if (docType) setDocType(docType);
  }, [docType, setDocType]);

  // Restore cart when tab changes (or component mounts).
  // Always runs unconditionally — clears the cart when there's no active tab
  // OR when the tab has no saved items. This prevents stale residue across
  // tab close → new tab cycles.
  //
  // `setCartItems` and `clearCart` update the Zustand cart store SYNCHRONOUSLY,
  // so any effect that runs later in the same commit cycle (like the save effect
  // below) will read the fresh value via `useCart.getState()`.
  useEffect(() => {
    if (!tabId) {
      clearCart();
      return;
    }

    const currentTab = useDocumentStore.getState().open_documents.find((d) => d.id === tabId);

    if (currentTab?.cart_items && Object.keys(currentTab.cart_items).length > 0) {
      setCartItems(currentTab.cart_items);
    } else {
      clearCart();
    }
  }, [tabId, setCartItems, clearCart]);

  // Save cart to the active tab whenever cart items change.
  //
  // Reads `useCart.getState().items` directly instead of relying on the
  // `cartItems` closure. This is critical because:
  //  1. Under React StrictMode (dev), effects double-fire on mount. The closure
  //     captures the value at render time, but `getState()` always returns the
  //     freshest store value — including any updates from the restore effect
  //     that just ran in the same commit cycle.
  //  2. On tab switch with `key={tabId}` remount, the new component starts with
  //     stale cart-store contents from the previous tab. Restore clears those,
  //     and the save then sees the cleared state via getState() rather than the
  //     stale closure.
  useEffect(() => {
    if (!tabId) return;
    const freshItems = useCart.getState().items;
    useDocumentStore.getState().updateDocumentTab(tabId, { cart_items: freshItems });
  }, [cartItems, tabId]);

  const clientsEnabled = leftTab === "clients";
  const { query: clientQuery, setQuery: setClientQuery, clients, isLoading: clientsLoading } =
    useClientSearch(org?.id, clientsEnabled);

  // Document currency lives in the active tab's form data (DocumentSection
  // writes it). Conversion of line totals happens inside useCartFlow.
  const currency: CurrencyCode | undefined = (activeTab?.data as Partial<InvoiceFormData> | undefined)?.currency;
  const flow = useCartFlow({ currency });

  // Called by CheckoutModal — throws on error so the modal can show the error state
  const handleConfirm = async (invoiceData: any) => {
    if (!assignment || !org || !user) throw new Error(t("checkout.error.sessionIncomplete"));
    const branchNumber = sessionCtx.branch_code;
    const terminalNumber = sessionCtx.terminal_code;
    if (!branchNumber || !terminalNumber) throw new Error(t("checkout.error.missingBranchTerminal"));

    const result = await flow.handleConfirmPayment({
      assignmentId: assignment.assignment_id,
      orgId: org.id,
      userId: user.userId,
      branchNumber,
      terminalNumber,
      selectedClient,
      invoiceData,
    });

    // On success, close the document tab so the dirty flag clears.
    // The Receipt step shows briefly via the modal; closing the tab routes the user
    // back to the list (via DocumentsPage's stale-tab redirect) when they tap "Nueva venta".
    if (tabId) {
      useDocumentStore.getState().removeDocumentTab(tabId);
    }

    return result;
  };

  if (orgLoading || assignmentLoading) {
    console.log('[POSIntegratedPage] Loading state - showing skeleton');
    return <POSPageSkeleton />;
  }

  if (!org) {
    console.log('[POSIntegratedPage] No organization - showing error');
    return (
      <div className="flex items-center justify-center h-[60vh] bg-background">
        <span className="text-muted-foreground text-sm">{t("empty.noOrganization")}</span>
      </div>
    );
  }

  if (!sessionCtx.branch_code || !sessionCtx.terminal_code) {
    console.log('[POSIntegratedPage] No session setup - showing SessionSetupScreen');
    return <SessionSetupScreen org={org} />;
  }

  console.log('[POSIntegratedPage] Rendering POS interface');

  const cartSidebar = (
    <CartSidebar
      cartItems={flow.cartItems}
      cartTotal={flow.cartTotal}
      subtotal={flow.subtotal}
      taxAmount={flow.taxAmount}
      items={flow.items}
      selectedClient={selectedClient}
      onAdd={flow.add}
      onRemove={flow.remove}
      onUpdateLine={flow.updateLine}
      onCheckout={() => setShowCheckout(true)}
      onSelectClient={() => setLeftTab("clients")}
      onClearClient={() => setSelectedClient(null)}
      onEditReceiver={() => setReceiverDrawerOpen(true)}
    />
  );

  const leftPane = (
    <PosLeftPane
      orgId={org.id}
      activeTab={leftTab}
      onTabChange={(tab) => {
        setLeftTab(tab);
        if (tab === "clients") setClientQuery("");
      }}
      cartItems={flow.cartItems}
      onAddProduct={flow.add}
      clients={clients}
      clientsLoading={clientsLoading}
      clientQuery={clientQuery}
      selectedClient={selectedClient}
      onClientQueryChange={setClientQuery}
      onSelectClient={(c) => {
        setSelectedClient(c);
        setLeftTab("products");
      }}
    />
  );

  return (
    <DocumentCurrencyProvider currency={currency}>
      {/* Desktop layout */}
      {isDesktop ? (
        <div className="flex flex-col bg-background overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
          <PosHeader
            branchName={sessionCtx.branch_name ?? ""}
            terminalCode={sessionCtx.terminal_code ?? 0}
            userName={user?.firstName ?? user?.name ?? t("pos.cashier")}
            syncStatus={syncStatus}
          />
          <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: "1fr 360px" }}>
            <div className="flex flex-col border-r border-border overflow-hidden">
              {leftPane}
            </div>
            {cartSidebar}
          </div>
        </div>
      ) : (
        /* Mobile layout */
        <div className="flex flex-col bg-background overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
          <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
            <span className="font-display font-bold text-[18px]">
              {sessionCtx.branch_name ?? t("pos.header.fallbackTitle")}
            </span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold border",
                syncStatus === "online"
                  ? "bg-success/12 text-success border-success/30"
                  : "bg-muted text-muted-foreground border-border"
              )}>
                <span className={cn("w-[7px] h-[7px] rounded-full", syncStatus === "online" ? "bg-success" : "bg-muted-foreground")} />
                {syncStatus === "online" ? t("status.online") : syncStatus === "syncing" ? t("status.syncing") : t("status.offline")}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {leftTab === "cart" ? cartSidebar : leftPane}
          </div>

          {/* Mobile bottom tab bar */}
          <div className="flex bg-card border-t border-border shrink-0">
            {(
              [
                { id: "products", label: t("tabs.products") },
                { id: "cart", label: t("tabs.cart"), badge: flow.cartCount },
              ] as { id: "products" | "cart"; label: string; badge?: number }[]
            ).map(({ id, label, badge }) => (
              <button
                key={id}
                onClick={() => {
                  if (id === "cart") {
                    setLeftTab("cart");
                  } else {
                    setLeftTab(id);
                  }
                }}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2.5 relative",
                  leftTab === id
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <span className="text-[10px] font-semibold">{label}</span>
                {badge != null && badge > 0 && (
                  <span className="absolute top-1.5 right-[calc(50%-14px)] min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <CheckoutDrawer
        open={showCheckout}
        cartItems={flow.cartItems}
        cartTotal={flow.cartTotal}
        subtotal={flow.subtotal}
        taxAmount={flow.taxAmount}
        selectedClient={selectedClient}
        orgId={org.id}
        tabId={tabId}
        onClose={() => setShowCheckout(false)}
        onConfirm={async (d) => { await handleConfirm(d); }}
        onEditReceiver={() => setReceiverDrawerOpen(true)}
        onSelectClient={setSelectedClient}
      />

      <ClientDrawerForm
        open={receiverDrawerOpen}
        onClose={() => setReceiverDrawerOpen(false)}
        orgId={org.id}
        mode="receiver"
        receiver={currentReceiver}
        selectedClient={selectedClient}
        onSaveReceiver={handleSaveReceiver}
      />
    </DocumentCurrencyProvider>
  );
}
