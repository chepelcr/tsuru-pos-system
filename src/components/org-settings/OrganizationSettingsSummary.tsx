import { useLanguage } from "@/contexts/LanguageContext";
import { HIDEABLE_MODULES, useOrgFeatureVisibility } from "@/store/orgFeatureVisibility";
import { useLocationNames } from "./registered-org/useLocationNames";
import { SettingsDetailRow as Row } from "./SettingsDetailCard";
import type { Organization, OrgContactSettings } from "@/types/organization";

export type OrganizationSettingsSection = "general" | "branding" | "contact" | "payment" | "shipping";

export function OrganizationSettingsSummary({ org, section }: { org: Organization; section: OrganizationSettingsSection }) {
  const { t, language } = useLanguage();
  const boolean = (value: boolean | undefined) => value == null ? undefined : t(value ? "common.yes" : "common.no");
  const money = (value: number | undefined) => value == null ? undefined : new Intl.NumberFormat(language, {
    ...(org.payment?.currency ? { style: "currency", currency: org.payment.currency } : {}),
  }).format(value);

  if (section === "general") return <GeneralSummary org={org} />;
  if (section === "contact") return <ContactSummary contact={org.contact} />;
  if (section === "branding") {
    const branding = org.branding;
    return <dl>
      <Row label={t("orgSettings.branding.logoUrl")} value={branding?.logo_url && <img src={branding.logo_url} alt={t("orgSettings.general.logo")} className="max-h-24 max-w-full object-contain" />} />
      <Row label={t("orgSettings.branding.primaryColor")} value={branding?.primary_color} />
      <Row label={t("orgSettings.branding.secondaryColor")} value={branding?.secondary_color} />
      <Row label={t("orgSettings.branding.fontFamily")} value={branding?.font_family} />
      <Row label={t("orgSettings.branding.faviconUrl")} value={branding?.favicon_url} />
      <Row label={t("orgSettings.branding.loadingIcon")} value={branding?.loading_icon} />
      <Row label={t("orgSettings.branding.productFallbackIcon")} value={branding?.product_fallback_icon} />
    </dl>;
  }
  if (section === "payment") return <dl>
    <Row label={t("orgSettings.payment.currency")} value={org.payment?.currency} />
    <Row label={t("orgSettings.payment.cashOnDelivery")} value={boolean(org.payment?.cash_on_delivery_enabled)} />
    <Row label={t("orgSettings.payment.bankTransfer")} value={boolean(org.payment?.bank_transfer_enabled)} />
    <Row label={t("orgSettings.payment.bankAccountDetails")} value={org.payment?.bank_account_details} />
  </dl>;
  return <dl>
    <Row label={t("orgSettings.shipping.freeShippingThreshold")} value={money(org.shipping?.free_shipping_threshold)} />
    <Row label={t("orgSettings.shipping.defaultShippingCost")} value={money(org.shipping?.default_shipping_cost)} />
    <Row label={t("orgSettings.shipping.enableLocalPickup")} value={boolean(org.shipping?.enable_local_pickup)} />
    <Row label={t("orgSettings.shipping.enableCorreosShipping")} value={boolean(org.shipping?.enable_correos_shipping)} />
    <Row label={t("orgSettings.shipping.enableUberFlash")} value={boolean(org.shipping?.enable_uber_flash)} />
  </dl>;
}

function GeneralSummary({ org }: { org: Organization }) {
  const { t } = useLanguage();
  const hidden = useOrgFeatureVisibility((state) => state.hidden[org.id]);
  const visible = HIDEABLE_MODULES.filter((module) => !hidden?.includes(module));
  return <dl>
    <Row label={t("common.name")} value={org.name} />
    <Row label={t("common.description")} value={org.description} />
    <Row label={t("orgSettings.general.logo")} value={org.logo_url && <img src={org.logo_url} alt={t("orgSettings.general.logo")} className="max-h-24 max-w-full object-contain" />} />
    <Row label={t("businessType.label")} value={t(`businessType.${org.business_type ?? "general"}`)} />
    <Row label={t("businessType.supplier")} value={t(org.is_retail_supplier ? "common.yes" : "common.no")} />
    <Row label={t("businessType.pyme")} value={t(org.is_pyme ? "common.yes" : "common.no")} />
    <Row label={t("orgSettings.features.title")} value={visible.length ? visible.map((module) => t(`feature.${module}`)).join(", ") : t("orgSettings.details.noVisibleFeatures")} />
  </dl>;
}

function ContactSummary({ contact }: { contact: OrgContactSettings | null | undefined }) {
  const { t } = useLanguage();
  const names = useLocationNames({ iso: "188", stateId: contact?.state_id ?? null, countyId: contact?.county_id ?? null,
    districtId: contact?.district_id ?? null, neighborhoodId: contact?.neighborhood_id ?? null });
  const location = [names.state ?? contact?.state, names.county ?? contact?.city, names.district, names.neighborhood, contact?.address].filter(Boolean).join(", ");
  return <dl>
    <Row label={t("common.email")} value={contact?.email} />
    <Row label={t("common.phone")} value={contact?.phone} />
    <Row label={t("common.address")} value={location} />
    <Row label={t("orgSettings.contact.businessHours")} value={contact?.business_hours} />
    <Row label={t("orgSettings.contact.facebook")} value={contact?.facebook_url} />
    <Row label={t("orgSettings.contact.instagram")} value={contact?.instagram_url} />
    <Row label={t("orgSettings.contact.twitter")} value={contact?.twitter_url} />
    <Row label={t("orgSettings.contact.whatsapp")} value={contact?.whatsapp_number} />
  </dl>;
}
