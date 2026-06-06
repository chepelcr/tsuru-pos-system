import { Phone } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { Input, FormLabel } from "@/components/ui";

interface BranchContactSectionProps {
  phone: string;
  setPhone: (value: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export function BranchContactSection({
  phone,
  setPhone,
  isExpanded,
  onToggle,
}: BranchContactSectionProps) {
  return (
    <SectionWrapper
      title="Contacto"
      icon={Phone}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div>
        <FormLabel htmlFor="b-phone">Teléfono</FormLabel>
        <Input
          id="b-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="ej. 2222-3333"
        />
      </div>
    </SectionWrapper>
  );
}
