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
import { ID_TYPE_SHORT, ID_TYPE_LABEL } from "@/lib/enums";
import { Card, Icon, Drawer, Button, Badge, Menu } from "@/components/ui";
import { initials, avatarColor } from "@/utils/avatar";

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
  const { orgId } = useOrgContext();
  const updateMutation = useUpdateClient(orgId);
  const [form, setForm] = useState<CreateClientDto>(() => buildForm(client));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setForm(buildForm(client)); setError(null); }
  }, [open, client]);

  async function handleSave() {
    if (!form.business_name?.trim() && !form.client_gln?.trim()) {
      setError("Se requiere al menos razón social o código GLN."); return;
    }
    if (!form.identification?.number?.trim()) {
      setError("El número de identificación es requerido."); return;
    }
    if (!form.email?.trim()) {
      setError("El correo electrónico es requerido."); return;
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
      setError(e instanceof Error ? e.message : "Error al guardar.");
    }
  }

  const saving = updateMutation.isPending;

  return (
    <Drawer
      open={open} onClose={onClose}
      title="Editar cliente"
      subtitle={clientDisplayName(client)}
      icon="user"
      iconBg="hsl(var(--accent-rose-soft))"
      iconColor="hsl(var(--accent-rose))"
      width={480}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
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

interface Props {
  clientId: string;
}

export default function ClientDetailPage({ clientId }: Props) {
  const { orgId } = useOrgContext();
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  const [editOpen, setEditOpen] = useState(false);

  const { data: client, isLoading } = useClient(orgId, clientId);
  const statusMutation = useUpdateClientStatus(orgId);

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
        <div className="text-sm text-muted-foreground">Cliente no encontrado.</div>
        <button
          onClick={() => navigate(ROUTES.DASHBOARD_CLIENTS)}
          className="mt-4 text-accent-rose bg-transparent border-0 cursor-pointer text-[13px]"
        >
          ← Volver a clientes
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 pb-12 max-w-[800px] mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(ROUTES.DASHBOARD_CLIENTS)}
        className="t-body inline-flex items-center gap-1.5 text-muted-foreground bg-transparent border-0 cursor-pointer mb-5 py-1.5 hover:text-foreground transition-colors"
      >
        <Icon name="arrowLeft" size={14} /> Clientes
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
                {isActive ? "● Activo" : "○ Inactivo"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" icon="edit" onClick={() => setEditOpen(true)}>
              Editar
            </Button>
            <div onClick={(e) => e.stopPropagation()}>
              <Menu
                align="right"
                items={[
                  {
                    label: isActive ? "Desactivar cliente" : "Activar cliente",
                    icon: isActive ? "xCircle" : "checkCircle",
                    action: () => statusMutation.mutate({ clientId: client.client_id, status: isActive ? 2 : 1 }),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Info sections */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {hasIdentity && (
          <Section title="Identidad" icon="user">
            {idCode && <InfoRow icon="fileText" label="Tipo de identificación" value={ID_TYPE_LABEL[idCode] ?? idCode} />}
            {client.identification?.number && <InfoRow icon="copy" label="Número de identificación" value={client.identification.number} />}
            {client.client_gln && <InfoRow icon="layers" label="GLN / Código comercial" value={client.client_gln} />}
          </Section>
        )}

        {hasContact && (
          <Section title="Contacto" icon="smartphone">
            {client.email && <InfoRow icon="mail" label="Correo electrónico" value={client.email} />}
            {phone && <InfoRow icon="smartphone" label="Teléfono" value={phone} />}
          </Section>
        )}

        {hasAddress && (
          <Section title="Dirección" icon="mapPin">
            <InfoRow icon="mapPin" label="Dirección exacta" value={client.residence!.address!} />
          </Section>
        )}

        {!hasIdentity && !hasContact && !hasAddress && (
          <Card className="px-6 py-8 text-center col-span-full">
            <div className="w-11 h-11 rounded-xl bg-accent-rose-soft flex items-center justify-center mx-auto mb-3">
              <Icon name="user" size={20} className="text-accent-rose" />
            </div>
            <div className="t-body text-muted-foreground">
              Sin información adicional registrada.
            </div>
            <button
              onClick={() => setEditOpen(true)}
              className="t-body mt-2.5 text-accent-rose bg-transparent border-0 cursor-pointer font-semibold"
            >
              Agregar información →
            </button>
          </Card>
        )}
      </div>

      <EditDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
      />
    </div>
  );
}
