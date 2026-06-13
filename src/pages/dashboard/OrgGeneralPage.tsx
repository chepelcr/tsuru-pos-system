import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/useRbac";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUpdateGeneralSettings } from "@/hooks/useOrgSettings";
import { Icon, Spinner } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { FormField } from "@/components/forms/FormField";
import { ROUTES } from "@/routePaths";

const buildSchema = (t: (k: string) => string) =>
  z.object({
    name: z.string().min(1, t("orgSettings.general.nameRequired")),
    description: z.string().optional(),
  });

type GeneralValues = z.infer<ReturnType<typeof buildSchema>>;

/**
 * General org-metadata settings — edits ONLY name + description (top-level org
 * fields). email/phone/address moved to the Contact card (contact_settings via
 * PUT /settings/contact) per the de-dup rule.
 *
 * Simple inline card form (no drawer). Hydrates from the org object — there is
 * no GET /settings/general. Persists via PATCH /settings/general, which updates
 * the Organization row directly (reflows into receipts/profile/header).
 */
export default function OrgGeneralPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org, isLoading: orgLoading } = useDefaultOrganization(user?.userId);
  const { t } = useLanguage();
  usePageTitle([t("shell.orgSettings"), t("orgSettings.tab.general")]);
  const [, navigate] = useLocation();

  const [savedNoticeVisible, setSavedNoticeVisible] = useState(false);

  // Fail-open while my-permissions resolves (RBAC_ENFORCEMENT=log rollout).
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can("organization", "update", "general");

  const updateMutation = useUpdateGeneralSettings(user?.userId, org?.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GeneralValues>({
    resolver: zodResolver(buildSchema(t)),
    values: {
      name: org?.name ?? "",
      description: org?.description ?? "",
    },
  });

  const onSubmit = async (data: GeneralValues) => {
    setSavedNoticeVisible(false);
    try {
      await updateMutation.mutateAsync({
        name: data.name,
        description: data.description,
      });
      setSavedNoticeVisible(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // surfaced via updateMutation.isError banner
    }
  };

  if (orgLoading || !org) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-12">
        <div className="text-center text-muted-foreground">
          <Spinner size={28} />
          <p className="t-sm mt-3">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
      <FadeIn duration={0.3}>
        {/* Back + header */}
        <div className="mb-6">
          <button
            className="btn btn-ghost btn-sm !pl-0 mb-3 text-muted-foreground"
            onClick={() => navigate(ROUTES.DASHBOARD_ORG_SETTINGS)}
          >
            <Icon name="arrowLeft" size={15} />
            {t("orgSettings.title")}
          </button>
          <h1 className="t-h1 mb-1">{t("orgSettings.general.title")}</h1>
          <p className="t-body text-muted-foreground">
            {t("orgSettings.general.subtitle")}
          </p>
        </div>

        {savedNoticeVisible && (
          <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
            <Icon name="checkCircle" size={14} className="text-success mt-0.5 flex-shrink-0" />
            <span className="t-sm">{t("orgSettings.general.saved")}</span>
          </div>
        )}

        {updateMutation.isError && (
          <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <Icon name="alertCircle" size={14} className="text-destructive mt-0.5 flex-shrink-0" />
            <span className="t-sm text-destructive">{t("orgSettings.general.saveError")}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="card p-5 space-y-4">
          <FormField label={t("orgSettings.general.name")} required error={errors.name?.message}>
            <input
              className="pp-input w-full"
              type="text"
              placeholder={t("orgSettings.general.namePlaceholder")}
              {...register("name")}
            />
          </FormField>

          <FormField label={t("orgSettings.general.description")} error={errors.description?.message}>
            <textarea
              className="pp-input w-full"
              rows={4}
              placeholder={t("orgSettings.general.descriptionPlaceholder")}
              {...register("description")}
            />
          </FormField>

          {canUpdate && (
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Spinner size={14} /> {t("common.saving")}
                  </>
                ) : (
                  t("common.save")
                )}
              </button>
            </div>
          )}
        </form>
      </FadeIn>
    </div>
  );
}
