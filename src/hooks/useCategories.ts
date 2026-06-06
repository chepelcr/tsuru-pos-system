import { useQuery } from "@tanstack/react-query";
import { ordersApi, ordersOrgPath } from "../lib/api";
import type { Category } from "../types";

interface CategoryListResponse {
  data: Category[];
}

export function useCategories(orgId: string | undefined) {
  return useQuery({
    queryKey: ["categories", orgId],
    enabled: !!orgId,
    staleTime: 1000 * 60 * 15,
    queryFn: () =>
      ordersApi.get<CategoryListResponse>(
        ordersOrgPath(orgId!, "/categories?page_size=100")
      ),
  });
}
