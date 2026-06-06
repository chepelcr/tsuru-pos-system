import { useState, useEffect } from "react";
import { User, X, Loader2 } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { FormLabel } from "@/components/ui";
import { useAllCustomerTypes, useAllIdentifications, useAllCountries } from "@/hooks/useDataApi";
import { dataApiClient } from "@/services/data-api";
import { CountryISO, CustomerType, IdTypeCode, allowedIdCodes } from "@/lib/enums";
import { applyIdMask, validateIdLength, getIdPlaceholder } from "@/utils/idValidation";
import type { CreateClientDto } from "@/hooks/useClients";

interface IdentitySectionProps {
  form: CreateClientDto;
  setForm: React.Dispatch<React.SetStateAction<CreateClientDto>>;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  isEditing?: boolean;
  onHaciendaSuccess?: (hasBusinessName: boolean) => void;
}

export function IdentitySection({
  form,
  setForm,
  isExpanded,
  onToggle,
  disabled,
  isEditing,
  onHaciendaSuccess,
}: IdentitySectionProps) {
  const nationality = form.nationality ?? CountryISO.COSTA_RICA;
  const customerType = form.customer_type ?? CustomerType.PERSONA_FISICA;
  const isCR = nationality === CountryISO.COSTA_RICA;
  const idCode = form.identification?.code ?? IdTypeCode.CEDULA_FISICA;

  const [idComplete, setIdComplete] = useState(false);
  const [lookingUpTaxpayer, setLookingUpTaxpayer] = useState(false);
  const [taxpayerError, setTaxpayerError] = useState<string | null>(null);

  const { data: customerTypes = [], isLoading: loadingCT } = useAllCustomerTypes();
  const { data: allIdTypes = [], isLoading: loadingID } = useAllIdentifications({ iso_code: CountryISO.COSTA_RICA });
  const { data: countries = [], isLoading: loadingCountries } = useAllCountries();

  const allowed = allowedIdCodes(nationality, customerType);
  const filteredIdTypes = allIdTypes.filter((t) => allowed.includes(t.code));

  useEffect(() => {
    const currentCode = form.identification?.code;
    const isValid = filteredIdTypes.some((t) => t.code === currentCode);
    if (!isValid && filteredIdTypes.length > 0) {
      setForm((f) => ({
        ...f,
        identification: { ...f.identification, code: filteredIdTypes[0].code, number: "" },
        business_name: "",
      }));
      setIdComplete(false);
      setTaxpayerError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nationality, customerType, filteredIdTypes.length]);

  const handleIdNumberChange = async (value: string) => {
    const maskedValue = applyIdMask(value, idCode);
    setForm((f) => ({ ...f, identification: { ...f.identification, number: maskedValue } }));

    const isComplete = validateIdLength(maskedValue, idCode);
    setIdComplete(isComplete);
    setTaxpayerError(null);

    if (isCR && isComplete) {
      const cleanId = maskedValue.replace(/\D/g, "");
      setLookingUpTaxpayer(true);
      try {
        const taxpayer = await dataApiClient.getTaxpayerInfo({
          iso_code: nationality,
          identification: cleanId,
        });
        if (taxpayer?.name) {
          setForm((f) => ({
            ...f,
            business_name: taxpayer.name,
          }));
          onHaciendaSuccess?.(true);
        } else {
          onHaciendaSuccess?.(false);
          setTaxpayerError("No se encontró información del contribuyente");
        }
      } catch (error) {
        onHaciendaSuccess?.(false);
        setTaxpayerError("Error al consultar Hacienda");
      } finally {
        setLookingUpTaxpayer(false);
      }
    }
  };

  const handleClearId = () => {
    setForm((f) => ({
      ...f,
      identification: { ...f.identification, number: "" },
      business_name: "",
    }));
    setIdComplete(false);
    setTaxpayerError(null);
    onHaciendaSuccess?.(false);
  };

  const canEditCriticalFields = !isEditing;

  return (
    <SectionWrapper
      title="Identidad"
      icon={User}
      isExpanded={isExpanded}
      onToggle={onToggle}
      disabled={disabled}
    >
      {/* Customer Type Pills */}
      <div>
        <FormLabel required>Tipo de cliente</FormLabel>
        <div className="flex gap-2.5 mt-1">
          {loadingCT ? (
            <div className="text-xs text-muted-foreground">Cargando…</div>
          ) : (
            customerTypes.map((ct) => {
              const selected = customerType === ct.id;
              return (
                <button
                  key={ct.id}
                  type="button"
                  onClick={canEditCriticalFields ? () => setForm((f) => ({ ...f, customer_type: ct.id })) : undefined}
                  disabled={!canEditCriticalFields}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all border-[1.5px] flex items-center gap-2 ${
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
          <div className="t-xs text-muted-foreground mt-1 italic">
            No se puede cambiar el tipo de cliente durante la edición
          </div>
        )}
      </div>

      {/* Nationality */}
      <div>
        <FormLabel required>Nacionalidad</FormLabel>
        <select
          className={`pp-input ${canEditCriticalFields ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
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
      </div>

      {/* ID Type & Number */}
      <div className="flex gap-2.5">
        <div className="flex-1">
          <FormLabel required>Tipo de identificación</FormLabel>
          <select
            className={`pp-input ${canEditCriticalFields ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
            value={idCode}
            onChange={canEditCriticalFields ? (e) => setForm((f) => ({ ...f, identification: { ...f.identification, code: e.target.value, number: "" } })) : undefined}
            disabled={loadingID || !canEditCriticalFields}
          >
            {loadingID && <option value="">Cargando…</option>}
            {filteredIdTypes.map((t) => (
              <option key={t.code} value={t.code}>
                {t.description}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <FormLabel required>Número de identificación</FormLabel>
          <div className="relative">
            <input
              className={`pp-input ${
                idComplete || lookingUpTaxpayer ? "!pr-9" : ""
              } ${idComplete && isCR ? "!bg-primary/[0.06] !border-[1.5px] !border-primary/35" : ""} ${
                !canEditCriticalFields ? "cursor-not-allowed opacity-60" : ""
              }`}
              value={form.identification?.number ?? ""}
              onChange={canEditCriticalFields ? (e) => handleIdNumberChange(e.target.value) : undefined}
              placeholder={getIdPlaceholder(idCode)}
              disabled={!canEditCriticalFields || idComplete || lookingUpTaxpayer}
            />
            {lookingUpTaxpayer && (
              <div className="absolute right-2.5 top-0 bottom-0 flex items-center justify-center pointer-events-none">
                <Loader2 size={16} className="text-primary animate-spin" />
              </div>
            )}
            {idComplete && !lookingUpTaxpayer && (
              <button
                type="button"
                onClick={handleClearId}
                className="btn btn-ghost btn-icon btn-xs absolute right-1 top-1/2 -translate-y-1/2"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {taxpayerError && (
            <div className="t-xs text-destructive mt-1">{taxpayerError}</div>
          )}
        </div>
      </div>

      {/* Business Name (Legal Name from Hacienda) */}
      <div>
        <FormLabel required>Razón social</FormLabel>
        <input
          className={`pp-input ${isCR ? "!bg-muted/15 cursor-not-allowed" : ""}`}
          value={form.business_name ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
          placeholder="Nombre legal de la empresa o persona"
          readOnly={isCR}
        />
        {isCR && (
          <div className="t-xs text-muted-foreground mt-1 italic">
            Se completa automáticamente desde Hacienda
          </div>
        )}
      </div>

      {/* Client Name (Fantasy/Trade Name) */}
      <div>
        <FormLabel>Nombre comercial / Fantasía</FormLabel>
        <input
          className="pp-input"
          value={form.client_name ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
          placeholder="Nombre comercial o de fantasía (opcional)"
        />
        <div className="t-xs text-muted-foreground mt-1 italic">
          Nombre con el que se conoce comercialmente
        </div>
      </div>

      {/* GLN */}
      <div>
        <FormLabel>GLN / Código comercial</FormLabel>
        <input
          className="pp-input"
          value={form.client_gln ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, client_gln: e.target.value }))}
          placeholder="Código GLN (opcional)"
        />
      </div>
    </SectionWrapper>
  );
}
