import type { Template, TemplateTranslation } from "@/types";

/** A template's gallery copy in the reader's language. */
export interface LocalizedTemplate {
  displayName: string;
  tagline: string | null;
  description: string;
  idealFor: string[];
  features: string[];
}

/**
 * Templates carry `translations[lang]` (name, tagline, description, ideal-for,
 * features). A language a template lacks falls back to Spanish, then to the
 * base columns, so a custom template without translations still renders.
 */
export function localizeTemplate(
  template: Pick<Template, "display_name" | "description" | "translations">,
  language: string,
): LocalizedTemplate {
  const own = template.translations?.[language];
  const spanish = template.translations?.es;
  const pick = <K extends keyof TemplateTranslation>(key: K): TemplateTranslation[K] =>
    own?.[key] ?? spanish?.[key];
  return {
    displayName: pick("display_name") || template.display_name,
    tagline: pick("tagline") || null,
    description: pick("description") || template.description,
    idealFor: pick("ideal_for") ?? [],
    features: pick("features") ?? [],
  };
}
