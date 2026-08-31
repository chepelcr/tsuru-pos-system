import { useLocation } from "wouter";
import { useDocumentStore, newDocTabId } from "@/store/documentStore";
import { ROUTES, documentEditorPath } from "@/routePaths";
import { EDITOR_DOCUMENT_TYPES, MANUAL_ORDER_DOC_TYPE } from "@/types/invoice";
import type { EditorDocTypeCode } from "@/types/invoice";
import { useCreatableDocTypes } from "@/hooks/useRbac";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, Icon } from "@/components/ui";

interface ActionButtonProps {
  label: string;
  icon: string;
  accentClass: string;
  onClick: () => void;
}

function ActionButton({ label, icon, accentClass, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-2 px-3 py-4 bg-card border border-border rounded-lg cursor-pointer transition-all hover:-translate-y-px ${accentClass}`}
    >
      <div className="action-icon w-9 h-9 rounded-lg text-white flex items-center justify-center">
        <Icon name={icon} size={18} />
      </div>
      <span className="text-xs font-semibold font-display text-foreground text-center">
        {label}
      </span>
    </button>
  );
}

export function QuickDocActionsCard() {
  const { addDocumentTab } = useDocumentStore();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  // Which editor types this org+role may create. In `orders-only` mode this is
  // just the manual order, so the card offers a pedido instead of an invoice
  // (see useCreatableDocTypes / docs/MANUAL_ORDERS.md).
  const creatableDocTypes = useCreatableDocTypes();
  const canCreate = (code: EditorDocTypeCode) =>
    creatableDocTypes.some((dt) => dt.code === code);

  const openNewDoc = (code: EditorDocTypeCode) => {
    const docType = EDITOR_DOCUMENT_TYPES.find((d) => d.code === code)!;
    const tabId = newDocTabId();
    addDocumentTab({
      id: tabId,
      type: "new",
      title: docType.label,
      doc_type: code,
      data: { document_type: code },
      is_dirty: false,
      opened_at: Date.now(),
    });
    setLocation(documentEditorPath(tabId));
  };

  return (
    <Card className="p-5">
      <div className="mb-3.5">
        <div className="t-h3 !text-sm mb-1">{t("quickDoc.title")}</div>
        <div className="t-xs text-muted-foreground">
          {canCreate(MANUAL_ORDER_DOC_TYPE)
            ? t("quickDoc.subtitleOrders")
            : t("quickDoc.subtitle")}
        </div>
      </div>
      <div className="flex gap-2.5">
        {canCreate(MANUAL_ORDER_DOC_TYPE) && (
        <ActionButton
          label={t("quickDoc.newOrder")}
          icon="package"
          accentClass="hover:border-primary [&_.action-icon]:bg-primary"
          onClick={() => openNewDoc(MANUAL_ORDER_DOC_TYPE)}
        />
        )}
        {canCreate('01') && (
        <ActionButton
          label={t("quickDoc.newInvoice")}
          icon="fileText"
          accentClass="hover:border-success [&_.action-icon]:bg-success"
          onClick={() => openNewDoc('01')}
        />
        )}
        {canCreate('04') && (
        <ActionButton
          label={t("quickDoc.newTicket")}
          icon="cash"
          accentClass="hover:border-info [&_.action-icon]:bg-info"
          onClick={() => openNewDoc('04')}
        />
        )}
        <ActionButton
          label={t("quickDoc.viewDocuments")}
          icon="layers"
          accentClass="hover:border-primary [&_.action-icon]:bg-primary"
          onClick={() => setLocation(ROUTES.DASHBOARD_DOCUMENTS)}
        />
      </div>
    </Card>
  );
}
