import { ImageIcon } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { useLanguage } from "@/contexts/LanguageContext";

interface ImageUploadSectionProps {
  /** Current image URL (org media library / CloudFront). */
  value: string;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (url: string) => void;
}

export function ImageUploadSection({
  value,
  isExpanded,
  onToggle,
  onChange,
}: ImageUploadSectionProps) {
  const { t } = useLanguage();
  return (
    <SectionWrapper
      title={t("products.image")}
      icon={ImageIcon}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <MediaPicker value={value} onChange={onChange} />
    </SectionWrapper>
  );
}
