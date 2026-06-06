import { useState } from "react";
import { FadeIn } from "@/components/ui/FadeIn";
import { TerminalGeneralSection } from "./sections/TerminalGeneralSection";
import type { CreateTerminalRequest } from "@/types";

interface TerminalFormProps {
  branchId: number;
  onSave: (data: CreateTerminalRequest) => void;
  isSaving: boolean;
  onClose: () => void;
  renderButtons?: (props: { onCancel: () => void; onSubmit: () => void; isSaving: boolean }) => React.ReactNode;
}

export function TerminalForm({ branchId, onSave, isSaving, onClose, renderButtons }: TerminalFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState<number | "">("");
  const [deviceId, setDeviceId] = useState("");

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    general: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSave({ 
      branch_id: branchId, 
      name: name.trim(), 
      code: Number(code), 
      device_id: deviceId.trim() || undefined 
    });
  };

  return (
    <FadeIn duration={0.3}>
      <form id="terminal-form" onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* General Section */}
        <TerminalGeneralSection
          name={name}
          setName={setName}
          code={code}
          setCode={setCode}
          deviceId={deviceId}
          setDeviceId={setDeviceId}
          isExpanded={expandedSections.general}
          onToggle={() => toggleSection("general")}
        />

        {/* Render buttons if provided (for drawer footer), otherwise render inline */}
        {renderButtons ? (
          renderButtons({
            onCancel: onClose,
            onSubmit: handleSubmit,
            isSaving,
          })
        ) : null}
      </form>
    </FadeIn>
  );
}
