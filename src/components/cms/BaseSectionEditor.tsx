import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ContentField } from "./ContentField";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";
import type { ContentSection } from "@/types/content";
import { EDITOR_COLORS } from "@/theme/editorColors";

interface BaseSectionEditorProps {
  /** The grouping key `${page.slug}-${section.sectionType}`. */
  sectionType: string;
  content: ContentSection;
  /** Per-section save → bulk-save a single-element updates array. */
  onSave: (content: ContentSection) => void;
  /** Lifts each value change to the page (drives page-level dirty + save-all). */
  onInputChange: (key: string, value: string) => void;
  isSaving?: boolean;
}

/**
 * Section body: renders one {@link ContentField} per field plus a per-section
 * save/reset footer (POS `SectionWrapper` has no footer of its own, so this
 * editor provides it). The single/both color-mode toggle logic is ported
 * **verbatim** from the dashboard — it's storefront-contract behavior, not
 * cosmetic.
 *
 * Designed to be rendered as the `children` of a POS `<SectionWrapper>`; the
 * parent (`ContentPage`) owns the accordion expand/collapse + the field-count
 * badge.
 */
export function BaseSectionEditor({
  sectionType,
  content,
  onSave,
  onInputChange,
  isSaving = false,
}: BaseSectionEditorProps) {
  const { t } = useLanguage();
  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canEdit = !permsReady || can("storefront", "update", "content");
  const [localContent, setLocalContent] = useState<ContentSection>(content);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalContent(content);
    setHasChanges(false);
  }, [content]);

  // ── section-level color mode (single | both) — ported verbatim ────────────
  const getSectionMode = (): string => {
    const backgroundStyle = localContent?.backgroundStyle?.value || "";
    try {
      const bgData = JSON.parse(backgroundStyle);
      return bgData.mode || "both";
    } catch {
      return "both";
    }
  };

  const updateSectionMode = (newMode: string) => {
    const updates: Record<string, string> = {};

    if (localContent.backgroundStyle) {
      try {
        const bgData = JSON.parse(localContent.backgroundStyle.value || "{}");
        bgData.mode = newMode;
        updates.backgroundStyle = JSON.stringify(bgData);
      } catch {
        updates.backgroundStyle = JSON.stringify({
          type: "color",
          mode: newMode,
          value: EDITOR_COLORS.white,
        });
      }
    }

    Object.entries(localContent).forEach(([key, item]) => {
      if (item.valueType === "color") {
        try {
          const colorData = JSON.parse(item.value || "{}");
          colorData.mode = newMode;
          if (newMode === "single") {
            colorData.value = colorData.lightValue || colorData.value || EDITOR_COLORS.black;
          } else if (newMode === "both") {
            colorData.lightValue = colorData.lightValue || colorData.value || EDITOR_COLORS.black;
            colorData.darkValue = colorData.darkValue || EDITOR_COLORS.white;
          }
          updates[key] = JSON.stringify(colorData);
        } catch {
          const currentColor = item.value || EDITOR_COLORS.black;
          if (newMode === "single") {
            updates[key] = JSON.stringify({ mode: "single", value: currentColor });
          } else {
            updates[key] = JSON.stringify({
              mode: "both",
              lightValue: currentColor,
              darkValue:
                currentColor === EDITOR_COLORS.black
                  ? EDITOR_COLORS.white
                  : EDITOR_COLORS.black,
            });
          }
        }
      }
    });

    Object.entries(updates).forEach(([key, value]) => handleChange(key, value));
  };

  const handleChange = (key: string, value: string) => {
    setLocalContent((prev) => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
    setHasChanges(true);
    onInputChange(key, value);
  };

  const handleSave = () => {
    onSave(localContent);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalContent(content);
    setHasChanges(false);
  };

  const sortedItems = Object.values(localContent).sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  return (
    <div className="flex flex-col gap-3.5">
      {sortedItems.map((item, index) => (
        <ContentField
          key={item.id}
          item={item}
          value={localContent[item.key]?.value || ""}
          onChange={(value) => handleChange(item.key, value)}
          sectionType={sectionType}
          sectionMode={getSectionMode()}
          onModeChange={updateSectionMode}
          showSeparator={index < sortedItems.length - 1}
          disabled={isSaving}
        />
      ))}

      <div className="flex gap-2 justify-end pt-1.5 border-t border-border/60">
        <Button
          variant="outline"
          size="sm"
          icon="refresh"
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
        >
          {t("common.reset")}
        </Button>
        {canEdit && (
          <Button
            variant="primary"
            size="sm"
            icon="check"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? t("common.saving") : t("content.saveSection")}
          </Button>
        )}
      </div>
    </div>
  );
}
