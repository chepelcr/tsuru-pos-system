import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useTemplates } from "@/hooks/useTemplates";
import { usePermissions } from "@/hooks/useRbac";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Icon, Spinner, EmptyState, FadeIn } from "@/components/ui";
import { SearchInput } from "@/components/forms/SearchInput";
import {
  TemplateCard,
  TemplatePreview,
  TemplatePlaygroundCard,
} from "@/components/cms";
import { ROUTES } from "@/routePaths";
import type { Template } from "@/types";

const ALL = "__all__";

/**
 * Storefront Template Gallery.
 *
 * Lists the global storefront templates, lets the user search/filter by
 * category, preview a template (modal + live-demo link), and APPLY one to the
 * current org. "Apply" re-clones storefront content + sets
 * `Organization.template_name` — guarded by a warning confirm because it
 * OVERWRITES the org's existing storefront content (migration 04 §2B).
 *
 * This sets the STOREFRONT design (the published customer-facing store), NOT
 * the POS admin-shell theme (`Organization.theme`, set on the Theme page). The
 * page surfaces a hint to that effect.
 */
export default function TemplatesPage() {
  const { user } = useAuthContext();
  const { t } = useLanguage();
  const { useDefaultOrganization } = useOrganization();
  const { data: org, isLoading: orgLoading } = useDefaultOrganization(user?.userId);
  const [, navigate] = useLocation();

  const { useTemplateList, useApplyTemplate } = useTemplates();
  const { data: templates, isLoading: templatesLoading } = useTemplateList(true);
  const applyTemplate = useApplyTemplate(user?.userId);

  const { confirm, ConfirmModal } = useConfirmModal();

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canApplyTemplate = !permsReady || can("storefront", "update", "templates");

  usePageTitle([t("storefront.title")]);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    (templates ?? []).forEach((tpl) => tpl.category && set.add(tpl.category));
    return Array.from(set).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (templates ?? []).filter((tpl) => {
      const matchesCategory = category === ALL || tpl.category === category;
      if (!matchesCategory) return false;
      if (!term) return true;
      return (
        tpl.displayName.toLowerCase().includes(term) ||
        tpl.description.toLowerCase().includes(term) ||
        tpl.category.toLowerCase().includes(term)
      );
    });
  }, [templates, search, category]);

  const activeName = org?.template_name;
  const hasFilters = search.trim().length > 0 || category !== ALL;

  const handleApply = (templateId: string | null, label: string) => {
    if (!org) return;
    confirm({
      title: t("storefront.applyConfirm.title"),
      message: t("storefront.applyConfirm.message", { name: label }),
      variant: "warning",
      confirmLabel: t("storefront.applyConfirm.confirm"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        await applyTemplate.mutateAsync({ orgId: org.id, templateId });
        setPreviewTemplate(null);
      },
    });
  };

  if (orgLoading || !org) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[1200px] mx-auto">
        {/* Header skeleton */}
        <div className="mb-5">
          <div className="skeleton-block animate-pulse h-5 w-40 rounded mb-3" />
          <div className="skeleton-block animate-pulse h-8 w-64 rounded mb-2" />
          <div className="skeleton-block animate-pulse h-4 w-96 max-w-full rounded" />
        </div>

        {/* Theme-vs-storefront hint skeleton */}
        <div className="card card-surface-muted flex items-start gap-3 p-4 mb-6">
          <div className="bg-muted/40 animate-pulse w-8 h-8 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-block animate-pulse h-3.5 w-full rounded" />
            <div className="skeleton-block animate-pulse h-3.5 w-2/3 rounded" />
          </div>
        </div>

        {/* Search + category filter skeleton */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="skeleton-block animate-pulse h-10 w-full rounded" />
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-block animate-pulse h-7 w-20 rounded-full" />
            ))}
          </div>
        </div>

        {/* Gallery grid skeleton — mirrors the template-card grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="bg-muted/40 animate-pulse aspect-video w-full" />
              <div className="p-4 space-y-3">
                <div className="skeleton-block animate-pulse h-5 w-3/4 rounded" />
                <div className="space-y-2">
                  <div className="skeleton-block animate-pulse h-3.5 w-full rounded" />
                  <div className="skeleton-block animate-pulse h-3.5 w-5/6 rounded" />
                </div>
                <div className="skeleton-block animate-pulse h-9 w-full rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 pb-12 max-w-[1200px] mx-auto">
      <FadeIn duration={0.3}>
        {/* Header */}
        <div className="mb-5">
          <button
            className="btn btn-ghost btn-sm !pl-0 mb-3 text-muted-foreground"
            onClick={() => navigate(ROUTES.DASHBOARD_ORG_SETTINGS)}
          >
            <Icon name="arrowLeft" size={15} />
            {t("orgSettings.title")}
          </button>
          <h1 className="t-h1 mb-1.5">{t("storefront.title")}</h1>
          <p className="t-body text-muted-foreground">{t("storefront.subtitle")}</p>
        </div>

        {/* Theme-vs-storefront hint */}
        <div className="card card-surface-muted flex items-start gap-3 p-4 mb-6">
          <span className="icon-pill icon-pill-info w-8 h-8 flex-shrink-0">
            <Icon name="info" size={16} />
          </span>
          <p className="t-sm text-muted-foreground">{t("storefront.themeHint")}</p>
        </div>

        {/* Search + category filter */}
        <div className="flex flex-col gap-3 mb-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={t("storefront.searchPlaceholder")}
          />

          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCategory(ALL)}
                aria-pressed={category === ALL}
                className={`badge ${
                  category === ALL ? "badge-primary-soft" : "badge-outline"
                }`}
              >
                {t("storefront.all")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                  className={`badge ${
                    category === cat ? "badge-primary-soft" : "badge-outline"
                  }`}
                >
                  {t(`storefront.category.${cat}`)}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="t-xs text-muted-foreground">
              {t("storefront.showing", { count: filtered.length })}
            </p>
            {hasFilters && (
              <button
                type="button"
                className="t-xs text-primary hover:underline"
                onClick={() => {
                  setSearch("");
                  setCategory(ALL);
                }}
              >
                {t("storefront.clearFilters")}
              </button>
            )}
          </div>
        </div>

        {/* Gallery */}
        {templatesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size={28} />
          </div>
        ) : (templates ?? []).length === 0 ? (
          <EmptyState
            icon="store"
            title={t("storefront.none")}
            description={t("storefront.noneDescription")}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title={t("common.noResults")}
            description={t("storefront.noResultsDescription")}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Playground / start from scratch — only when no filters narrow it out */}
            {!hasFilters && canApplyTemplate && (
              <TemplatePlaygroundCard
                isSelected={!activeName}
                onSelect={() => handleApply(null, t("playground.title"))}
                disabled={applyTemplate.isPending}
              />
            )}

            {filtered.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                isSelected={tpl.name === activeName}
                onPreview={setPreviewTemplate}
                onSelect={(selected) => handleApply(selected.id, selected.displayName)}
                disabled={applyTemplate.isPending}
              />
            ))}
          </div>
        )}
      </FadeIn>

      {/* Preview modal */}
      <TemplatePreview
        template={previewTemplate}
        open={previewTemplate !== null}
        onClose={() => setPreviewTemplate(null)}
        onUse={(tpl) => handleApply(tpl.id, tpl.displayName)}
        isSelected={previewTemplate?.name === activeName}
        disabled={applyTemplate.isPending}
      />

      <ConfirmModal />
    </div>
  );
}
