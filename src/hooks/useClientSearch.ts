import { useState, useRef, useEffect } from "react";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { isOfflineError } from "@/lib/offline";
import { cacheClients, readCachedClients } from "@/services/offlineCatalog";

export interface ClientSearchResult {
  client_id: string;
  client_name?: string | null;
  business_name?: string | null;
  client_gln?: string | null;
  identification?: { code?: string | null; number?: string | null } | null;
  email?: string | null;
  phone?: { area_code?: string | null; number?: string | null } | null;
  residence?: { state_id?: number | null; county_id?: number | null; district_id?: number | null; neighborhood_id?: number | null; address?: string | null } | null;
}

export function useClientSearch(orgId: string | undefined, enabled: boolean) {
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<ClientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!orgId || !enabled) return;
    
    // If we already have clients loaded and no query, don't refetch
    if (hasLoaded && !query && clients.length > 0) return;
    
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const q = query ? `&search=clientName:*${query}*` : "";
        const res = await crossAppApi.get<{ data: ClientSearchResult[] }>(
          crossAppOrgPath(orgId, `/clients?search=status:1${q}`)
        );
        setClients(res.data ?? []);
        setHasLoaded(true);
        // Mirror what the picker just saw so the same search works offline.
        void cacheClients(orgId, (res.data ?? []) as Parameters<typeof cacheClients>[1]);
      } catch (error) {
        // Offline: serve the picker from the IndexedDB mirror rather than
        // leaving the cashier with an empty client list. Any other failure
        // stays silent, as before.
        if (isOfflineError(error)) {
          const cached = await readCachedClients(orgId, {
            search: query ? `status:1,(client_name:${query})` : "status:1",
            pageSize: 50,
          });
          setClients(cached.data);
          setHasLoaded(true);
        }
      }
      finally { setIsLoading(false); }
    }, 300);

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, orgId, enabled, hasLoaded, clients.length]);

  return { query, setQuery, clients, isLoading };
}
