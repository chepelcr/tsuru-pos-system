import { useState } from "react";
import { useLocation } from "wouter";
import { ROUTES } from "@/routePaths";
import { useOrgContext } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  useClient,
  useUpdateClient,
  useUpdateClientStatus,
  clientToDto,
  clientDisplayName,
  formatPhone,
} from "@/hooks/useClients";
import { ClientDrawerForm } from "@/components/clients/ClientDrawerForm";
import { usePermissions } from "@/hooks/useRbac";
import { ID_TYPE_SHORT, ID_TYPE_LABEL } from "@/lib/enums";
import { Card, Icon, Button, Badge, Menu } from "@/components/ui";
import { initials, avatarColor } from "@/utils/avatar";
import { ClientNotes } from "@/components/clients/ClientNotes";
import { ClientStoresList } from "@/components/clients/ClientStoresList";
import { ClientDepartmentsList } from "@/components/clients/ClientDepartmentsList";
import { ClientOrderHistory } from "@/components/clients/ClientOrderHistory";
import { ClientWhatsAppButton } from "@/components/clients/ClientWhatsAppButton";
import { useNationalTaxpayer } from "@/hooks/useNationalTaxpayer";
import { useDepartments } from "@/hooks/useDepartments";
import { useStores } from "@/hooks/useStores";
import { useOrders } from "@/hooks/useOrders";

/*
 * The edit drawer used to be a SECOND copy of the customers-page one, declared
 * here — and the copies had drifted, which is the whole of the bug it caused.
 *
 * It seeded `customer_type` to a hardcoded 3 (persona física) instead of
 * inferring it from the identification code, and it rendered a second form body
 * whose id-type reset effect never got the fix that `IdentitySection` did. For
 * a cédula-jurídica customer with no `customer_type` on record — which is every
 * client auto-created from an order import — the two combined to filter "02"
 * out of the allowed codes, reset the code to "01", and BLANK the identification
 * number, all before the user had touched anything. The list page's drawer was
 * fine, which is exactly why it looked like the detail page "did not load" the
 * id.
 *
 * One drawer now, so a fix cannot land on one copy and miss the other.
 */
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
  const { can } = usePermissions();
  const canUpdate = can("commercial", "update", "clients");
  const canDelete = can("commercial", "delete", "clients");

  // Is this customer on the national taxpayer registry? The catalog is the
  // authority — adding a chain is a catalog row, not a frontend release.
  const taxpayer = useNationalTaxpayer([
    client?.identification?.number,
    client?.client_gln,
  ]);
  // Rows already on file, which is what an imported chain client has instead of
  // a cédula. page_size 1 because only existence matters here.
  const { data: departmentsProbe, isLoading: departmentsLoading } =
    useDepartments(orgId, clientId, { page_size: 1 });
  const { data: storesProbe, isLoading: storesLoading } =
    useStores(orgId, clientId, { page_size: 1 });
  const hasChainData =
    (departmentsProbe?.data?.length ?? 0) > 0 || (storesProbe?.data?.length ?? 0) > 0;
  const chainDataLoading = departmentsLoading || storesLoading;

  const showTaxpayerTabs =
    taxpayer.isLoading || chainDataLoading || taxpayer.isNationalTaxpayer || hasChainData;

  // Orders for ANY customer that has them, keyed by GLN the same way the history
  // tab queries. Shown while unresolved for the same reason as above.
  const { data: ordersProbe, isLoading: ordersLoading } = useOrders({
    orgId,
    search: client?.client_gln ? `clientGln:${client.client_gln}` : "",
    page: 1,
    pageSize: 1,
    enabled: !!orgId && !!client?.client_gln,
  });
  const showOrdersTab =
    !client?.client_gln ? false : ordersLoading || (ordersProbe?.data?.length ?? 0) > 0;

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
    // The whole client, plus the note. The update is a PUT, so sending `{notes}`
    // alone would replace the client with a nameless one — which the backend
    // refuses outright. (It used to be accepted and silently discarded: there
    // was no `notes` column at all until now.)
    await notesMutation.mutateAsync({
      clientId: client.client_id,
      dto: { ...clientToDto(client), notes },
    });
  };

  if (isLoading) {
    return (
      <div className="px-6 pt-6 pb-12 max-w-[900px] mx-auto">
        {/* Back button */}
        <div className="skeleton-block animate-pulse h-4 w-24 rounded mb-5" />

        {/* Hero card */}
        <Card className="px-7 pt-7 pb-6 mb-3.5">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-[72px] h-[72px] rounded-[20px] bg-muted/40 animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="skeleton-block animate-pulse h-7 w-48 rounded mb-2" />
              <div className="flex items-center gap-2">
                <div className="skeleton-block animate-pulse h-5 w-28 rounded" />
                <div className="skeleton-block animate-pulse h-5 w-16 rounded" />
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="tabs-container mb-4">
          <div className="grid grid-cols-2 gap-1 sm:flex">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-block animate-pulse h-9 sm:w-28 rounded" />
            ))}
          </div>
        </div>

        {/* Info card blocks */}
        <div className="grid-auto-fit-300 gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="px-6 py-5">
              <div className="skeleton-block animate-pulse h-3 w-28 rounded mb-4" />
              {Array.from({ length: 2 }).map((__, j) => (
                <div key={j} className="flex items-center gap-3.5 py-3 border-b border-border">
                  <div className="w-[34px] h-[34px] rounded-[9px] bg-muted/40 animate-pulse flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="skeleton-block animate-pulse h-2.5 w-20 rounded mb-1.5" />
                    <div className="skeleton-block animate-pulse h-4 w-32 rounded" />
                  </div>
                </div>
              ))}
            </Card>
          ))}
        </div>
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

  /**
   * Which tabs this customer actually needs.
   *
   * All four used to show for everyone, so an ordinary customer carried an empty
   * Orders history and two chain tabs that would never hold anything — and the
   * tabs that DO matter were no easier to find for being next to two that did not.
   *
   *   Departments / Delivery points — for a *contribuyente nacional*: a customer
   *     on the national taxpayer registry, whose documents have to name a
   *     department and a delivery point. `hasChainData` keeps them for a customer
   *     whose rows already exist but whose cédula does not: an order imported
   *     from a chain's spreadsheet creates its client with no identification at
   *     all (the file has no such column), so the registry cannot match it while
   *     its departments and stores are created by that same import.
   *
   *   Orders — whenever the customer has any, for ANY customer. It was never
   *     chain-specific; it simply sat beside the chain tabs.
   *
   * While a lookup is unresolved the tab is SHOWN rather than hidden: flashing a
   * tab away under someone mid-click is worse than briefly offering an empty one.
   */
  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "overview", label: t("clients.tabs.overview"), icon: "user" },
    ...(showOrdersTab ? [{ key: "orders" as const, label: t("shell.orders"), icon: "cart" }] : []),
    ...(showTaxpayerTabs ? [
      { key: "stores" as const, label: t("clients.tabs.stores"), icon: "store" },
      { key: "departments" as const, label: t("clients.tabs.departments"), icon: "layers" },
    ] : []),
  ];

  // A tab can stop being available while it is the one being shown — the orders
  // probe resolves to zero, or a lookup finishes and the customer turns out not to
  // be on the registry. Falling back keeps the page from rendering an empty body
  // under a tab strip that no longer contains the selection.
  const activeTab = TABS.some((item) => item.key === tab) ? tab : "overview";

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
              aria-selected={activeTab === tb.key}
              onClick={() => setTab(tb.key)}
            >
              <Icon name={tb.icon} size={14} /> {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-3.5">
          <div className="grid-auto-fit-300 gap-3.5">
            {hasIdentity && (
              <Section title={t("clients.identity")} icon="user">
                {idCode && <InfoRow icon="fileText" label={t("clients.idType")} value={ID_TYPE_LABEL[idCode] ?? idCode} />}
                {client.identification?.number && <InfoRow icon="copy" label={t("clients.idNumber")} value={client.identification.number} />}
                {client.client_gln && <InfoRow icon="layers" label={t("clients.gln")} value={client.client_gln} />}
              </Section>
            )}

            {hasContact && (
              <Section title={t("clients.contact")} icon="smartphone">
                {client.email && <InfoRow icon="mail" label={t("common.email")} value={client.email} />}
                {phone && <InfoRow icon="smartphone" label={t("common.phone")} value={phone} />}
              </Section>
            )}

            {hasAddress && (
              <Section title={t("common.address")} icon="mapPin">
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
      {activeTab === "orders" && <ClientOrderHistory orgId={orgId} clientGln={client.client_gln} />}

      {/* Stores tab */}
      {activeTab === "stores" && <ClientStoresList orgId={orgId} clientId={client.client_id} />}

      {/* Departments tab */}
      {activeTab === "departments" && <ClientDepartmentsList orgId={orgId} clientId={client.client_id} />}

      <ClientDrawerForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        client={client}
        orgId={orgId}
      />
    </div>
  );
}
