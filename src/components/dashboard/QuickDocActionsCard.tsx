import { useLocation } from "wouter";
import { useDocumentStore, newDocTabId } from "@/store/documentStore";
import { ROUTES, documentEditorPath } from "@/routePaths";
import { DOCUMENT_TYPES } from "@/types/invoice";
import type { DocTypeCode } from "@/types/invoice";
import { useCreatableDocTypes } from "@/hooks/useRbac";
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
  // Per-doc-type create gating (documents/<permSub>)
  const creatableDocTypes = useCreatableDocTypes();
  const canCreate = (code: DocTypeCode) =>
    creatableDocTypes.some((dt) => dt.code === code);

  const openNewDoc = (code: DocTypeCode) => {
    const docType = DOCUMENT_TYPES.find((d) => d.code === code)!;
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
        <div className="t-h3 !text-sm mb-1">Crear documento</div>
        <div className="t-xs text-muted-foreground">
          Empieza una factura electrónica, un tiquete o consulta tus documentos.
        </div>
      </div>
      <div className="flex gap-2.5">
        {canCreate('01') && (
        <ActionButton
          label="Crear factura"
          icon="fileText"
          accentClass="hover:border-success [&_.action-icon]:bg-success"
          onClick={() => openNewDoc('01')}
        />
        )}
        {canCreate('04') && (
        <ActionButton
          label="Crear tiquete"
          icon="cash"
          accentClass="hover:border-info [&_.action-icon]:bg-info"
          onClick={() => openNewDoc('04')}
        />
        )}
        <ActionButton
          label="Ver documentos"
          icon="layers"
          accentClass="hover:border-primary [&_.action-icon]:bg-primary"
          onClick={() => setLocation(ROUTES.DASHBOARD_DOCUMENTS)}
        />
      </div>
    </Card>
  );
}
