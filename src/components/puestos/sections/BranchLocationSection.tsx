import { MapPin } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { LocationSelect } from "@/components/ui";
import type { LocationData } from "@/types";

interface BranchLocationSectionProps {
  location: LocationData;
  setLocation: (value: LocationData) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export function BranchLocationSection({
  location,
  setLocation,
  isExpanded,
  onToggle,
}: BranchLocationSectionProps) {
  return (
    <SectionWrapper
      title="Ubicación"
      icon={MapPin}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <LocationSelect value={location} onChange={setLocation} />
    </SectionWrapper>
  );
}
