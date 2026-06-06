import { useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDocumentStore } from '@/store/documentStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ROUTES } from '@/routePaths';
import { DocumentsListView } from '@/components/documents/DocumentsListView';
import { DocumentEditor } from '@/components/documents/DocumentEditor';

/**
 * Parses the active editor tab id from the current URL.
 * Returns null when on the list route.
 */
function parseEditorTabId(location: string): string | null {
  const m = location.match(/^\/dashboard\/documents\/new\/([^/?#]+)/);
  return m?.[1] ?? null;
}

/**
 * DocumentsPage is the persistent container for the entire `/dashboard/documents/*` area.
 * The Documentos navigation (tabs + "+ Nuevo") lives in the global navbar (DashboardHeader),
 * so this page only owns its content (list or editor).
 */
export default function DocumentsPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org, isLoading } = useDefaultOrganization(user?.userId);
  const { open_documents, setActiveDocumentTab } = useDocumentStore();
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();

  const editorTabId = useMemo(() => parseEditorTabId(location), [location]);

  // Page title: list shows just "Documents"; editor adds "- New - {docType}"
  // resolved via the existing docTypes.{code} i18n keys (live-updates on
  // language toggle and tab swap).
  const activeTab = editorTabId ? open_documents.find((d) => d.id === editorTabId) : undefined;
  usePageTitle([
    t('shell.documents'),
    editorTabId && t('common.new'),
    activeTab?.doc_type && t(`docTypes.${activeTab.doc_type}`),
  ]);

  // Keep store's active tab synced with URL; redirect to list if URL points to a stale id.
  useEffect(() => {
    if (editorTabId) {
      const exists = open_documents.some((d) => d.id === editorTabId);
      if (exists) {
        setActiveDocumentTab(editorTabId);
      } else {
        setLocation(ROUTES.DASHBOARD_DOCUMENTS);
      }
    } else {
      setActiveDocumentTab(null);
    }
  }, [editorTabId, open_documents, setActiveDocumentTab, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="text-muted-foreground text-sm">{t('common.loading')}</span>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="text-muted-foreground text-sm">{t('empty.noOrganization')}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-auto">
        {editorTabId ? (
          <DocumentEditor key={editorTabId} orgId={org.id} tabId={editorTabId} />
        ) : (
          <DocumentsListView key="list-view" orgId={org.id} />
        )}
      </div>
    </div>
  );
}
