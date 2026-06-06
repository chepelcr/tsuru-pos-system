import { useEffect } from "react";
import { LocationSelect } from "@/components/ui/LocationSelect";
import { Icon } from "@/components/ui";
import type { CreateClientDto } from "@/hooks/useClients";
import { useAllCustomerTypes, useAllIdentifications, useAllCountries } from "@/hooks/useDataApi";
import { CountryISO, CustomerType, IdTypeCode, DEFAULT_ID_TYPE, allowedIdCodes } from "@/lib/enums";

// Re-exported for legacy consumers — prefer the `.client-input` className going forward.
export const inputStyle: React.CSSProperties = {};
export const clientInputClass = "client-input";

export function Field({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) {
  return (
    <div style={{ flex: half ? "0 0 calc(50% - 6px)" : "0 0 100%" }}>
      <label className="block text-[11px] font-bold uppercase tracking-[0.07em] text-muted-foreground mb-1.5 font-sans">
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-accent-rose font-sans mb-3">
      {children}
    </div>
  );
}

interface Props {
  form: CreateClientDto;
  setForm: React.Dispatch<React.SetStateAction<CreateClientDto>>;
  error: string | null;
  isEditing?: boolean;
}

export default function ClientFormBody({ form, setForm, error, isEditing }: Props) {
  const nationality  = form.nationality  ?? CountryISO.COSTA_RICA;
  const customerType = form.customer_type ?? CustomerType.PERSONA_FISICA;
  const isCR         = nationality === CountryISO.COSTA_RICA;

  const { data: customerTypes = [], isLoading: loadingCT } = useAllCustomerTypes();
  const { data: allIdTypes = [],   isLoading: loadingID } = useAllIdentifications({ iso_code: nationality });
  const { data: countries = [],    isLoading: loadingCountries } = useAllCountries();

  const allowed = allowedIdCodes(nationality, customerType);
  const filteredIdTypes = allIdTypes.filter((t) => allowed.includes(t.code));

  useEffect(() => {
    const currentCode = form.identification?.code;
    const isValid = filteredIdTypes.some((t) => t.code === currentCode);
    if (!isValid && filteredIdTypes.length > 0) {
      setForm((f) => ({ ...f, identification: { ...f.identification, code: filteredIdTypes[0].code, number: "" } }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nationality, customerType]);

  useEffect(() => {
    setForm((f) => ({ ...f, phone: { ...f.phone, country_code: nationality } }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nationality]);

  useEffect(() => {
    if (!isCR) {
      setForm((f) => ({
        ...f,
        residence: {
          state_id: undefined, county_id: undefined,
          district_id: undefined, neighborhood_id: undefined,
          address: f.residence?.address ?? "",
        },
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCR]);

  const canEditCriticalFields = !isEditing;

  return (
    <div className="px-6 pt-5 pb-6 flex flex-col gap-0">
      {/* Customer type */}
      <SectionLabel>Tipo de cliente</SectionLabel>
      <div className={`flex gap-2.5 ${canEditCriticalFields ? "mb-6" : "mb-2"}`}>
        {loadingCT ? (
          <div className="text-xs text-muted-foreground font-sans">Cargando…</div>
        ) : (
          customerTypes.map((ct) => {
            const selected = customerType === ct.id;
            return (
              <button
                key={ct.id}
                type="button"
                onClick={canEditCriticalFields ? () => setForm((f) => ({ ...f, customer_type: ct.id })) : undefined}
                disabled={!canEditCriticalFields}
                className={`flex-1 px-3 py-2.5 rounded-lg text-[13px] font-sans font-semibold transition-all border-[1.5px] flex items-center gap-2 ${
                  selected
                    ? "border-accent-rose bg-accent-rose-soft text-accent-rose"
                    : "border-border bg-muted/30 text-muted-foreground"
                } ${canEditCriticalFields ? "cursor-pointer opacity-100" : "cursor-not-allowed opacity-50"}`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 flex items-center justify-center ${
                    selected ? "border-accent-rose bg-accent-rose" : "border-muted-foreground bg-transparent"
                  }`}
                >
                  {selected && <div className="w-[5px] h-[5px] rounded-full bg-background" />}
                </div>
                {ct.description}
              </button>
            );
          })
        )}
      </div>
      {!canEditCriticalFields && (
        <div className="text-[11px] text-muted-foreground mb-6 italic font-sans">
          No se puede cambiar el tipo de cliente durante la edición
        </div>
      )}

      {/* Identity */}
      <SectionLabel>Identidad</SectionLabel>
      <div className="flex flex-wrap gap-2.5 mb-6">
        <Field label="Nacionalidad">
          <select
            className={`client-input appearance-none ${canEditCriticalFields ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
            value={nationality}
            onChange={canEditCriticalFields ? (e) => setForm((f) => ({ ...f, nationality: e.target.value })) : undefined}
            disabled={loadingCountries || !canEditCriticalFields}
          >
            {loadingCountries && <option value="">Cargando países…</option>}
            {countries.map((c) => (
              <option key={c.iso_code} value={c.iso_code}>
                {c.spanish_name || c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tipo de identificación" half>
          <select
            className={`client-input appearance-none ${canEditCriticalFields ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
            value={form.identification?.code ?? DEFAULT_ID_TYPE}
            onChange={canEditCriticalFields ? (e) => setForm((f) => ({ ...f, identification: { ...f.identification, code: e.target.value, number: "" } })) : undefined}
            disabled={loadingID || !canEditCriticalFields}
          >
            {loadingID && <option value="">Cargando…</option>}
            {filteredIdTypes.map((t) => (
              <option key={t.code} value={t.code}>{t.description}</option>
            ))}
          </select>
        </Field>

        <Field label="Número de identificación" half>
          <input
            className="client-input"
            value={form.identification?.number ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, identification: { ...f.identification, number: e.target.value } }))}
            placeholder={
              form.identification?.code === IdTypeCode.CEDULA_FISICA   ? "0-0000-0000"  :
              form.identification?.code === IdTypeCode.CEDULA_JURIDICA ? "0-000-000000" :
              "Número"
            }
          />
        </Field>

        {customerType === CustomerType.EMPRESA ? (
          <Field label="Razón social">
            <input className="client-input" value={form.business_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))} placeholder="Nombre de la empresa" />
          </Field>
        ) : (
          <Field label="Nombre completo">
            <input className="client-input" value={form.client_name ?? ""} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Nombre y apellidos" />
          </Field>
        )}

        <Field label="GLN / Código comercial">
          <input className="client-input" value={form.client_gln ?? ""} onChange={(e) => setForm((f) => ({ ...f, client_gln: e.target.value }))} placeholder="Código GLN (opcional)" />
        </Field>
      </div>

      {/* Contact */}
      <SectionLabel>Contacto</SectionLabel>
      <div className="flex flex-wrap gap-2.5 mb-6">
        <Field label="Correo electrónico">
          <input type="email" className="client-input" value={form.email ?? ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="correo@ejemplo.com" />
        </Field>

        <Field label="País (teléfono)" half>
          <select
            className="client-input appearance-none cursor-pointer"
            value={form.phone?.country_code ?? CountryISO.COSTA_RICA}
            onChange={(e) => setForm((f) => ({ ...f, phone: { ...f.phone, country_code: e.target.value } }))}
            disabled={loadingCountries}
          >
            {countries.map((c) => (
              <option key={c.iso_code} value={c.iso_code}>
                +{c.phone_code} {c.spanish_name || c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Número de teléfono" half>
          <input className="client-input" value={form.phone?.number ?? ""} onChange={(e) => setForm((f) => ({ ...f, phone: { ...f.phone, number: e.target.value } }))} placeholder="8888-8888" />
        </Field>
      </div>

      {/* Address */}
      <SectionLabel>Dirección</SectionLabel>
      <div className="mb-4">
        {isCR ? (
          <LocationSelect
            isoCode={nationality}
            value={{
              state_id: form.residence?.state_id ?? null,
              county_id: form.residence?.county_id ?? null,
              district_id: form.residence?.district_id ?? null,
              neighborhood_id: form.residence?.neighborhood_id ?? null,
              address: form.residence?.address ?? "",
            }}
            onChange={(loc) => setForm((f) => ({
              ...f,
              residence: {
                state_id: loc.state_id ?? undefined,
                county_id: loc.county_id ?? undefined,
                district_id: loc.district_id ?? undefined,
                neighborhood_id: loc.neighborhood_id ?? undefined,
                address: loc.address ?? "",
              },
            }))}
          />
        ) : (
          <Field label="Dirección">
            <textarea
              className="client-input min-h-[72px] resize-y"
              rows={3}
              value={form.residence?.address ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, residence: { address: e.target.value } }))}
              placeholder="Dirección completa"
            />
          </Field>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg text-[13px] text-destructive font-sans">
          <Icon name="alertTri" size={13} className="flex-shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
