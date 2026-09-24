import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useTemplates } from "@/hooks/useTemplates";
import { useLanguage } from "@/contexts/LanguageContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUpdateGeneralSettings } from "@/hooks/useOrgSettings";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { ROUTES } from "@/routePaths";
import { AuthNavbar } from "@/components/layout/AuthNavbar";
import { Card, CardBody, Icon, Input, LocationSelect, Spinner } from "@/components/ui";
import { OrganizationLogoPicker } from "@/components/org-settings/OrganizationLogoPicker";
import { FadeIn } from "@/components/ui/FadeIn";
import { FormField } from "@/components/forms/FormField";
import {
  BusinessIdentityFields,
  type BusinessIdentityValue,
} from "@/components/org-settings/BusinessIdentityFields";
import { Stepper, type StepperStep } from "@/components/common/Stepper";
import { DEFAULT_THEME_ID, isKnownThemeId } from "@/theme/themes";
import { setSelectedOrgId } from "@/lib/selectedOrg";

const BASE_DOMAIN =
  (import.meta.env.VITE_BASE_DOMAIN as string | undefined) || "tsuru.jcampos.dev";

/** Normalize a free-text name into a url-safe slug/subdomain candidate. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const STEPS: StepperStep[] = [
  { id: "info", titleKey: "orgs.create.steps.info" },
  { id: "contact", titleKey: "orgs.create.steps.contact" },
  { id: "template", titleKey: "orgs.create.steps.template" },
];

export default function CreateOrganization() {
  const { user } = useAuthContext();
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const { setThemeId } = useThemeContext();
  const { confirm, ConfirmModal } = useConfirmModal();
  usePageTitle([t("orgs.create.title")]);

  const {
    useUserOrganizations,
    createOrganization,
    completeOnboardingStep2,
    completeOnboardingStep3,
    checkSlugAvailable,
    useUpdateOrgTheme,
  } = useOrganization();

  const userId = user?.userId;
  const { data: orgs = [], isLoading: orgsLoading } = useUserOrganizations(userId);
  const updateTheme = useUpdateOrgTheme();
  const { useTemplateList } = useTemplates();
  const { data: templates = [], isLoading: templatesLoading } = useTemplateList(true);

  // ─── Wizard state (parent owns step + form data) ──────────────────────────
  const [stepIndex, setStepIndex] = useState(0);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const updateGeneral = useUpdateGeneralSettings(userId, createdOrgId ?? undefined);

  // Step 1
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [subdomain, setSubdomain] = useState("");
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  // Business identity (TSR-150). Defaults keep step 1 valid for anyone who
  // ignores it — `general` grants no vertical module, so nothing changes.
  const [identity, setIdentity] = useState<BusinessIdentityValue>({
    business_type: "general",
    is_retail_supplier: false,
    is_pyme: false,
  });
  // Step 1 unfolds in beats instead of showing every field at once: the type
  // question appears once the business has a name. Derived from state, never
  // stored — so resuming a draft opens fully revealed and correcting the name
  // never collapses what is already answered.
  const identityRevealed = name.trim().length > 0;

  // Step 2
  const [email, setEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [state_id, setStateId] = useState<number | null>(null);
  const [county_id, setCountyId] = useState<number | null>(null);
  const [district_id, setDistrictId] = useState<number | null>(null);
  const [neighborhood_id, setNeighborhoodId] = useState<number | null>(null);

  // Step 3
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  // ─── Resume an incomplete organization (onboarding_step < 3) ──────────────
  const resumeHandled = useRef(false);
  useEffect(() => {
    if (resumeHandled.current) return;
    const resumeOrgId = sessionStorage.getItem("resumeOrgId");
    if (!resumeOrgId || orgsLoading) return;

    resumeHandled.current = true;
    const org = orgs.find((o) => o.id === resumeOrgId);
    if (!org) {
      sessionStorage.removeItem("resumeOrgId");
      return;
    }

    setCreatedOrgId(org.id);
    setName(org.name ?? "");
    setSlug(org.slug ?? "");
    setSlugTouched(true);
    setSlugAvailable(true); // existing org already owns its slug
    setSubdomain(org.subdomain ?? org.slug ?? "");
    setSubdomainTouched(true);
    // email/phone/address now live in the embedded contact section (de-dup
    // rule — the flat org-row fields are deprecated).
    setEmail(org.contact?.email ?? "");
    setLogoUrl(org.logo_url ?? "");
    setPhone(org.contact?.phone ?? "");
    setAddress(org.contact?.address ?? "");
    setStateId(org.contact?.state_id ?? null);
    setCountyId(org.contact?.county_id ?? null);
    setDistrictId(org.contact?.district_id ?? null);
    setNeighborhoodId(org.contact?.neighborhood_id ?? null);
    setSelectedTemplateId(org.template_id ?? null);

    const step = org.onboarding_step ?? 1;
    if (step >= 2) setStepIndex(2);
    else setStepIndex(1);
  }, [orgs, orgsLoading]);

  // Normalize drafts created by the older wizard, which stored a template
  // name, and select the first active storefront template for new orgs.
  useEffect(() => {
    if (templates.length === 0) return;
    setSelectedTemplateId((current) => {
      const resolved = templates.find(
        (template) => template.id === current || template.name === current,
      );
      return resolved?.id ?? templates[0].id;
    });
  }, [templates]);

  // ─── Auto-generate slug/subdomain from name (until user edits them) ───────
  useEffect(() => {
    if (stepIndex !== 0) return;
    const candidate = slugify(name);
    if (!slugTouched) setSlug(candidate);
    if (!subdomainTouched) setSubdomain(candidate);
  }, [name, slugTouched, subdomainTouched, stepIndex]);

  // ─── Debounced slug availability check ────────────────────────────────────
  useEffect(() => {
    if (createdOrgId) return; // org already created — slug is fixed
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      return;
    }
    setCheckingSlug(true);
    const timer = setTimeout(async () => {
      const available = await checkSlugAvailable(slug);
      setSlugAvailable(available);
      setCheckingSlug(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [slug, createdOrgId, checkSlugAvailable]);

  // ─── Step validation gates ────────────────────────────────────────────────
  const step1Valid =
    name.trim().length >= 3 &&
    slug.length >= 3 &&
    (createdOrgId ? true : slugAvailable === true) &&
    (subdomain === "" || subdomain.length >= 3);

  const canAdvance =
    stepIndex === 0
      ? step1Valid
      : stepIndex === 1
        ? !logoUploading
        : selectedTemplateId !== null && !templatesLoading;

  const isSaving =
    createOrganization.isPending ||
    completeOnboardingStep2.isPending ||
    completeOnboardingStep3.isPending ||
    logoUploading ||
    updateGeneral.isPending ||
    updateTheme.isPending;

  // ─── Step handlers ────────────────────────────────────────────────────────
  const handleNext = async () => {
    setFormError(null);
    if (!userId) {
      setFormError(t("orgs.create.error.noUser"));
      return;
    }

    if (stepIndex === 0) {
      if (!step1Valid) return;
      try {
        if (!createdOrgId) {
          const org = await createOrganization.mutateAsync({
            name: name.trim(),
            slug,
            subdomain: subdomain || undefined,
            ownerId: userId,
            // Sent at creation so the platform assigns the right vertical
            // modules up front — a new org should be correct on first login,
            // not after a trip to settings.
            ...identity,
          });
          setCreatedOrgId(org.id);
        }
        setStepIndex(1);
      } catch {
        setFormError(t("orgs.create.error.createFailed"));
      }
      return;
    }

    if (stepIndex === 1) {
      if (!createdOrgId) {
        setFormError(t("orgs.create.error.createFailed"));
        return;
      }
      try {
        await updateGeneral.mutateAsync({
          name: name.trim(),
          logo_url: logoUrl || null,
        });
        await completeOnboardingStep2.mutateAsync({
          organizationId: createdOrgId,
          userId,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          state_id: state_id || undefined,
          county_id: county_id || undefined,
          district_id: district_id || undefined,
          neighborhood_id: neighborhood_id || undefined,
        });
        setStepIndex(2);
      } catch {
        setFormError(t("orgs.create.error.contactFailed"));
      }
    }
  };

  const handlePrev = () => {
    setFormError(null);
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const finishOnboarding = async () => {
    if (!userId || !createdOrgId || !selectedTemplateId) {
      setFormError(t("orgs.create.error.createFailed"));
      return;
    }
    setFormError(null);
    try {
      // The storefront template UUID seeds the org's pages and content.
      const org = await completeOnboardingStep3.mutateAsync({
        organizationId: createdOrgId,
        userId,
        templateId: selectedTemplateId,
        includeCategories: true,
      });
      // The POS shell theme is a separate setting. Match it by the template's
      // stable name when available, otherwise retain the default shell theme.
      const posThemeId = isKnownThemeId(selectedTemplate?.name)
        ? selectedTemplate.name
        : DEFAULT_THEME_ID;
      await updateTheme.mutateAsync({ orgId: createdOrgId, theme: posThemeId });
      setThemeId(posThemeId);

      sessionStorage.removeItem("resumeOrgId");
      setSelectedOrgId(org?.id ?? createdOrgId);

      const role = user?.role;
      navigate(role === "cajero" ? "/pos" : ROUTES.DASHBOARD);
    } catch {
      setFormError(t("orgs.create.error.templateFailed"));
    }
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    confirm({
      title: t("orgs.create.confirm.title"),
      message: t("orgs.create.confirm.message", { name: selectedTemplate.display_name }),
      confirmLabel: t("orgs.create.confirm.yes"),
      cancelLabel: t("common.cancel"),
      variant: "success",
      icon: "sparkles",
      onConfirm: finishOnboarding,
    });
  };

  const slugPreview = subdomain || slug || t("orgs.create.subdomainPlaceholder");

  // ─── Loading gate (resume) ────────────────────────────────────────────────
  if (orgsLoading && sessionStorage.getItem("resumeOrgId")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <AuthNavbar />
        <Spinner size={28} label={t("orgs.create.loadingResume")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-10 sm:py-16">
      <AuthNavbar />

      <FadeIn duration={0.3} className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <span className="icon-pill icon-pill-primary-soft w-12 h-12 mx-auto mb-4">
            <Icon name="store" size={24} />
          </span>
          <h1 className="t-h1 mb-1.5">{t("orgs.create.title")}</h1>
          <p className="t-body text-muted-foreground">{t("orgs.create.subtitle")}</p>
        </div>

        <Card>
          <CardBody>
            <Stepper
              steps={STEPS}
              current={stepIndex}
              canAdvance={canAdvance}
              isSaving={isSaving}
              onPrev={handlePrev}
              onNext={handleNext}
              onSave={handleSave}
            >
              {/* ── Step 1: Basic info ── */}
              {stepIndex === 0 && (
                <div className="flex flex-col gap-5">
                  <FormField label={t("orgs.create.fields.name")} required>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("orgs.create.fields.namePlaceholder")}
                      autoFocus
                    />
                  </FormField>

                  <FormField
                    label={t("orgs.create.fields.slug")}
                    required
                    error={
                      !createdOrgId && slugTouched && slugAvailable === false
                        ? t("orgs.create.fields.slugTaken")
                        : undefined
                    }
                  >
                    <div className="relative">
                      <Input
                        value={slug}
                        disabled={!!createdOrgId}
                        onChange={(e) => {
                          setSlugTouched(true);
                          setSlug(slugify(e.target.value));
                        }}
                        placeholder={t("orgs.create.fields.slugPlaceholder")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                        {checkingSlug && <Spinner size={15} />}
                        {!checkingSlug && slug.length >= 3 && slugAvailable === true && (
                          <Icon name="checkCircle" size={16} className="text-success" />
                        )}
                        {!checkingSlug && slug.length >= 3 && slugAvailable === false && (
                          <Icon name="xCircle" size={16} className="text-destructive" />
                        )}
                      </span>
                    </div>
                  </FormField>

                  <FormField label={t("orgs.create.fields.subdomain")}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          value={subdomain}
                          disabled={!!createdOrgId}
                          onChange={(e) => {
                            setSubdomainTouched(true);
                            setSubdomain(slugify(e.target.value));
                          }}
                          placeholder={t("orgs.create.fields.slugPlaceholder")}
                        />
                      </div>
                      <span className="t-sm text-muted-foreground whitespace-nowrap">
                        .{BASE_DOMAIN}
                      </span>
                    </div>
                    <p className="t-xs text-muted-foreground mt-1.5">
                      {t("orgs.create.fields.subdomainHint", {
                        url: `${slugPreview}.${BASE_DOMAIN}`,
                      })}
                    </p>
                  </FormField>

                  {identityRevealed && (
                    <div className="fade-up">
                      <BusinessIdentityFields
                        value={identity}
                        onChange={(patch) =>
                          setIdentity((prev) => ({ ...prev, ...patch }))
                        }
                        progressive
                        showSummary
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 2: Contact info ── */}
              {stepIndex === 1 && (
                <div className="flex flex-col gap-5">
                  <p className="t-sm text-muted-foreground -mt-1">
                    {t("orgs.create.contactHint")}
                  </p>
                  <FormField label={t("orgSettings.general.logo")}>
                    <OrganizationLogoPicker
                      userId={userId!}
                      orgId={createdOrgId!}
                      value={logoUrl}
                      onChange={setLogoUrl}
                      onUploadingChange={setLogoUploading}
                      disabled={!createdOrgId || !userId}
                    />
                    <span className="block t-xs text-muted-foreground mt-1">
                      {t("orgSettings.general.logoDesc")}
                    </span>
                  </FormField>
                  <FormField label={t("orgs.create.fields.email")}>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("orgs.create.fields.emailPlaceholder")}
                    />
                  </FormField>
                  <FormField label={t("common.phone")}>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("orgs.create.fields.phonePlaceholder")}
                    />
                  </FormField>
                  <div className="flex flex-col gap-2">
                    <h3 className="t-h4 !mb-0">{t("orgs.create.fields.location")}</h3>
                    {/* CR default isoCode; LocationSelect's own "otras señas"
                        textarea is the single address field (matches the
                        org-settings contact form). */}
                    <LocationSelect
                      value={{
                        state_id: state_id,
                        county_id: county_id,
                        district_id: district_id,
                        neighborhood_id: neighborhood_id,
                        address,
                      }}
                      onChange={(loc) => {
                        setStateId(loc.state_id ?? null);
                        setCountyId(loc.county_id ?? null);
                        setDistrictId(loc.district_id ?? null);
                        setNeighborhoodId(loc.neighborhood_id ?? null);
                        setAddress(loc.address ?? "");
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ── Step 3: Template / theme selection ── */}
              {stepIndex === 2 && (
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="t-h4 mb-1">{t("orgs.create.template.title")}</h3>
                    <p className="t-sm text-muted-foreground">
                      {t("orgs.create.template.subtitle")}
                    </p>
                  </div>

                  {templatesLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Spinner size={28} />
                    </div>
                  ) : templates.length === 0 ? (
                    <p className="t-sm text-muted-foreground py-6 text-center">
                      {t("storefront.none")}
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {templates.map((template) => {
                        const active = template.id === selectedTemplateId;
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(template.id)}
                            aria-pressed={active}
                            disabled={isSaving}
                            className={`card card-hover text-left w-full p-4 flex flex-col gap-3 group ${
                              active ? "card-primary ring-2 ring-primary/40" : ""
                            }`}
                          >
                            <div className="relative aspect-[16/10] -m-4 mb-0 bg-muted/40 flex items-center justify-center overflow-hidden border-b border-border">
                              {template.thumbnail_url ? (
                                <img
                                  src={template.thumbnail_url}
                                  alt={template.display_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Icon name="store" size={28} className="text-muted-foreground" />
                              )}
                              {active && (
                                <span className="absolute top-2 right-2 icon-pill icon-pill-primary-soft w-7 h-7">
                                  <Icon name="check" size={16} />
                                </span>
                              )}
                            </div>

                            <span className="t-h4 !mb-0 truncate">
                              {template.display_name}
                            </span>
                            <span className="t-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {formError && (
                <p className="t-sm text-destructive mt-4" role="alert">
                  {formError}
                </p>
              )}
            </Stepper>
          </CardBody>
        </Card>
      </FadeIn>

      <ConfirmModal />
    </div>
  );
}
