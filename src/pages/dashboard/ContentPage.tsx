import { useEffect, useMemo, useRef, useState } from "react";
import { FileText } from "lucide-react";
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
  /** The page whose sections are open in the drawer (by slug). */
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  /** Accordion: the open section within the drawer (by section id). */
  const [openSectionId, setOpenSectionId] = useState<string | undefined>(undefined);
  /** Per-page section display order (client-side reorder; key = slug). */
  const [sectionOrder, setSectionOrder] = useState<Record<string, string[]>>({});
  /** Section wrapper elements (by section id) so expanding one can scroll it to top. */
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // When a section is expanded, bring its header to the top of the drawer body.
  // Without this the user can be stranded mid-card after a tall sibling
  // collapses. Wait out the max-height transition (300ms) so the target's
  // final position is settled before the smooth scroll.
  useEffect(() => {
    if (!openSectionId) return;
    const el = sectionRefs.current[openSectionId];
    if (!el) return;
    const id = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 320);
    return () => window.clearTimeout(id);
  }, [openSectionId]);

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
  }, [pagesQuery.data]);

  const isSaving = saveContent.isPending;
  const saveFailed = saveContent.isError;

  // ── i18n helpers (fallback-keyed: use the key if a translation exists) ────
  const pageLabel = (page: Page) => {
    const key = `content.page.${page.slug}`;
    return t(key) !== key ? t(key) : page.title || page.slug;
  };
  const sectionLabel = (section: PageSection) => {
    const key = `content.section.${section.sectionType}`;
    return t(key) !== key ? t(key) : section.displayName || section.sectionType;
  };

  // ── save (per-section, from inside the drawer) ────────────────────────────
  const handleSectionSave = (sectionKey: string, updated: ContentSection) => {
    const [pageSlug, sectionType] = sectionKey.split("-");
    const page = pages.find((p) => p.slug === pageSlug);
    const section = page?.sections?.find((s) => s.sectionType === sectionType);
    if (!section) return;
    saveContent.mutate([toUpdate(section.id, updated)]);
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

  const openPage = editingSlug ? pages.find((p) => p.slug === editingSlug) : undefined;
  const drawerSectionIds = openPage ? sectionOrder[openPage.slug] ?? [] : [];
  const drawerSectionsById = new Map((openPage?.sections ?? []).map((s) => [s.id, s]));

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

      {/* Page cards — each opens a drawer with that page's sections */}
      <FadeIn>
        <div className="grid gap-3 sm:grid-cols-2">
          {pages.map((page) => {
            const count = page.sections?.length ?? 0;
            return (
              <button
                key={page.slug}
                type="button"
                className="card card-hover text-left w-full p-5 flex items-start gap-4 group"
                onClick={() => {
                  setEditingSlug(page.slug);
                  setOpenSectionId((sectionOrder[page.slug] ?? [])[0]);
                }}
              >
                <div className="icon-pill icon-pill-lg icon-pill-primary-soft w-12 h-12 flex-shrink-0">
                  <Icon name="fileText" size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="t-h4 !mb-0">{pageLabel(page)}</span>
                    <Badge variant="secondary">
                      {t("content.sectionCount", { count: String(count) })}
                    </Badge>
                  </div>
                  <p className="t-xs text-muted-foreground font-mono">{page.slug}</p>
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
      </FadeIn>

      {/* Page drawer — all the page's sections as collapsible sub-sections */}
      <Drawer
        open={!!openPage}
        onClose={() => setEditingSlug(null)}
        title={openPage ? pageLabel(openPage) : ""}
        subtitle={t("content.pageSubtitle")}
        icon="fileText"
        width={560}
      >
        {openPage && (
          <div className="p-6 flex flex-col gap-3">
            {drawerSectionIds.length === 0 && (
              <p className="t-sm text-muted-foreground py-6 text-center">{t("content.noSections")}</p>
            )}
            {drawerSectionIds.map((sectionId, idx) => {
              const section = drawerSectionsById.get(sectionId);
              if (!section) return null;
              const sectionKey = `${openPage.slug}-${section.sectionType}`;
              const fields = contentData[sectionKey] || {};
              const fieldCount = Object.keys(fields).length;
              const expanded = openSectionId === section.id;
              return (
                <div
                  key={section.id}
                  ref={(el) => { sectionRefs.current[section.id] = el; }}
                  className="scroll-mt-3"
                >
                <SectionWrapper
                  title={sectionLabel(section)}
                  icon={FileText}
                  badge={fieldCount}
                  isExpanded={expanded}
                  onToggle={() => setOpenSectionId(expanded ? undefined : section.id)}
                  disabled={isSaving}
                >
                  {/* Section type + reorder controls */}
                  <div className="flex items-center justify-between gap-2 -mt-1 mb-2">
                    <span className="t-xs text-muted-foreground font-mono">{section.sectionType}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        icon="chevronUp"
                        title={t("content.moveUp")}
                        aria-label={t("content.moveUp")}
                        disabled={idx === 0 || isSaving}
                        onClick={() => moveSection(openPage.slug, section.id, -1)}
                      />
                      <Button
                        variant="ghost"
                        size="xs"
                        icon="chevronDown"
                        title={t("content.moveDown")}
                        aria-label={t("content.moveDown")}
                        disabled={idx === drawerSectionIds.length - 1 || isSaving}
                        onClick={() => moveSection(openPage.slug, section.id, 1)}
                      />
                    </div>
                  </div>

                  <BaseSectionEditor
                    sectionType={sectionKey}
                    content={fields}
                    isSaving={isSaving}
                    onInputChange={() => {}}
                    onSave={(updated) => handleSectionSave(sectionKey, updated)}
                  />
                </SectionWrapper>
                </div>
              );
            })}
          </div>
        )}
      </Drawer>
    </div>
  );
}
