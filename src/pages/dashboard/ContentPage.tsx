import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ROUTES } from "@/routePaths";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCmsContent } from "@/hooks/useCmsContent";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { Drawer, Icon } from "@/components/ui";
import { BaseSectionEditor } from "@/components/cms/BaseSectionEditor";
import type {
  ContentData,
  ContentSection,
  Page,
  PageSection,
  SectionContentUpdate,
} from "@/types/content";

/** Build the editor model from the fetched pages-with-content payload. */
function groupContent(pages: Page[]): ContentData {
  const grouped: ContentData = {};
  pages.forEach((page) => {
    page.sections?.forEach((section) => {
      const key = `${page.slug}-${section.sectionType}`;
      grouped[key] = (section.content ?? []).reduce((acc, item) => {
        acc[item.key] = item;
        return acc;
      }, {} as ContentSection);
    });
  });
  return grouped;
}

/** Map one section's field map to the bulk-save update shape. */
function toUpdate(sectionId: string, content: ContentSection): SectionContentUpdate {
  return {
    sectionId,
    content: Object.values(content).map((item) => ({
      key: item.key,
      value: item.value,
      valueType: item.valueType,
      displayName: item.displayName,
      description: item.description,
      sortOrder: item.sortOrder,
    })),
  };
}

export default function ContentPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  usePageTitle([t("content.title")]);

  const { pagesQuery, saveContent } = useCmsContent(user?.userId, org?.id);
  const pages = useMemo<Page[]>(() => pagesQuery.data ?? [], [pagesQuery.data]);

  const [contentData, setContentData] = useState<ContentData>({});
  const [activeSlug, setActiveSlug] = useState<string>("");
  /** The section currently open in the edit drawer (by section id). */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Per-page section display order (client-side reorder; key = slug). */
  const [sectionOrder, setSectionOrder] = useState<Record<string, string[]>>({});

  // Hydrate the editor model whenever the server payload arrives.
  useEffect(() => {
    if (!pagesQuery.data) return;
    setContentData(groupContent(pagesQuery.data));

    const order: Record<string, string[]> = {};
    pagesQuery.data.forEach((page) => {
      order[page.slug] = (page.sections ?? [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((s) => s.id);
    });
    setSectionOrder(order);

    if (pagesQuery.data.length > 0) setActiveSlug(pagesQuery.data[0].slug);
  }, [pagesQuery.data]);

  const isSaving = saveContent.isPending;
  const saveFailed = saveContent.isError;
  const activePage = pages.find((p) => p.slug === activeSlug) ?? pages[0];

  // ── i18n helpers (fallback-keyed: use the key if a translation exists) ────
  const pageLabel = (page: Page) => {
    const key = `content.page.${page.slug}`;
    return t(key) !== key ? t(key) : page.title || page.slug;
  };
  const sectionLabel = (section: PageSection) => {
    const key = `content.section.${section.sectionType}`;
    return t(key) !== key ? t(key) : section.displayName || section.sectionType;
  };

  // ── save (per-section, from the drawer) ───────────────────────────────────
  const handleSectionSave = (
    sectionKey: string,
    updated: ContentSection,
    onDone?: () => void,
  ) => {
    const [pageSlug, sectionType] = sectionKey.split("-");
    const page = pages.find((p) => p.slug === pageSlug);
    const section = page?.sections?.find((s) => s.sectionType === sectionType);
    if (!section) return;
    saveContent.mutate([toUpdate(section.id, updated)], { onSuccess: () => onDone?.() });
  };

  // ── section reorder (client-side display order) ───────────────────────────
  const moveSection = (slug: string, sectionId: string, dir: -1 | 1) => {
    setSectionOrder((prev) => {
      const ids = prev[slug] ? [...prev[slug]] : [];
      const idx = ids.indexOf(sectionId);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= ids.length) return prev;
      [ids[idx], ids[next]] = [ids[next], ids[idx]];
      return { ...prev, [slug]: ids };
    });
  };

  // ── render ─────────────────────────────────────────────────────────────────
  if (pagesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (pagesQuery.isError) {
    return (
      <div className="px-6 pt-6 pb-10 max-w-[1100px] mx-auto">
        <EmptyState
          icon="alertTri"
          title={t("content.loadError")}
          description={t("content.loadErrorDescription")}
          action={
            <Button variant="outline" size="sm" icon="refresh" onClick={() => pagesQuery.refetch()}>
              {t("common.retry")}
            </Button>
          }
        />
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="px-6 pt-6 pb-10 max-w-[1100px] mx-auto">
        <EmptyState
          icon="fileText"
          title={t("content.empty")}
          description={t("content.emptyDescription")}
        />
      </div>
    );
  }

  const orderedSectionIds = activePage ? sectionOrder[activePage.slug] ?? [] : [];
  const sectionsById = new Map((activePage?.sections ?? []).map((s) => [s.id, s]));
  const editingSection = editingId ? sectionsById.get(editingId) : undefined;
  const editingKey =
    editingSection && activePage ? `${activePage.slug}-${editingSection.sectionType}` : "";
  const editingIdx = orderedSectionIds.indexOf(editingId ?? "");

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="t-h1 mb-1.5">{t("content.title")}</h1>
          <p className="t-body text-muted-foreground">{t("content.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon="upload"
          onClick={() => navigate(ROUTES.DASHBOARD_DEPLOYMENTS)}
        >
          {t("content.history")}
        </Button>
      </div>

      {saveFailed && (
        <div className="mb-4 px-3 py-2.5 rounded-md bg-destructive/[0.08] border border-destructive/30 text-destructive t-sm">
          {t("content.updateError")}
        </div>
      )}

      {/* Page tabs */}
      <div className="tabs-container mb-5">
        <div className="tabs" role="tablist">
          {pages.map((page) => (
            <button
              key={page.slug}
              type="button"
              role="tab"
              className="tab"
              aria-selected={page.slug === activePage?.slug}
              disabled={isSaving}
              onClick={() => {
                setActiveSlug(page.slug);
                setEditingId(null);
              }}
            >
              {pageLabel(page)}
            </button>
          ))}
        </div>
      </div>

      {/* Sections — card grid (consistent with the org-settings hub) */}
      <FadeIn key={activePage?.slug}>
        {orderedSectionIds.length === 0 ? (
          <p className="t-sm text-muted-foreground py-6 text-center">{t("content.noSections")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {orderedSectionIds.map((sectionId) => {
              const section = sectionsById.get(sectionId);
              if (!section || !activePage) return null;
              const sectionKey = `${activePage.slug}-${section.sectionType}`;
              const fieldCount = Object.keys(contentData[sectionKey] || {}).length;
              return (
                <button
                  key={section.id}
                  type="button"
                  className="card card-hover text-left w-full p-5 flex items-start gap-4 group"
                  onClick={() => setEditingId(section.id)}
                >
                  <div className="icon-pill icon-pill-lg icon-pill-primary-soft w-12 h-12 flex-shrink-0">
                    <Icon name="fileText" size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="t-h4 !mb-0">{sectionLabel(section)}</span>
                      <Badge variant="secondary">
                        {t("content.fieldCount", { count: String(fieldCount) })}
                      </Badge>
                    </div>
                    <p className="t-xs text-muted-foreground font-mono">{section.sectionType}</p>
                  </div>
                  <Icon
                    name="chevronRight"
                    size={18}
                    className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
                  />
                </button>
              );
            })}
          </div>
        )}
      </FadeIn>

      {/* Section edit drawer */}
      <Drawer
        open={!!editingSection}
        onClose={() => setEditingId(null)}
        title={editingSection ? sectionLabel(editingSection) : ""}
        subtitle={t("content.sectionSubtitle")}
        icon="fileText"
        width={520}
      >
        {editingSection && activePage && (
          <div className="p-6">
            {/* Section meta + reorder (no overlap with the card click) */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="t-xs text-muted-foreground font-mono">{editingSection.sectionType}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  icon="chevronUp"
                  title={t("content.moveUp")}
                  aria-label={t("content.moveUp")}
                  disabled={editingIdx <= 0 || isSaving}
                  onClick={() => moveSection(activePage.slug, editingSection.id, -1)}
                />
                <Button
                  variant="ghost"
                  size="xs"
                  icon="chevronDown"
                  title={t("content.moveDown")}
                  aria-label={t("content.moveDown")}
                  disabled={editingIdx < 0 || editingIdx >= orderedSectionIds.length - 1 || isSaving}
                  onClick={() => moveSection(activePage.slug, editingSection.id, 1)}
                />
              </div>
            </div>

            <BaseSectionEditor
              sectionType={editingKey}
              content={contentData[editingKey] || {}}
              isSaving={isSaving}
              onInputChange={() => {}}
              onSave={(updated) => handleSectionSave(editingKey, updated, () => setEditingId(null))}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}
