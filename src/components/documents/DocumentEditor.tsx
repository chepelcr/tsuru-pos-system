import { useDocumentStore } from '@/store/documentStore';
import POSIntegratedPage from '@/pages/dashboard/POSIntegratedPage';

interface DocumentEditorProps {
  orgId: string;
  tabId: string;
}

/**
 * Editor view: just the POS surface for the active tab.
 *
 * The tab bar lives in the global navbar (DashboardHeader → DocumentsToolbar).
 * Switching between tabs only updates the `docType` / `tabId` props here,
 * so POS stays mounted and per-tab state (cart, client, receiver, references)
 * is hydrated from the active tab via useDocumentStore selectors.
 */
export function DocumentEditor({ orgId: _orgId, tabId }: DocumentEditorProps) {
  const activeTab = useDocumentStore((s) =>
    s.open_documents.find((d) => d.id === tabId) ?? null
  );

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Pestaña no encontrada.
      </div>
    );
  }

  return <POSIntegratedPage docType={activeTab.doc_type} tabId={activeTab.id} />;
}
