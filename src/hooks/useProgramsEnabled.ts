import { useMemo } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useCmsContent } from "@/hooks/useCmsContent";

/**
 * Template-gated visibility for the Programs dashboard section (W12).
 *
 * Programs are products of type='program' (store-be W10), surfaced in their own
 * dashboard section ONLY when the org's selected template includes a programs
 * section. We detect that from the org's cloned CMS content
 * (`template_page_sections` → POS `Page.sections`): an active section whose
 * `sectionType === 'programs'` means the template shipped a programs surface to
 * this org (set by TemplateCloneService at onboarding step 3).
 *
 * Mirrors the storefront/templates conditional pattern: the sidebar item / page
 * gate combines this flag AND the RBAC `can('programs','read','programs')`
 * check (see DashboardSidebar `itemVisible`).
 *
 * FAIL-CLOSED while the CMS payload is unknown: unlike the RBAC nav gate (which
 * fails open during the RBAC_ENFORCEMENT=log rollout), the programs section is
 * an opt-in template feature — most orgs don't have it, so showing it before we
 * know would surface an empty/irrelevant section. It only appears once the
 * fetched content confirms a programs section exists.
 */
export function useProgramsEnabled(): { enabled: boolean; isReady: boolean } {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { pagesQuery } = useCmsContent(user?.userId, org?.id);

  const enabled = useMemo(() => {
    const pages = pagesQuery.data ?? [];
    return pages.some((page) =>
      (page.sections ?? []).some(
        (section) =>
          section.sectionType?.toLowerCase() === "programs" &&
          section.isActive !== false
      )
    );
  }, [pagesQuery.data]);

  return { enabled, isReady: pagesQuery.isSuccess };
}
