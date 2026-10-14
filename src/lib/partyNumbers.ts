/** Raw transport values; UI masks never belong in API payloads or stored snapshots. */
export function rawIdentificationNumber(code: string | null | undefined, number: string | null | undefined) {
  if (number == null) return number;
  return ["01", "02", "03", "04"].includes(code ?? "") ? number.replace(/\D/g, "") : number.trim();
}

export function rawPhoneNumber(number: string | null | undefined) {
  return number == null ? number : number.replace(/\D/g, "");
}

export function rawPartyPayload<T extends {
  identification?: { code?: string | null; number?: string | null } | null;
  phone?: { number?: string | null; area_code?: string | null } | null;
}>(party: T): T {
  return {
    ...party,
    ...(party.identification && { identification: { ...party.identification, number: rawIdentificationNumber(party.identification.code, party.identification.number) } }),
    ...(party.phone && { phone: { ...party.phone, number: rawPhoneNumber(party.phone.number), area_code: rawPhoneNumber(party.phone.area_code) } }),
  };
}
