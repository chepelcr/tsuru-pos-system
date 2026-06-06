import { ImageIcon } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { ImagePicker } from "@/components/ui/ImagePicker";

interface ImageUploadSectionProps {
  currentUrl?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onFileChange: (file: File | null) => void;
}

export function ImageUploadSection({
  currentUrl,
  isExpanded,
  onToggle,
  onFileChange,
}: ImageUploadSectionProps) {
  return (
    <SectionWrapper
      title="Imagen del producto"
      icon={ImageIcon}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <ImagePicker
        currentUrl={currentUrl}
        onFileChange={onFileChange}
        size={100}
      />
    </SectionWrapper>
  );
}
