import { useState, useEffect, useMemo } from "react";
import { Drawer, Button, Spinner } from "@/components/ui";
import { FadeIn } from "@/components/ui/FadeIn";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCreateClient, useUpdateClient, clientDisplayName, type Client, type CreateClientDto } from "@/hooks/useClients";
import { usePermissions } from "@/hooks/useRbac";
import { useAllIdentifications } from "@/hooks/useDataApi";
import { useAccordionSections } from "@/hooks/useAccordionSections";
import type { IdentificationResponse } from "@/services/data-api/dtos/identifications";
import type { SaleReceiver } from "@/types/receiver";
import type { ClientSearchResult } from "@/hooks/useClientSearch";
import { IdentitySection } from "./sections/IdentitySection";
import { ContactSection } from "./sections/ContactSection";
import { AddressSection } from "./sections/AddressSection";
import { CustomerType, CountryISO } from "@/lib/enums";
import { hasReceiver } from '@/lib/receiverResolution';

function buildForm(client?: Client | null): CreateClientDto {
  return {
    // Falls back to the identification CODE, not to "persona física".
    //
    // `allowedIdCodes` filters the id-type select by customer type, and
    // `IdentitySection` resets the code — clearing the number and the razón
    // social with it — whenever the current code is not in that filtered list.
    // A client with a cédula jurídica but no `customer_type` on record (every
    // client auto-created from an order import) therefore had its id silently
    // wiped the moment the catalog finished loading.
    customer_type:
      client?.customer_type ?? inferCustomerTypeFromIdCode(client?.identification?.code),
    client_name: client?.client_name ?? "",
    business_name: client?.business_name ?? "",
    client_gln: client?.client_gln ?? "",
    nationality: client?.nationality ?? CountryISO.COSTA_RICA,
    email: client?.email ?? "",
    identification: { code: client?.identification?.code ?? "01", number: client?.identification?.number ?? "" },
    phone: { country_code: client?.phone?.country_code ?? CountryISO.COSTA_RICA, area_code: client?.phone?.area_code ?? "", number: client?.phone?.number ?? "", description: "" },
    residence: {
      state_id: client?.residence?.state_id ?? undefined,
      county_id: client?.residence?.county_id ?? undefined,
      district_id: client?.residence?.district_id ?? undefined,
      neighborhood_id: client?.residence?.neighborhood_id ?? undefined,
      address: client?.residence?.address ?? "",
    },
  };
}

/**
 * The customer type implied by an identification code.
 *
 * Exported because it is the seed that Bug A turned on: a hardcoded
 * `customer_type ?? 3` filtered "02" out of the allowed id codes, which reset
 * the code and BLANKED the identification number before the user touched
 * anything. Every client auto-created from an order import has a cédula
 * jurídica and no `customer_type`, so it is the common case, not the edge.
 */
export function inferCustomerTypeFromIdCode(code: string | null | undefined): number {
  return code === "02" ? CustomerType.EMPRESA : CustomerType.PERSONA_FISICA;
}

/**
 * Has the user actually entered a receiver, as opposed to the form having
 * defaults in it?
 *
 * This decides whether the selected CLIENT is used to fill the form, so a false
 * positive silently blanks the identification, the address and the GLN — which
 * is exactly what happened. A receiver that carries nothing but
 * `identification: { code: "01", number: "" }` — the shape the form itself
 * writes the moment the id-type select renders — counted as touched, because
 * the object had one non-empty value in it. The default id TYPE is not data the
 * user entered.
 *
 * So identity fields count only when they identify somebody: an identification
 * needs a NUMBER, a residence needs an actual location, a phone needs a number.
 */
function isReceiverTouched(r: SaleReceiver | undefined): boolean {
  if (!r) return false;

  if (r.name?.trim() || r.trade_name?.trim() || r.email?.trim()) return true;
  if (r.identification?.number?.trim()) return true;
  if (r.foreign_id_number?.trim() || r.foreign_address?.trim()) return true;
  if (r.phone?.number?.trim()) return true;

  const residence = r.residence;
  if (
    residence &&
    (residence.address?.trim() ||
      residence.state_id != null ||
      residence.county_id != null ||
      residence.district_id != null)
  ) {
    return true;
  }

  return false;
}

/**
 * Map a canonical SaleReceiver (nested CustomerDTO) back into the flat
 * client-create form. The form uses `business_name`, flat `state_id`, etc;
 * the canonical receiver uses `name` + nested `identification`/`residence`/`phone`.
 */
function receiverToForm(
  r: SaleReceiver | undefined,
  c: ClientSearchResult | null | undefined,
  _idTypes: IdentificationResponse[],
): CreateClientDto {
  const base = buildForm(null);
  const useReceiverOnly = isReceiverTouched(r);
  const src = useReceiverOnly ? null : c;

  // `r` is only consulted when it actually holds a receiver — `src` is null in
  // that case and non-null otherwise, so reading both here would let an
  // untouched receiver's DEFAULT id type override the client's real one. And
  // the number needs `||`, not `??`: the form writes `""`, which is not
  // nullish, so `??` returned the empty string and the client's cédula never
  // reached the field. That single operator is why the id looked blank.
  const rid = useReceiverOnly ? r?.identification : undefined;
  const idCode =
    rid?.code || src?.identification?.code || base.identification?.code;
  // customer_type_code is a Hacienda string ("01"-"05"). Client form uses
  // the numeric CustomerType enum — convert via the code's leading int.
  const customerType = r?.customer_type_code
    ? Number(r.customer_type_code) || inferCustomerTypeFromIdCode(idCode)
    : inferCustomerTypeFromIdCode(idCode);

  return {
    ...base,
    business_name: r?.name || src?.business_name || "",
    // The form's "Nombre comercial / Fantasía" IS the receiver's `trade_name`.
    // It used to be seeded from `r.name` — the legal name — so opening the
    // drawer showed the razón social duplicated into the trade-name box, and
    // whatever the user typed there was dropped on save (see `formToReceiver`).
    client_name: r?.trade_name || src?.client_name || "",
    client_gln: src?.client_gln ?? "",
    email: r?.email || src?.email || "",
    nationality: r?.nationality || base.nationality,
    customer_type: customerType,
    identification: {
      code: idCode,
      number: rid?.number || src?.identification?.number || "",
    },
    phone: r?.phone
      ? {
          country_code: r.phone.country_code || base.phone?.country_code,
          area_code: r.phone.area_code ?? "",
          number: r.phone.number || "",
          description: r.phone.description ?? "",
        }
      : src?.phone
        ? {
            country_code: base.phone?.country_code,
            area_code: src.phone.area_code || "",
            number: src.phone.number || "",
            description: "",
          }
        : base.phone,
    residence: useReceiverOnly
      ? {
          state_id: r?.residence?.state_id ?? undefined,
          county_id: r?.residence?.county_id ?? undefined,
          district_id: r?.residence?.district_id ?? undefined,
          // Client form keeps neighborhood_id locally (LocationSelect cascade);
          // the canonical receiver doesn't carry it (Hacienda wants the name).
          neighborhood_id: undefined,
          address: r?.residence?.address ?? "",
        }
      : {
          state_id: src?.residence?.state_id ?? undefined,
          county_id: src?.residence?.county_id ?? undefined,
          district_id: src?.residence?.district_id ?? undefined,
          neighborhood_id: src?.residence?.neighborhood_id ?? undefined,
          address: src?.residence?.address ?? "",
        },
  };
}

/**
 * Project the client-create form back into a canonical SaleReceiver. The
 * residence drops `neighborhood_id` (FE-only) — the checkout form must
 * later resolve it to `neighborhood_name` before submitting to sales-api.
 */
function formToReceiver(
  f: CreateClientDto,
  _idTypes: IdentificationResponse[],
  carryOver?: SaleReceiver,
): SaleReceiver {
  const customerTypeNum = f.customer_type ?? inferCustomerTypeFromIdCode(f.identification?.code);
  return {
    name: f.business_name?.trim() || f.client_name?.trim() || "",
    // Persist what the user typed rather than echoing back whatever the
    // receiver already carried, which made the field read-only in practice.
    trade_name: f.client_name?.trim() || carryOver?.trade_name,
    email: f.email?.trim() || undefined,
    nationality: f.nationality,
    customer_type_code: String(customerTypeNum).padStart(2, "0"),
    identification: {
      code: f.identification?.code,
      number: f.identification?.number?.trim() || undefined,
    },
    fax: carryOver?.fax,
    economic_activity: carryOver?.economic_activity,
    foreign_id_number: carryOver?.foreign_id_number,
    foreign_address: carryOver?.foreign_address,
    phone: f.phone?.number
      ? {
          country_code: f.phone.country_code || CountryISO.COSTA_RICA,
          area_code: f.phone.area_code || undefined,
          number: f.phone.number,
          description: f.phone.description || undefined,
        }
      : undefined,
    residence: {
      state_id: f.residence?.state_id ?? undefined,
      county_id: f.residence?.county_id ?? undefined,
      district_id: f.residence?.district_id ?? undefined,
      // Canonical receiver carries the NAME, not the id. The checkout drawer
      // resolves neighborhood_id → neighborhood_name from the data-api cache.
      neighborhood_name: undefined,
      address: f.residence?.address?.trim() || undefined,
    },
  };
}

interface ClientDrawerFormProps {
  open: boolean;
  client?: Client | null;
  orgId: string;
  onClose: () => void;
  /** "client" = upsert via API (default). "receiver" = call onSaveReceiver, no API. */
  mode?: "client" | "receiver";
  /** Prefill source when mode="receiver". */
  receiver?: SaleReceiver;
  /** Additional prefill in receiver mode — fills any field the receiver doesn't yet have. */
  selectedClient?: ClientSearchResult | null;
  /** Required when mode="receiver" — receives the mapped receiver on Save. */
  onSaveReceiver?: (next: SaleReceiver) => void;
}

export function ClientDrawerForm({
  open,
  client,
  orgId,
  onClose,
  mode = "client",
  receiver,
  selectedClient,
  onSaveReceiver,
}: ClientDrawerFormProps) {
  const { t } = useLanguage();
  const isReceiver = mode === "receiver";
  const isEdit = isReceiver
    ? !!receiver?.name || !!selectedClient
    : !!client;

  const createMutation = useCreateClient(orgId);
  const updateMutation = useUpdateClient(orgId);

  // RBAC action gating — receiver mode performs no API write, so it is never
  // gated on clients perms. Fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canSubmit =
    isReceiver || !permsReady || can("commercial", isEdit ? "update" : "create", "clients");
  const { data: idTypes = [], isLoading: idTypesLoading } = useAllIdentifications({
    iso_code: CountryISO.COSTA_RICA,
  });
  const dataReady = idTypes.length > 0 || !idTypesLoading;

  const initialForm = useMemo(
    () => (isReceiver ? receiverToForm(receiver, selectedClient, idTypes) : buildForm(client)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReceiver, client, receiver, selectedClient, idTypes.length],
  );

  const [form, setForm] = useState<CreateClientDto>(initialForm);
  const [error, setError] = useState<string | null>(null);

  const { expanded, setExpanded, toggle } = useAccordionSections({
    identity: true,
    contact: false,
    address: false,
  });
  const [haciendaSuccess, setHaciendaSuccess] = useState(false);
  const [drawerReady, setDrawerReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setDrawerReady(false);
      return;
    }
    if (dataReady) setDrawerReady(true);
  }, [open, dataReady]);

  useEffect(() => {
    if (open && dataReady) {
      setForm(isReceiver ? receiverToForm(receiver, selectedClient, idTypes) : buildForm(client));
      setError(null);
      setExpanded({ identity: true, contact: false, address: false });
      setHaciendaSuccess(
        // Same resolver as the checkout, so "is this receiver identified?"
        // answers identically wherever it is asked.
        isReceiver
          ? hasReceiver(receiver, selectedClient)
          : !!client?.client_name || !!client?.business_name,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dataReady, client, receiver, selectedClient, isReceiver]);

  // Auto-expand Contact section when Hacienda lookup succeeds or nationality is not CR
  useEffect(() => {
    const isCR = form.nationality === CountryISO.COSTA_RICA;
    if (haciendaSuccess || !isCR) {
      setExpanded((prev) => ({ ...prev, contact: true, address: true }));
    } else {
      setExpanded((prev) => ({ ...prev, contact: false, address: false }));
    }
  }, [haciendaSuccess, form.nationality]);

  async function handleSave() {
    const hasBusinessName = form.business_name?.trim() || form.client_name?.trim();
    const hasId = form.identification?.number?.trim();
    const hasEmail = form.email?.trim();

    if (isReceiver) {
      if (!hasBusinessName) {
        setError(t("checkout.receiver.error.businessNameRequired"));
        return;
      }
      if (!hasId) {
        setError(t("checkout.receiver.error.idRequired"));
        return;
      }
      setError(null);
      onSaveReceiver?.(formToReceiver(form, idTypes, receiver ?? {}));
      onClose();
      return;
    }

    // Client mode validation (preserves prior behavior)
    // The same rule the backend enforces: SOME name, or a GLN.
    //
    // This checked `business_name || client_gln` while store-be checked
    // `client_name || client_gln`, so the two ends disagreed in both
    // directions — a company with only a razón social passed here and was
    // refused there, and a person with only a full name was refused here and
    // would have been accepted there.
    if (
      !form.client_name?.trim() &&
      !form.business_name?.trim() &&
      !form.client_gln?.trim()
    ) {
      setError(t("clients.validation.nameOrGlnRequired"));
      return;
    }
    if (!hasId) {
      setError(t("clients.validation.idRequired"));
      return;
    }
    if (!hasEmail) {
      setError(t("clients.validation.emailRequired"));
      return;
    }

    setError(null);
    const dto: CreateClientDto = {
      customer_type: form.customer_type,
      nationality: form.nationality,
      ...(form.client_name?.trim() && { client_name: form.client_name.trim() }),
      ...(form.business_name?.trim() && { business_name: form.business_name.trim() }),
      ...(form.client_gln?.trim() && { client_gln: form.client_gln.trim() }),
      email: form.email!.trim(),
      ...((form.identification?.code || form.identification?.number) && {
        identification: { code: form.identification.code || undefined, number: form.identification.number || undefined },
      }),
      ...((form.phone?.country_code || form.phone?.number) && {
        phone: { country_code: form.phone.country_code || undefined, area_code: form.phone.area_code || undefined, number: form.phone.number || undefined },
      }),
      ...((form.residence?.state_id || form.residence?.address) && {
        residence: { state_id: form.residence.state_id || undefined, county_id: form.residence.county_id || undefined, district_id: form.residence.district_id || undefined, neighborhood_id: form.residence.neighborhood_id || undefined, address: form.residence.address || undefined },
      }),
    };
    try {
      if (isEdit) await updateMutation.mutateAsync({ clientId: client!.client_id, dto });
      else await createMutation.mutateAsync(dto);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    }
  }

  const saving = !isReceiver && (createMutation.isPending || updateMutation.isPending);

  const isCR = form.nationality === CountryISO.COSTA_RICA;
  const shouldDisableContactAddress = isCR && !haciendaSuccess && !isEdit;

  const title = isReceiver
    ? isEdit
      ? t("checkout.receiver.editTitle")
      : t("checkout.receiver.newTitle")
    : isEdit
      ? "Editar cliente"
      : "Nuevo cliente";

  const subtitle = isReceiver
    ? t("checkout.receiver.subtitle")
    : isEdit
      ? clientDisplayName(client)
      : "Complete los datos del cliente";

  const saveLabel = isReceiver
    ? t("common.save")
    : saving
      ? "Guardando…"
      : isEdit
        ? "Guardar cambios"
        : "Crear cliente";

  return (
    <Drawer
      closeLabel={t("common.close")}
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon="user"
      iconBg="hsl(var(--accent-rose-soft))"
      iconColor="hsl(var(--accent-rose))"
      width={520}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            {isReceiver ? t("common.cancel") : "Cancelar"}
          </Button>
          {canSubmit && (
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saveLabel}
            </Button>
          )}
        </div>
      }
    >
      {!drawerReady && <Spinner fullHeight label={t("common.loading")} />}

      {drawerReady && (
      <FadeIn duration={0.3}>
        <div className="p-5 flex flex-col gap-2.5">
          <IdentitySection
            form={form}
            setForm={setForm}
            isExpanded={expanded.identity}
            onToggle={() => toggle('identity')}
            isEditing={isEdit}
            onHaciendaSuccess={setHaciendaSuccess}
          />

          <ContactSection
            form={form}
            setForm={setForm}
            isExpanded={expanded.contact}
            onToggle={() => toggle('contact')}
            disabled={shouldDisableContactAddress}
          />

          <AddressSection
            form={form}
            setForm={setForm}
            isExpanded={expanded.address}
            onToggle={() => toggle('address')}
            disabled={shouldDisableContactAddress}
          />

          {error && (
            <div className="px-3 py-2.5 bg-destructive/[0.08] rounded-lg text-xs text-destructive border border-destructive/20">
              {error}
            </div>
          )}
        </div>
      </FadeIn>
      )}
    </Drawer>
  );
}

/**
 * Pure mappers, exported for tests.
 *
 * The receiver↔form translation is where four separate bugs lived — a default
 * id type counting as user input, the trade name colliding with the legal name,
 * the trade name never persisting, and the customer type defaulting in a way
 * that made the id-type filter erase the id. None of them are visible without
 * exercising the mapping directly, which is why it is reachable from a test.
 */
export const __testing = {
  isReceiverTouched,
  receiverToForm,
  formToReceiver,
  buildForm,
};
