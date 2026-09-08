import { useCallback } from 'react';
import { ordersApi, ordersOrgPath } from '@/lib/api';
import type { Product } from '@/types';
import {
  DEFAULT_SCALE_CONFIG,
  parseScaleBarcode,
  type ScaleBarcodeConfig,
} from '@/lib/scaleBarcode';
import { readCachedProductByCode } from '@/services/offlineCatalog';

export interface ScanResult {
  product: Product;
  /** Quantity implied by a scale barcode; 1 for an ordinary code. */
  quantity: number;
  /** Total price embedded in a scale barcode, when it carried one. */
  amount?: number;
}

/**
 * Resolve a scanned code to a product (TSR-155).
 *
 * **Not gated by business type** — scanning is how a POS is used. The scale
 * barcode layout is the only minisuper-specific part, and it is opt-in through
 * `scaleConfig`.
 *
 * Tries the offline mirror FIRST: a till with no signal still has to sell, and
 * the mirror is warmed at login. The network is the fallback, not the other way
 * round.
 */
export function useProductByCode(orgId?: string, scaleConfig?: ScaleBarcodeConfig) {
  return useCallback(
    async (rawCode: string): Promise<ScanResult | null> => {
      const code = rawCode.trim();
      if (!code || !orgId) return null;

      // A scale barcode carries its own quantity, so resolve the item code out
      // of it before looking anything up.
      const scale = scaleConfig
        ? parseScaleBarcode(code, scaleConfig)
        : parseScaleBarcode(code, DEFAULT_SCALE_CONFIG);

      const lookupCode = scale?.itemCode ?? code;

      const cached = await readCachedProductByCode(orgId, lookupCode).catch(() => null);
      const product =
        cached ??
        (await ordersApi
          .get<Product>(ordersOrgPath(orgId, `/products/by-code/${encodeURIComponent(lookupCode)}`))
          .catch(() => null));

      if (!product) return null;

      return {
        product,
        quantity: scale?.quantity ?? 1,
        amount: scale?.amount,
      };
    },
    [orgId, scaleConfig],
  );
}
