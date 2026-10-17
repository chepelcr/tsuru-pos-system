import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { FormField } from "@/components/forms/FormField";
import { OrganizationLogoPicker } from "./OrganizationLogoPicker";
import { BusinessIdentityFields, type BusinessIdentityValue } from "./BusinessIdentityFields";
import { FeatureVisibilityFields } from "./FeatureVisibilityFields";
import { useOrgFeatureVisibility } from "@/store/orgFeatureVisibility";
import type { Organization, OrgGeneralSettings } from "@/types/organization";

export function GeneralSettingsForm({ org, userId, formId, onSubmit, onUploadingChange }: {
  org: Organization; userId: string; formId: string;
  onSubmit: (data: OrgGeneralSettings, hidden: string[]) => Promise<void>;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const { t } = useLanguage();
  const schema = z.object({ name: z.string().min(1, t("orgSettings.general.nameRequired")),
    description: z.string().optional(), logo_url: z.string().url().or(z.literal("")) });
  const { register, handleSubmit, control, formState: { errors } } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema), defaultValues: { name: org.name, description: org.description ?? "", logo_url: org.logo_url ?? "" },
  });
  const [identity, setIdentity] = useState<BusinessIdentityValue>({
    business_type: org.business_type ?? "general", is_retail_supplier: org.is_retail_supplier ?? false, is_pyme: org.is_pyme ?? false,
  });
  const [hidden, setHidden] = useState(() => [...(useOrgFeatureVisibility.getState().hidden[org.id] ?? [])]);

  return <form id={formId} onSubmit={handleSubmit((data) => onSubmit({ ...data, ...identity }, hidden))} className="space-y-5">
    <FormField label={t("common.name")} htmlFor="org-general-name" required error={errors.name?.message}>
      <input id="org-general-name" className="pp-input w-full" aria-invalid={!!errors.name} aria-describedby={errors.name ? "org-general-name-error" : undefined} placeholder={t("orgSettings.general.namePlaceholder")} {...register("name")} />
    </FormField>
    <FormField label={t("common.description")} htmlFor="org-general-description" error={errors.description?.message}>
      <textarea id="org-general-description" className="pp-input w-full" rows={4} placeholder={t("orgSettings.general.descriptionPlaceholder")} {...register("description")} />
    </FormField>
    <FormField label={t("orgSettings.general.logo")} error={errors.logo_url?.message}>
      <Controller control={control} name="logo_url" render={({ field }) => <OrganizationLogoPicker
        userId={userId} orgId={org.id} value={field.value} onChange={field.onChange} onUploadingChange={onUploadingChange} />} />
      <span className="block t-xs text-muted-foreground mt-1">{t("orgSettings.general.logoDesc")}</span>
    </FormField>
    <div className="border-t border-border pt-4"><BusinessIdentityFields value={identity} onChange={(patch) => setIdentity((previous) => ({ ...previous, ...patch }))} /></div>
    <div className="border-t border-border pt-4"><FeatureVisibilityFields orgId={org.id} hiddenModules={hidden} onVisibilityChange={setHidden} /></div>
  </form>;
}
