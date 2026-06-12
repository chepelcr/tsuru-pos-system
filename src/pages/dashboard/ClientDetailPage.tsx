import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ROUTES } from "@/routePaths";
import { useOrgContext } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  useClient,
  useUpdateClient,
  useUpdateClientStatus,
  clientDisplayName,
  formatPhone,
  type Client,
  type CreateClientDto,
} from "@/hooks/useClients";
import ClientFormBody from "@/components/clients/ClientFormBody";
import { usePermissions } from "@/hooks/useRbac";
import { ID_TYPE_SHORT, ID_TYPE_LABEL } from "@/lib/enums";
import { Card, Icon, Drawer, Button, Badge, Menu } from "@/components/ui";
import { initials, avatarColor } from "@/utils/avatar";
import { ClientNotes } from "@/components/clients/ClientNotes";
import { ClientStoresList } from "@/components/clients/ClientStoresList";
import { ClientDepartmentsList } from "@/components/clients/ClientDepartmentsList";
import { ClientOrderHistory } from "@/components/clients/ClientOrderHistory";
import { ClientWhatsAppButton } from "@/components/clients/ClientWhatsAppButton";

function buildForm(client?: Client | null): CreateClientDto {
  return {
    customer_type: client?.customer_type ?? 3,
    client_name: client?.client_name ?? "",
    business_name: client?.business_name ?? "",
    client_gln: client?.client_gln ?? "",
    nationality: client?.nationality ?? "188",
    email: client?.email ?? "",
    identification: { code: client?.identification?.code ?? "01", number: client?.identification?.number ?? "" },
    phone: { country_code: client?.phone?.country_code ?? "188", area_code: client?.phone?.area_code ?? "", number: client?.phone?.number ?? "", description: "" },
    residence: { state_id: client?.residence?.state_id ?? undefined, county_id: client?.residence?.county_id ?? undefined, district_id: client?.residence?.district_id ?? undefined, neighborhood_id: client?.residence?.neighborhood_id ?? undefined, address: client?.residence?.address ?? "" },
  };
}

function EditDrawer({ open, onClose, client }: { open: boolean; onClose: () => void; client?: Client | null }) {
  const { t } = useLanguage();
  const { orgId } = useOrgContext();
  const updateMutation = useUpdateClient(orgId);
  const [form, setForm] = useState<CreateClientDto>(() => buildForm(client));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setForm(buildForm(client)); setError(null); }
  }, [open, client]);

  async function handleSave() {
    if (!form.business_name?.trim() && !form.client_gln?.trim()) {
      setError(t("clients.validation.nameOrGlnRequired")); return;
    }
    if (!form.identification?.number?.trim()) {
      setError(t("clients.validation.idRequired")); return;
    }
    if (!form.email?.trim()) {
      setError(t("clients.validation.emailRequired")); return;
    }
    setError(null);
    const dto: CreateClientDto = {
      customer_type: form.customer_type,
      nationality: form.nationality,
      ...(form.client_name?.trim() && { client_name: form.client_name.trim() }),
      ...(form.business_name?.trim() && { business_name: form.business_name.trim() }),
      ...(form.client_gln?.trim() && { client_gln: form.client_gln.trim() }),
      email: form.email.trim(),
      ...((form.identification?.code || form.identification?.number) && { identification: { code: form.identification.code || undefined, number: form.identification.number || undefined } }),
      ...((form.phone?.country_code || form.phone?.number) && { phone: { country_code: form.phone.country_code || undefined, area_code: form.phone.area_code || undefined, number: form.phone.number || undefined } }),
      ...((form.residence?.state_id || form.residence?.address) && { residence: { state_id: form.residence.state_id || undefined, county_id: form.residence.county_id || undefined, district_id: form.residence.district_id || undefined, neighborhood_id: form.residence.neighborhood_id || undefined, address: form.residence.address || undefined } }),
    };
    try {
      await updateMutation.mutateAsync({ clientId: client!.client_id, dto });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.error"));
    }
  }

  const saving = updateMutation.isPending;

  return (
    <Drawer
      open={open} onClose={onClose}
      title={t("clients.editClient")}
      subtitle={clientDisplayName(client)}
      icon="user"
      iconBg="hsl(var(--accent-rose-soft))"
      iconColor="hsl(var(--accent-rose))"
      width={480}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      }
    >
      <ClientFormBody form={form} setForm={setForm} error={error} isEditing={true} />
    </Drawer>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3.5 py-3 border-b border-border">
      <div className="w-[34px] h-[34px] rounded-[9px] bg-accent-rose-soft border border-accent-rose-border flex items-center justify-center flex-shrink-0">
        <Icon name={icon} size={15} className="text-accent-rose" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground mb-px">{label}</div>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <Card className="px-6 py-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon name={icon} size={14} className="text-accent-rose" />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent-rose">{title}</span>
      </div>
      {children}
    </Card>
  );
}

type TabKey = "overview" | "orders" | "stores" | "departments";

interface Props {
  clientId: string;
}

export default function ClientDetailPage({ clientId }: Props) {
  const { orgId } = useOrgContext();
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  const { data: client, isLoading } = useClient(orgId, clientId);
  const statusMutation = useUpdateClientStatus(orgId);
  const notesMutation = useUpdateClient(orgId);

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canUpdate = !permsReady || can("commercial", "update", "clients");
  const canDelete = !permsReady || can("commercial", "delete", "clients");

  const displayName = clientDisplayName(client);
  usePageTitle([t("shell.clients"), displayName || (isLoading ? undefined : t("common.new"))]);
  const [bg, fg] = avatarColor(displayName);
  const idCode  = client?.identification?.code;
  const idShort = idCode ? ID_TYPE_SHORT[idCode] : undefined;
  const phone = formatPhone(client?.phone);
  const isActive = client?.status === 1;

  const hasIdentity = !!(idShort || client?.identification?.number || client?.client_gln);
  const hasContact  = !!(client?.email || phone);
  const hasAddress  = !!(client?.residence?.address);

  const handleSaveNotes = async (notes: string) => {
    if (!client) return;
    await notesMutation.mutateAsync({ clientId: client.client_id, dto: { notes } });
  };

  if (isLoading) {
    return (
      <div className="px-6 py-12 flex items-center justify-center gap-2.5">
        <Icon name="refresh" size={18} className="text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="text-sm text-muted-foreground">{t("clients.notFound")}</div>
        <button
          onClick={() => navigate(ROUTES.DASHBOARD_CLIENTS)}
          className="mt-4 text-accent-rose bg-transparent border-0 cursor-pointer text-[13px]"
        >
          ← {t("shell.clients")}
        </button>
      </div>
    );
  }

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "overview", label: t("clients.tabs.overview"), icon: "user" },
    { key: "orders", label: t("shell.orders"), icon: "cart" },
    { key: "stores", label: t("clients.tabs.stores"), icon: "store" },
    { key: "departments", label: t("clients.tabs.departments"), icon: "layers" },
  ];

  return (
    <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(ROUTES.DASHBOARD_CLIENTS)}
        className="t-body inline-flex items-center gap-1.5 text-muted-foreground bg-transparent border-0 cursor-pointer mb-5 py-1.5 hover:text-foreground transition-colors"
      >
        <Icon name="arrowLeft" size={14} /> {t("shell.clients")}
      </button>

      {/* Hero card */}
      <Card className="px-7 pt-7 pb-6 mb-3.5 !border-accent-rose-border bg-gradient-to-br from-accent-rose-soft to-transparent">
        <div className="flex items-start gap-5 flex-wrap">
          <div
            className="t-h1 w-[72px] h-[72px] rounded-[20px] flex items-center justify-center flex-shrink-0"
            style={{ background: bg, color: fg, boxShadow: `0 4px 16px ${bg}66` }}
          >
            {initials(displayName)}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="t-h1 !my-0 !mb-1.5 leading-tight">{displayName}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {idShort && client.identification?.number && (
                <span className="bg-accent-rose-soft text-accent-rose border border-accent-rose-border px-2 py-0.5 rounded-[5px] text-[11px] font-bold">
                  {idShort} · {client.identification.number}
                </span>
              )}
              <Badge variant={isActive ? "success" : "secondary"}>
                {isActive ? t("common.active") : t("common.inactive")}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ClientWhatsAppButton client={client} />
            {canUpdate && (
              <Button variant="outline" size="sm" icon="edit" onClick={() => setEditOpen(true)}>
                {t("common.edit")}
              </Button>
            )}
            {canDelete && (
              <div onClick={(e) => e.stopPropagation()}>
                <Menu
                  align="right"
                  items={[
                    {
                      label: isActive ? t("clients.deactivateClient") : t("clients.activateClient"),
                      icon: isActive ? "xCircle" : "checkCircle",
                      action: () => statusMutation.mutate({ clientId: client.client_id, status: isActive ? 2 : 1 }),
                    },
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs — 2×2 grid on mobile, inline row on sm+ */}
      <div className="tabs-container mb-4">
        <div className="tabs grid grid-cols-2 gap-1 sm:flex">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              className="tab"
              aria-selected={tab === tb.key}
              onClick={() => setTab(tb.key)}
            >
              <Icon name={tb.icon} size={14} /> {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="flex flex-col gap-3.5">
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            {hasIdentity && (
              <Section title={t("clients.identity")} icon="user">
                {idCode && <InfoRow icon="fileText" label={t("clients.idType")} value={ID_TYPE_LABEL[idCode] ?? idCode} />}
                {client.identification?.number && <InfoRow icon="copy" label={t("clients.idNumber")} value={client.identification.number} />}
                {client.client_gln && <InfoRow icon="layers" label={t("clients.gln")} value={client.client_gln} />}
              </Section>
            )}

            {hasContact && (
              <Section title={t("clients.contact")} icon="smartphone">
                {client.email && <InfoRow icon="mail" label={t("clients.email")} value={client.email} />}
                {phone && <InfoRow icon="smartphone" label={t("clients.phone")} value={phone} />}
              </Section>
            )}

            {hasAddress && (
              <Section title={t("clients.address")} icon="mapPin">
                <InfoRow icon="mapPin" label={t("clients.exactAddress")} value={client.residence!.address!} />
              </Section>
            )}

            {!hasIdentity && !hasContact && !hasAddress && (
              <Card className="px-6 py-8 text-center col-span-full">
                <div className="w-11 h-11 rounded-xl bg-accent-rose-soft flex items-center justify-center mx-auto mb-3">
                  <Icon name="user" size={20} className="text-accent-rose" />
                </div>
                <div className="t-body text-muted-foreground">{t("clients.noExtraInfo")}</div>
                {canUpdate && (
                  <button
                    onClick={() => setEditOpen(true)}
                    className="t-body mt-2.5 text-accent-rose bg-transparent border-0 cursor-pointer font-semibold"
                  >
                    {t("clients.addInfo")} →
                  </button>
                )}
              </Card>
            )}
          </div>

          {/* Notes */}
          <ClientNotes
            notes={client.notes}
            onSave={handleSaveNotes}
            isSaving={notesMutation.isPending}
          />
        </div>
      )}

      {/* Orders tab — paginated history */}
      {tab === "orders" && <ClientOrderHistory orgId={orgId} clientGln={client.client_gln} />}

      {/* Stores tab */}
      {tab === "stores" && <ClientStoresList orgId={orgId} clientId={client.client_id} />}

      {/* Departments tab */}
      {tab === "departments" && <ClientDepartmentsList orgId={orgId} clientId={client.client_id} />}

      <EditDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
      />
    </div>
  );
}
