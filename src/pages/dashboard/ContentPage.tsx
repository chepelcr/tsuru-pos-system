import { useEffect, useMemo, useState } from "react";
import { FileText, Layers } from "lucide-react";
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
import { SectionWrapper } from "@/components/common/SectionWrapper";
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
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string>("");
  const [openSection, setOpenSection] = useState<string | undefined>(undefined);
  /** Per-page section display order (client-side reorder; key = slug). */
  const [sectionOrder, setSectionOrder] = useState<Record<string, string[]>>({});

  // Hydrate the editor model whenever the server payload arrives.
  useEffect(() => {
    if (!pagesQuery.data) return;
    setContentData(groupContent(pagesQuery.data));
    setHasChanges(false);

    const order: Record<string, string[]> = {};
    pagesQuery.data.forEach((page) => {
      order[page.slug] = (page.sections ?? [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((s) => s.id);
    });
    setSectionOrder(order);

    if (pagesQuery.data.length > 0) {
      setActiveSlug(pagesQuery.data[0].slug);
      const first = pagesQuery.data[0].sections?.[0];
      if (first) setOpenSection(first.id);
    }
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

  // ── editing ───────────────────────────────────────────────────────────────
  const handleInputChange = (sectionKey: string, fieldKey: string, value: string) => {
    setContentData((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [fieldKey]: { ...prev[sectionKey][fieldKey], value },
      },
    }));
    setHasChanges(true);
  };

  const handleSectionSave = (sectionKey: string, updated: ContentSection) => {
    const [pageSlug, sectionType] = sectionKey.split("-");
    const page = pages.find((p) => p.slug === pageSlug);
    const section = page?.sections?.find((s) => s.sectionType === sectionType);
    if (!section) return;
    saveContent.mutate([toUpdate(section.id, updated)], {
      onSuccess: () => setHasChanges(false),
    });
  };

  const handleSaveAll = () => {
    const updates = Object.entries(contentData)
      .map(([sectionKey, content]) => {
        const [pageSlug, sectionType] = sectionKey.split("-");
        const page = pages.find((p) => p.slug === pageSlug);
        const section = page?.sections?.find((s) => s.sectionType === sectionType);
        if (!section) return null;
        return toUpdate(section.id, content);
      })
      .filter(Boolean) as SectionContentUpdate[];

    if (updates.length === 0) return;
    saveContent.mutate(updates, { onSuccess: () => setHasChanges(false) });
  };

  const handleDiscardAll = () => {
    if (!pagesQuery.data) return;
    setContentData(groupContent(pagesQuery.data));
    setHasChanges(false);
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

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
        <div>
          <h1 className="t-h1 mb-1.5">{t("content.title")}</h1>
          <p className="t-body text-muted-foreground">{t("content.subtitle")}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon="layers"
            onClick={() => navigate(ROUTES.DASHBOARD_DEPLOYMENTS)}
          >
            {t("content.history")}
          </Button>
          {hasChanges && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon="close"
                onClick={handleDiscardAll}
                disabled={isSaving}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon="check"
                onClick={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? t("common.saving") : t("common.save")}
              </Button>
            </>
          )}
        </div>
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
                const first = page.sections?.[0];
                setOpenSection(first?.id);
              }}
            >
              {pageLabel(page)}
            </button>
          ))}
        </div>
      </div>

      {/* Sections accordion */}
      <FadeIn key={activePage?.slug}>
        <div className="flex flex-col gap-3">
          {orderedSectionIds.length === 0 && (
            <p className="t-sm text-muted-foreground py-6 text-center">
              {t("content.noSections")}
            </p>
          )}
          {orderedSectionIds.map((sectionId, idx) => {
            const section = sectionsById.get(sectionId);
            if (!section || !activePage) return null;
            const sectionKey = `${activePage.slug}-${section.sectionType}`;
            const fields = contentData[sectionKey] || {};
            const fieldCount = Object.keys(fields).length;
            const expanded = openSection === section.id;

            return (
              <SectionWrapper
                key={section.id}
                title={sectionLabel(section)}
                icon={FileText}
                badge={fieldCount}
                isExpanded={expanded}
                onToggle={() => setOpenSection(expanded ? undefined : section.id)}
                disabled={isSaving}
              >
                {/* Reorder controls + section meta */}
                <div className="flex items-center justify-between gap-2 -mt-1">
                  <div className="flex items-center gap-2">
                    <Layers size={13} className="text-muted-foreground" />
                    <span className="t-xs text-muted-foreground">{section.sectionType}</span>
                    <Badge variant="secondary">
                      {t("content.fieldCount", { count: String(fieldCount) })}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      icon="chevronUp"
                      title={t("content.moveUp")}
                      aria-label={t("content.moveUp")}
                      disabled={idx === 0 || isSaving}
                      onClick={() => moveSection(activePage.slug, section.id, -1)}
                    />
                    <Button
                      variant="ghost"
                      size="xs"
                      icon="chevronDown"
                      title={t("content.moveDown")}
                      aria-label={t("content.moveDown")}
                      disabled={idx === orderedSectionIds.length - 1 || isSaving}
                      onClick={() => moveSection(activePage.slug, section.id, 1)}
                    />
                  </div>
                </div>

                <BaseSectionEditor
                  sectionType={sectionKey}
                  content={fields}
                  isSaving={isSaving}
                  onInputChange={(key, value) => handleInputChange(sectionKey, key, value)}
                  onSave={(updated) => handleSectionSave(sectionKey, updated)}
                />
              </SectionWrapper>
            );
          })}
        </div>
      </FadeIn>
    </div>
  );
}
