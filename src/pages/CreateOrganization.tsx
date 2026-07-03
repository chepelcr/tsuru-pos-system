import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useLanguage } from "@/contexts/LanguageContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { ROUTES } from "@/routePaths";
import { AuthNavbar } from "@/components/layout/AuthNavbar";
import { Card, CardBody, Icon, Input, LocationSelect, Spinner } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { FormField } from "@/components/forms/FormField";
import { Stepper, type StepperStep } from "@/components/common/Stepper";
import { THEME_LIST, DEFAULT_THEME_ID, type ThemeDef } from "@/theme/themes";

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

  // ─── Wizard state (parent owns step + form data) ──────────────────────────
  const [stepIndex, setStepIndex] = useState(0);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [subdomain, setSubdomain] = useState("");
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Step 2
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [stateId, setStateId] = useState<number | null>(null);
  const [countyId, setCountyId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [neighborhoodId, setNeighborhoodId] = useState<number | null>(null);

  // Step 3
  const [selectedThemeId, setSelectedThemeId] = useState<string>(DEFAULT_THEME_ID);

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
    setPhone(org.contact?.phone ?? "");
    setAddress(org.contact?.address ?? "");
    setStateId(org.contact?.stateId ?? null);
    setCountyId(org.contact?.countyId ?? null);
    setDistrictId(org.contact?.districtId ?? null);
    setNeighborhoodId(org.contact?.neighborhoodId ?? null);
    setSelectedThemeId(org.template_name ?? DEFAULT_THEME_ID);

    const step = org.onboarding_step ?? 1;
    if (step >= 2) setStepIndex(2);
    else setStepIndex(1);
  }, [orgs, orgsLoading]);

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
    stepIndex === 0 ? step1Valid : stepIndex === 1 ? true : true;

  const isSaving =
    createOrganization.isPending ||
    completeOnboardingStep2.isPending ||
    completeOnboardingStep3.isPending ||
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
        await completeOnboardingStep2.mutateAsync({
          organizationId: createdOrgId,
          userId,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          stateId: stateId || undefined,
          countyId: countyId || undefined,
          districtId: districtId || undefined,
          neighborhoodId: neighborhoodId || undefined,
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
    if (!userId || !createdOrgId) {
      setFormError(t("orgs.create.error.createFailed"));
      return;
    }
    setFormError(null);
    try {
      // The chosen template seeds the org's content; the same id seeds its theme.
      const org = await completeOnboardingStep3.mutateAsync({
        organizationId: createdOrgId,
        userId,
        templateId: selectedThemeId,
        includeCategories: true,
      });
      // Persist + live-apply the selected theme so the shell repaints immediately.
      await updateTheme.mutateAsync({ orgId: createdOrgId, theme: selectedThemeId });
      setThemeId(selectedThemeId);

      sessionStorage.removeItem("resumeOrgId");
      sessionStorage.setItem("selectedOrgId", org?.id ?? createdOrgId);

      const role = user?.role;
      navigate(role === "cajero" ? "/pos" : ROUTES.DASHBOARD);
    } catch {
      setFormError(t("orgs.create.error.templateFailed"));
    }
  };

  const handleSave = () => {
    const theme = THEME_LIST.find((th) => th.id === selectedThemeId);
    confirm({
      title: t("orgs.create.confirm.title"),
      message: t("orgs.create.confirm.message", { name: theme?.name ?? "" }),
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
                </div>
              )}

              {/* ── Step 2: Contact info ── */}
              {stepIndex === 1 && (
                <div className="flex flex-col gap-5">
                  <p className="t-sm text-muted-foreground -mt-1">
                    {t("orgs.create.contactHint")}
                  </p>
                  <FormField label={t("orgs.create.fields.email")}>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("orgs.create.fields.emailPlaceholder")}
                    />
                  </FormField>
                  <FormField label={t("orgs.create.fields.phone")}>
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
                        state_id: stateId,
                        county_id: countyId,
                        district_id: districtId,
                        neighborhood_id: neighborhoodId,
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

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {THEME_LIST.map((theme: ThemeDef) => {
                      const active = theme.id === selectedThemeId;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setSelectedThemeId(theme.id)}
                          aria-pressed={active}
                          disabled={isSaving}
                          className={`card card-hover text-left w-full p-4 flex flex-col gap-3 group ${
                            active ? "card-primary ring-2 ring-primary/40" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="t-h4 !mb-0 truncate">{theme.name}</span>
                            {active && (
                              <span className="icon-pill icon-pill-primary-soft w-7 h-7 flex-shrink-0">
                                <Icon name="check" size={16} />
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2" aria-hidden="true">
                            <span
                              className="w-7 h-7 rounded-full border border-border"
                              style={{ background: `hsl(${theme.light.primary})` }}
                            />
                            <span
                              className="w-7 h-7 rounded-full border border-border"
                              style={{ background: `hsl(${theme.light.secondary})` }}
                            />
                            <span
                              className="w-7 h-7 rounded-full border border-border"
                              style={{ background: `hsl(${theme.light.accent})` }}
                            />
                          </div>

                          <div
                            className="t-body text-muted-foreground leading-snug"
                            style={{ fontFamily: theme.fonts.display }}
                          >
                            {t("orgs.create.template.fontSample")}
                          </div>
                        </button>
                      );
                    })}
                  </div>
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
