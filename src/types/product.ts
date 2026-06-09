/**
 * Product DTOs for POS System
 */

export interface Category {
  category_id: string;
  name: string;
  // ─── Optional CRUD fields (plan 03 — standalone Categories page) ──────────
  // Existing read-only dropdown consumers use only `category_id` + `name`
  // (both retained), so these additions are non-breaking.
  //
  // TODO(verify-endpoint): casing is the biggest correctness risk — the
  // dashboard `Category` model is camelCase (`backgroundColor`, `buttonColor`,
  // `image1Url`, `sortOrder`, `categoryId`) but POS responses elsewhere are
  // snake_case. These are typed snake_case (plan recommendation); inspect a
  // real `GET /categories` response from cross-app-be and align before coding
  // the card/form field reads.
  slug?: string;
  description?: string;
  background_color?: string;
  button_color?: string;
  image1_url?: string | null;
  image2_url?: string | null;
  sort_order?: number;
  status?: number;
}

/** Image payload for category create/update (base64 blob, mirrors product upload). */
export interface CategoryImagePayload {
  data: string; // base64 (data: prefix stripped)
  name: string;
  contentType: string;
}

/**
 * Create/update payload for the standalone Categories CRUD page (plan 03 §6).
 * TODO(verify-endpoint): confirm cross-app-be accepts this shape for
 * `POST /categories` and `PUT /categories/{id}` (incl. base64 image blobs).
 */
export interface InsertCategory {
  name: string;
  slug?: string;
  description?: string;
  background_color?: string;
  button_color?: string;
  sort_order?: number;
  image1?: CategoryImagePayload;
  image2?: CategoryImagePayload;
}

export interface ProductTax {
  tax_type_id: number;
  tax_code?: string;
  rate: number;
  special_fields?: {
    quantity?: number;
    percentage?: number;
    tax_amount_id?: number;
    volume_consumption?: number;
  };
}

export interface ProductDiscount {
  discount_type_id: number | string;
  rate?: number;
  percentage?: number;
  amount?: number;
  /**
   * Canonical Hacienda Nota-20 free-text descriptor.
   * Required by the BE when discount_type_id === "99" (Other).
   */
  reason?: string;
}

export interface Product {
  product_id: string;
  name: string;
  description?: string;
  price: number;
  sale_price?: number;
  category_id?: string;
  category?: Category;
  image_url: string | null;
  status: number; // 1 = active, 2 = inactive, 3 = deleted
  sku?: string | null;
  stock_quantity?: number;
  track_inventory?: boolean;
  low_stock_threshold?: number;
  units_per_box?: number;
  /** Canonical Hacienda unit-of-measure code ("Unid", "Sp", "kg", ...). */
  unit_measure?: string;
  /** Nested CABYS object returned by the BE — `{id, code, description?, ...}`. */
  cabys?: {
    id: string;
    code: string;
    description?: string | null;
    product_type_id?: number | null;
    tax_rate_id?: number | null;
    country_code?: string | null;
  } | null;
  codes?: Array<{
    code_type_id: string;
    number: string;
  }>;
  taxes?: ProductTax[];
  discounts?: ProductDiscount[];
  /** Hacienda Nota 10.1 exemption-authorization document type (01–11). */
  exemption_authorization_code?: string | null;
  /** Tarifa exonerada (e.g. 13). */
  exempted_rate?: number | null;
  /** Monto exoneración (computed: exempted_rate × base_amount). */
  exemption_amount?: number | null;
  /** `IVACobradoFabrica` indicator: "01" pre-determined, "02" exempt by factory. */
  iva_collected_factory?: string | null;
  created_on?: Date;
  updated_on?: Date;
}

export interface ProductListResponse {
  data: Product[];
  pagination?: {
    page: number;
    page_size: number;
    total_elements: number;
    total_pages: number;
  };
}
