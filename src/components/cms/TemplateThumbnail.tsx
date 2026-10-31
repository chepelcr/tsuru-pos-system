import { useState } from "react";
import { Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { templateCategoryIcon } from "./templateCategory";
import type { Template } from "@/types";

export const BUNDLED_TEMPLATE_PREVIEWS = [
  "tsuru-demo", "beauty-essentials", "tech-gadgets", "vintage-fashion", "artisan-crafts",
  "gourmet-foods", "fitness-hub", "pet-care", "pollo-porteno", "panaderia",
] as const;

export function templateThumbnailUrl(template: Pick<Template, "name" | "thumbnail_url">): string | undefined {
  return (BUNDLED_TEMPLATE_PREVIEWS as readonly string[]).includes(template.name)
    ? `${import.meta.env.BASE_URL}templates/${template.name}.jpg`
    : template.thumbnail_url;
}

/** Shared by the gallery and preview dialog so both handle missing images alike. */
export function TemplateThumbnail({ template }: { template: Template }) {
  const { t } = useLanguage();
  const src = templateThumbnailUrl(template);
  const [failedSrc, setFailedSrc] = useState<string>();
  if (src && src !== failedSrc) return <img src={src} alt={template.display_name} loading="lazy" decoding="async"
    width={1280} height={800} className="w-full h-full object-cover object-top" onError={() => setFailedSrc(src)} />;

  return <div className="flex flex-col items-center justify-center gap-2 p-5 text-center text-muted-foreground">
    <Icon name={templateCategoryIcon(template.category)} size={32} strokeWidth={1.5} />
    <span className="t-sm font-medium">{template.display_name}</span>
    <span className="t-xs">{t("template.preview.noPreview")}</span>
  </div>;
}
