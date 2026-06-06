import { useState } from "react";
import { Card } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAccordionSections } from "@/hooks/useAccordionSections";
import { BranchGeneralSection } from "./sections/BranchGeneralSection";
import { BranchContactSection } from "./sections/BranchContactSection";
import { BranchLocationSection } from "./sections/BranchLocationSection";
import type { Branch, CreateBranchRequest, BranchType, BranchStatus, LocationData } from "@/types";

interface BranchFormProps {
  editing: Branch | null;
  onSave: (data: CreateBranchRequest) => void;
  isSaving: boolean;
  onClose: () => void;
  renderButtons?: (props: { onCancel: () => void; onSubmit: () => void; isSaving: boolean; isEdit: boolean }) => React.ReactNode;
}

export function BranchForm({ editing, onSave, isSaving, onClose, renderButtons }: BranchFormProps) {
  const { t } = useLanguage();
  const STATUS_LABEL: Record<BranchStatus, string> = { 
    1: t("common.active"), 
    2: t("common.inactive"), 
    3: t("common.delete") 
  };

  const [name, setName] = useState(editing?.name ?? "");
  const [code, setCode] = useState<number | "">(editing?.code ?? "");
  const [type, setType] = useState<BranchType>(editing?.type ?? "stand");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [location, setLocation] = useState<LocationData>({
    state_id: editing?.location?.state_id ?? null,
    county_id: editing?.location?.county_id ?? null,
    district_id: editing?.location?.district_id ?? null,
    neighborhood_id: editing?.location?.neighborhood_id ?? null,
    address: editing?.location?.address ?? "",
  });

  // Section expansion state (accordion: opening one collapses the others)
  const { expanded: expandedSections, toggle: toggleSection } = useAccordionSections({
    general: true,
    contact: true,
    location: true,
  });

  const hasLocation = location.state_id || location.address;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSave({
      name: name.trim(),
      code: Number(code),
      type,
      phone: phone.trim() || undefined,
      location: hasLocation ? {
        state_id: location.state_id,
        county_id: location.county_id,
        district_id: location.district_id,
        neighborhood_id: location.neighborhood_id,
        address: location.address || undefined,
      } : undefined,
    });
  };

  return (
    <FadeIn duration={0.3}>
      <form id="branch-form" onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        {/* General Section */}
        <BranchGeneralSection
          name={name}
          setName={setName}
          code={code}
          setCode={setCode}
          type={type}
          setType={setType}
          isExpanded={expandedSections.general}
          onToggle={() => toggleSection("general")}
        />

        {/* Contact Section */}
        <BranchContactSection
          phone={phone}
          setPhone={setPhone}
          isExpanded={expandedSections.contact}
          onToggle={() => toggleSection("contact")}
        />

        {/* Location Section */}
        <BranchLocationSection
          location={location}
          setLocation={setLocation}
          isExpanded={expandedSections.location}
          onToggle={() => toggleSection("location")}
        />

        {/* Status Card (only when editing) */}
        {editing && (
          <Card className="p-3.5 !bg-muted/40">
            <div className="t-label mb-1.5">Estado actual</div>
            <div className="flex items-center gap-2">
              <span className={`status-dot status-dot-${editing.status === 1 ? "success" : "warning"}`} />
              <span className="text-sm font-semibold">{STATUS_LABEL[editing.status]}</span>
            </div>
            <p className="t-xs mt-1.5 text-muted-foreground">
              Para cambiar el estado usá las acciones en la tarjeta.
            </p>
          </Card>
        )}

        {/* Render buttons if provided (for drawer footer), otherwise render inline */}
        {renderButtons ? (
          renderButtons({
            onCancel: onClose,
            onSubmit: handleSubmit,
            isSaving,
            isEdit: !!editing,
          })
        ) : null}
      </form>
    </FadeIn>
  );
}
