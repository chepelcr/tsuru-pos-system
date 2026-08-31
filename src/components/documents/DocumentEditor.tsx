import { useLocation } from 'wouter';
import { useDocumentStore } from '@/store/documentStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFiscalMode } from '@/hooks/useFiscalMode';
import { isManualOrderDocType } from '@/types/invoice';
import { ROUTES } from '@/routePaths';
import { Button, Card, EmptyState } from '@/components/ui';
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
export function DocumentEditor({ orgId, tabId }: DocumentEditorProps) {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const fiscal = useFiscalMode(orgId);
  const activeTab = useDocumentStore((s) =>
    s.open_documents.find((d) => d.id === tabId) ?? null
  );
  const removeDocumentTab = useDocumentStore((s) => s.removeDocumentTab);

  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        {t('documents.tabNotFound')}
      </div>
    );
  }

  // An org with no registered organization cannot build an electronic document
  // — there is no cédula to sign with and no economic activity for the lines.
  // Tabs are persisted, so one can outlive the org's fiscal setup (or predate
  // it). Blocking here beats letting the cashier fill a cart and hit a cryptic
  // "activity code required" at checkout. See docs/MANUAL_ORDERS.md.
  if (fiscal.ordersOnly && !isManualOrderDocType(activeTab.doc_type)) {
    return (
      <div className="px-6 py-10 max-w-[720px] mx-auto">
        <Card className="p-8">
          <EmptyState
            icon="fileText"
            title={t('documents.ordersOnlyTitle')}
            description={t('documents.ordersOnlyBody', {
              type: t(`docTypes.${activeTab.doc_type}`),
            })}
            action={
              <div className="flex gap-2 flex-wrap justify-center">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(ROUTES.DASHBOARD_ORG_FISCAL_INFO)}
                >
                  {t('documents.ordersOnlyAction')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    removeDocumentTab(tabId);
                    navigate(ROUTES.DASHBOARD_DOCUMENTS);
                  }}
                >
                  {t('documents.ordersOnlyClose')}
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  return <POSIntegratedPage docType={activeTab.doc_type} tabId={activeTab.id} />;
}
