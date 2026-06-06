# POS Calculation Audit — Hacienda v4.4 vs current implementation

**Audited:** `templates/pos-system/` (FE) + `E:\dev\cross-app-be\app\` product surface (BE).
**Spec source:** `E:\dev\biller-apps\auth\docs\Análisis Profundo de Comprobantes Electrónicos (Inglés).md`.
**Status legend:** ✅ implemented · ⚠️ partial / drift · ❌ missing · ⛔ out of scope for this repo.

> **In scope:** FE pos-system + cross-app-be **product surface**.
> **Out of scope (audit only):** sales endpoint (lives in another service), REP doc type `10`, CABYS-driven goods/services summary totals.

---

## 1. Hacienda v4.4 calculation checklist

### 1.1 Header / document level
| Field | Notes |
|---|---|
| `Clave` | Alphanumeric(50); doc-type code at positions 31–32 |
| `ProveedorSistemas` | String(20); required for RUT validation |
| `CodigoActividadEmisor` | String(6); must exist in RUT |
| `CodigoActividadReceptor` | String(6); required for receiver deductibility |
| `CondicionVenta` | See `SaleConditionCode` |
| `Moneda` + `TasaCambio` | Currency + exchange rate |
| `MedioPago[]` | 1–4 entries; sum must equal `TotalComprobante` |

### 1.2 Line level
| Field | Type | Required |
|---|---|---|
| `CodigoCABYS` | String(13) | Mandatory |
| `Cantidad` | Decimal(16,3) | Always |
| `PrecioUnitario` | Decimal(18,5) | Always |
| `MontoTotal` | Decimal(18,5) | = qty × price (editable on REP only) |
| `SubTotal` | Decimal(18,5) | = MontoTotal − Σ Descuento |
| `BaseImponible` | Decimal(18,5) | If taxable. Code 07 ⇒ manual; Code 08 ⇒ SubTotal × FactorCalculoIVA; else SubTotal + ISC + ISEBA + ISEBEC + ISEC |
| `IVACobradoFabrica` | `01` / `02` | See spec; `02` forces TaxCode 01 + RateCode 10 |
| `ImpuestoAsumidoEmisorFabrica` | Decimal(18,5) | Triggered by discount codes 01/03 or factory VAT |
| `Exoneracion.TipoDocumento` | `01`–`11` (Nota 10.1) | Optional |
| `Exoneracion.TarifaExonerada` | Decimal(4,2) | If exonerated |
| `Exoneracion.MontoExoneracion` | Decimal(18,5) | = Tarifa × BaseImponible |
| `DetalleSurtido[]` | 1–20 components | If assortment / combo |

### 1.3 Tax block (per line, 1–1000)
- **`TaxTypeCode`** (`01`–`08`, `12`, `99`).
- IVA formulas:
  - Standard codes (01, 02–04, 09): `Monto = BaseImponible × Tarifa`.
  - Code 07 (IVACE): `BaseImponible` manually entered; `Monto = BaseImponible × rate`.
  - Code 08 (IVARBU): `BaseImponible = SubTotal × FactorCalculoIVA`; then `× rate`.
  - Code 10 (exempt): `Monto = 0`.
  - Discount codes 01/03 (royalty/bonus): `Monto = MontoTotalOriginal × Tarifa` (base **not** eroded).
- **Special-amount codes** (03/04/05/06) — `DatosImpuestoEspecifico { tax_amount_id, quantity, percentage, volume_consumption }`.
- **`ImpuestoNeto = Monto − MontoExoneracion − ImpuestoAsumidoEmisorFabrica`**.
- `TaxRateCode` (Nota 8.1) 01–11.

### 1.4 Discount block (per line, 0–5, **sequential cascade**)
- `MontoDescuento`, `TipoDescuento` (`DiscountTypeCode`), `NatureDiscount` (required when code = `99`).
- Cascade: apply discount 1 → remaining, then discount 2 to remainder, etc. **No naive percentage sum.**
- Codes 01/03 keep tax base on the original total and route taxes through `factory_assumed_tax`.

### 1.5 Other charges (document, 0–15)
- `OtherChargeCode` (`01`–`10`, `99`). Code `04` requires `IdentificacionTercero` + `NombreTercero`; code `99` requires `TipoDocumentoOTROS`.
- `MontoCargo = PorcentajeOC × Σ line_subtotal` when percentage-based.

### 1.6 References (NC/ND/REP)
- `ReferenceDocType` (Nota 10) + `ReferenceCode` (Nota 10.1) + mandatory `Razon`.
- Original-document key + `FechaEmisionIR`.

### 1.7 Receiver
- `IdentificationTypeCode` 01–06; codes 05/06 only in restricted doc combinations.
- `CodigoActividadReceptor` for deductibility.

### 1.8 Validation & rounding
- Decimal(18,5) throughout, round-half-up on the 6th digit.
- `Σ MedioPago = TotalComprobante`.
- Credit-note amount ≤ referenced invoice balance.

---

## 2. FE implementation map (`templates/pos-system/src/`)

| Spec item | Status | Location |
|---|---|---|
| `DocumentType` enum centralised | ✅ (new) | `src/lib/enums/hacienda.ts` |
| `SaleConditionCode` enum | ✅ (new) | `src/lib/enums/hacienda.ts` |
| `TaxTypeCode` enum | ✅ (new) | `src/lib/enums/hacienda.ts` |
| `TaxRateCode` enum | ✅ (new) | `src/lib/enums/hacienda.ts` |
| `DiscountTypeCode` enum w/ ROYALTY / ROYALTY_BONUS_VAT_CUSTOMER / BONUS / OTHER | ✅ (new) | `src/lib/enums/hacienda.ts` |
| `IdentificationTypeCode` enum w/ code 06 (Non-taxpayer) | ✅ (new) | `src/lib/enums/hacienda.ts` |
| `PaymentMethodCode`, `OtherChargeCode`, `ReferenceDocType`, `ReferenceCode`, `IvaCollectedFactory`, `CabysSpecialPrefix` | ✅ (new) | `src/lib/enums/hacienda.ts` |
| Tax math (all 10 codes 01–08 / 12 / 99) | ✅ enum-driven | `src/services/taxCalculationService.ts` |
| Discount cascade (sequential) | ✅ | `src/services/discountCalculationService.ts` (`DiscountCalculationService.calculate`) |
| Discount-nature factory-tax routing | ✅ in discount service via `hasRoyaltyOrBonus` + `FACTORY_ASSUMED_DISCOUNT_NATURES` | `src/services/discountCalculationService.ts` → consumed by `taxCalculationService` |
| Factory-assumed tax + flag wiring | ✅ | `src/types/lineDetail.ts`, `LineDetailDrawer.tsx` |
| CABYS-driven ISEBEC branching | ✅ via `CabysSpecialPrefix.ISEBEC_NON_ALCOHOLIC` + `cabysStartsWith()` | `src/services/taxCalculationService.ts` |
| IVACE-07 manual base amount | ✅ validator: `base_amount ≥ subtotalAfterDiscount` | `src/components/pos/line-detail/IvaTaxSection.tsx`, surfaced via `LineDetailDrawer` `validationErrors` |
| IVARBU-08 factor input | ✅ | `IvaTaxSection.tsx` |
| `nature_discount` field on discount type `99` | ✅ form-captured + payload-wired | `src/types/lineDetail.ts`, `src/types/productForm.ts`, `DiscountsTab.tsx`, `DiscountsSection.tsx`, `ProductsPage.tsx`, `ProductDetailPage.tsx` |
| Special-tax amounts catalog client-side | ✅ flattened to `TaxAmountsById` from select-time captures | `LineDetailDrawer.tsx`, `OtherTaxSection.tsx` |
| `any[]` in product → line mappers | ✅ typed with `ProductTax[]` / `ProductDiscount[]` | `LineDetailDrawer.tsx`, `CommercialValueSection.tsx` |
| `Exoneracion` capture | ❌ not in line form | — |
| OtherCharges block (document level) | ❌ | — |
| References (NC/ND) full code set + Razon | ⚠️ partial — needs spec audit on `ReferenceTab` | `src/components/pos/checkout/sections/` |

### Magic-string hotspots (FE)
- `taxCalculationService.ts` lines 114, 139, 155, 255, 268, 300, plus `DISCOUNT_CODE` constants 18–21.
- `LineDetailDrawer.tsx:227-232` (IVA variant branch).
- `IvaTaxSection.tsx` and `OtherTaxSection.tsx` reference `'01' / '07' / '08' / '12' / '02' / '99'` inline.
- `CommercialValueSection.tsx:63` casts taxTypes to `any`.

---

## 3. BE implementation map (`cross-app-be/app/` — product surface only)

| Spec item | Status | Location |
|---|---|---|
| Hacienda code enums | ✅ | `app/enums/hacienda_codes.py` (renamed `DiscountType`, added `TaxRateCode` + `IvaCollectedFactory` + `CabysSpecialPrefix`) |
| Single calc function (tax + discount mixed) | ✅ deleted | _was_ `app/utils/product_calculations.py` — file removed |
| Pure tax service (per-code methods) | ✅ | `app/services/tax_calculation_service.py` (`TaxCalculator.apply_iva`, `apply_isc`, … `apply_others` + `compute_line_taxes`) |
| Pure discount service (sequential cascade, nature codes) | ✅ | `app/services/discount_calculation_service.py` (`DiscountCalculator.calculate` → `LineDiscountResult`) |
| Orchestrator service | ✅ | `app/services/line_calculation_service.py` (`LineCalculator.compute` → `LineAmountsResult`) |
| Result DTOs (Pydantic, Decimal) | ✅ | `app/dtos/common/calculation_results.py` |
| `ProductDiscountDTO.nature_discount` | ✅ + `@model_validator` enforces non-empty when code=99 | `app/dtos/requests/product_request_dto.py`, `app/dtos/responses/product_dto.py` |
| `Product.exemption_authorization_code` / `exempted_rate` / `exemption_amount` / `iva_collected_factory` | ✅ | `app/models/product.py` + DTOs + alembic `u1c2d3e4f5a6_product_exemption_fields.py` |
| `ProductTaxDTO.tax_rate.code` typed against `TaxRateCode` | ✅ Pydantic field validator | `product_request_dto.py` |
| CABYS prefix literal `"2202"` | ✅ | now `CabysSpecialPrefix.ISEBEC_NON_ALCOHOLIC` inside `tax_calculation_service.apply_isebec` |
| Pydantic DTO use throughout product flow | ✅ | `app/services/product_service.py` rewired to `LineCalculator` |
| Excel-row dict.get smells | ✅ wrapped at the boundary | `app/dtos/requests/product_excel_row_dto.py` consumed by `app/services/product_excel_service.py` |
| Unit tests | ✅ 24 passing | `tests/unit/services/test_{tax,discount,line}_calculation_service.py` |

---

## 4. Out of scope for this repo (audit-only)

These gaps exist on the sales side and are owned by the **separate sales service** — listed here so the gap matrix stays honest, but no code lands in this repo:

- ❌ `Sale` model missing `currency_code`, `exchange_rate`, `provider_systems_id`, `receiver_activity_code`.
- ❌ `SaleLine` aggregates only — missing `cabys_code`, `unit_price`, `subtotal`, `base_amount`, `total_amount_line`, `iva_tax_total`, `other_tax_total`, `factory_assumed_tax`, `net_tax`, `exemption_amount`, `exempted_rate`, `exemption_authorization_code`, `iva_collected_factory`, `nature_discount`, plus per-line tax/discount child rows.
- ❌ No `OtherCharges` block (model + DTO + service + routes).
- ⚠️ References block — needs verification against Nota 10/10.1 (full code coverage + mandatory `Razon`).
- ❌ Receiver activity code (`CodigoActividadReceptor`) capture.
- ⚠️ `sales_service.py:152` reads `p["type"]` directly on JSON payments — should consume a Pydantic `SalePaymentDTO`.
- ❌ Reconciliation rule `Σ MedioPago == TotalComprobante` not enforced.

---

## 5. Gap matrix (in-scope rows)

| # | Spec field / rule | FE | BE (product) | Status |
|---|---|---|---|---|
| 1 | Central Hacienda enums | ✅ | ✅ | done (Phase 0) |
| 2 | Magic-string sweep in tax/discount paths | ✅ | ✅ | done (Phase 1) |
| 3 | Separate tax-calculation service | ✅ | ✅ | done (Phase 1) |
| 4 | Separate discount-calculation service w/ sequential cascade | ✅ | ✅ | done (Phase 1) |
| 5 | Discount nature codes 02 + 99 (`nature_discount`) — capture, validate, send | ✅ | ✅ | done (Phase 1 + Phase 2 payload wiring) |
| 6 | Discount-nature factory-tax routing in discount service | ✅ | ✅ | done |
| 7 | `TaxRateCode` validation on `tax_rate.code` | n/a | ✅ | done |
| 8 | `Product` exemption fields + `iva_collected_factory` | ⚠️ types-only round-trip; no FE editor UI yet | ✅ | done on BE; FE types extended on `Product`, no edit UI yet — follow-up ticket |
| 9 | IVACE-07 manual base ≥ subtotal validator | ✅ | n/a | done |
| 10 | Special-tax `tax_amounts` resolved client-side (no empty `{}`) | ✅ | n/a | done |
| 11 | Kill `any[]` in product→line mappers | ✅ | n/a | done |
| 12 | CABYS prefix branching via `CabysSpecialPrefix` enum | ✅ | ✅ | done |
| 13 | Delete `product_calculations.py` (no back-compat) | n/a | ✅ | done |
| 14 | Excel-row dict.get wrapped in `ProductExcelRowDTO` | n/a | ✅ | done |
| 15 | Unit tests for tax / discount / orchestrator services | n/a | ✅ 24 passing | done |
| 16 | Audit doc + reuse note in CLAUDE.md | ✅ | n/a | done (this doc + §8 of `templates/pos-system/CLAUDE.md`) |

---

## 6. Action plan (mirrors the execution plan)

### Phase 0 — bedrock (main agent)
1. **This doc** — `templates/pos-system/CALCULATION_AUDIT.md` ✅.
2. **FE enums** — `src/lib/enums/hacienda.ts` ✅ (re-exported from `enums/index.ts`).
3. **BE enums** — extend `app/enums/hacienda_codes.py` ✅.

### Phase 1 — two parallel sub-agents
- **FE-CALC** — refactor `tax/discount` services, swap magic strings, fix `any[]`, add nature_discount + IVACE validator + tax_amounts wiring.
- **BE-CALC** — delete `product_calculations.py`, create 3 new services + orchestrator, rewire callers, add missing product fields, alembic migration, unit tests.

### Phase 2 — wiring (main agent)
Reconcile FE→BE payload shape; update `CLAUDE.md` §8 + §9; flip statuses in this doc.

### Phase 3 — verification (main agent)
End-to-end test runs + grep gates. Details in plan file.

---

## 7. Deep FE-flow audit findings (post-Phase 1)

After Phase 1 landed, a second-pass audit traced each user-selected field through the UI → form state → calc services. The Hacienda enum sweep and the cascade math itself are clean, but the **flow plumbing** still has real gaps. Findings below are ordered by severity.

### 7.1 🔴 IVA base for royalty / bonus lines is post-discount, not pre-discount

**File:** `src/services/taxCalculationService.ts:311-319` (`calculateIvaTaxAmount`).

```ts
const use_total_amount = hasRoyaltyOrBonus || EXPORT_INVOICE_TYPES.has(document_type ?? '');
amount = use_total_amount
  ? (total_amount * (tax.rate || 0)) / 100   // total_amount = total_amount_line (post-discount + special taxes)
  : (base_amount * (tax.rate || 0)) / 100;
```

Hacienda Nota 20 says when discount code = `01` (Royalty) or `03` (Bonus), `Monto = MontoTotalOriginal × Tarifa` — the original **pre-discount** line subtotal. Today the FE feeds `subtotalAfterDiscount` through as `subtotal`/`base_amount`, then `total_amount_line` accumulates from that base. So `total_amount` in the IVACE branch is **post-discount**, not the spec's pre-discount original. On a 100% royalty line the IVA becomes 0 instead of `original × rate`.

**Fix shape:** carry the pre-discount monto through `getLineAmounts` (e.g. add `monto_total_original: number` to `LineAmountsParams`, populate from `unit_price × detail_quantity` in callers, branch on it inside `calculateIvaTaxAmount` when `hasRoyaltyOrBonus`).

### 7.2 🔴 Code `02` (Royalty/Bonus, VAT to customer) has no special-case handling

**Files:** `src/services/discountCalculationService.ts`, `src/lib/enums/hacienda.ts:90-93`.

`FACTORY_ASSUMED_DISCOUNT_NATURES` correctly lists only `[ROYALTY, BONUS]` (i.e. 01, 03) — `02` is excluded from factory-assumed, which is right.

But the spec also says code `02`'s **customer pays VAT on the original base** even though the subtotal erodes. Today code `02` is treated exactly like code `99` (subtotal erodes, no factory routing) → IVA is computed on the eroded subtotal instead of on the pre-discount base for that line. Customer is undercharged VAT.

**Fix shape:** extend `LineDiscountResult` with `customer_pays_tax_on_original: boolean`. Tax service uses `monto_total_original` when either `hasRoyaltyOrBonus` *or* `customer_pays_tax_on_original` is set (factory-assumed routing applies only to the first; the second routes to the customer / `net_tax` normally).

### 7.3 🔴 Product drawer silently swallows discount validation errors

**File:** `src/components/products/sections/CommercialValueSection.tsx:69-77`.

```ts
try {
  discountInfo = price > 0
    ? DiscountCalculationService.calculate(price, discountEntries)
    : null;
} catch {
  discountInfo = null; // ← swallows DiscountValidationError
}
```

When a user picks a code-99 discount and forgets `nature_discount`, the preview falls back to "no discount" — totals look fine — and the product save in `ProductsPage.handleSave` / `ProductDetailPage.handleSave` has no form-level gate to block. Result: the BE rejects the save with the new Pydantic `nature_discount` validator and the user sees a generic 422 instead of an inline message.

`LineDetailDrawer.tsx:251-272` does this correctly — catches the error, surfaces it via `validationErrors`, blocks save. **Mirror that pattern in the product flow.**

**Fix shape:** propagate the caught error out of `CommercialValueSection` to the parent `ProductDrawerForm`, plumb a `validationErrors: string[]` up to `ProductsPage.handleSave` / `ProductDetailPage.handleSave`, and disable the save button when non-empty (with an inline error panel).

### 7.4 🟢 CABYS auto-IVA overwrite — intentional, not a bug

**Files:** `src/components/pos/line-detail/FiscalInfoSection.tsx:118-126`, `src/components/products/sections/FiscalInformationSection.tsx:220-224`.

CABYS is picked **before** the IVA tax in the standard user flow — it's the first fiscal interaction on the form, and its catalog row carries the canonical IVA rate. Auto-applying that rate is the desired behaviour; the user has not yet manually picked IVARBU/IVACE at that point. No change required.

### 7.5 🔴 Special-tax rows can be saved without their required `special_fields`

**File:** `src/components/pos/line-detail/OtherTaxSection.tsx` (TaxCard add path).

Codes `03/04/05/06/12` require `tax_amount_id` + `quantity` + (sometimes) `percentage` / `volume_consumption`. Adding a row initialises `specialFields: {}` (empty). User can leave fields blank, calc service multiplies by 0 → silent 0-tax line.

**Fix shape:** mark required `special_fields` per code (data-driven; the tax-amounts catalog already encodes the per-code shape). Add inline validation that contributes to `validationErrors`. Either disable add / save or render inline "missing required field" markers.

### 7.6 🟡 Factory-tax routing leaks to non-IVA codes when royalty/bonus present

**File:** `src/services/taxCalculationService.ts:196-215`.

When `hasRoyaltyOrBonus`, the special-tax branch also re-routes ISC/ISEBA/ISEBEC/IPT/ISEC/IUC into `factory_assumed_tax`. Hacienda spec only requires this for the IVA family; other taxes should still hit the buyer.

**Fix shape:** in the special-tax loop, only route into factory-assumed when the legacy `tax_config.forFactoryTax` rule fires; do **not** add `hasRoyaltyOrBonus` to that branch.

### 7.7 🟡 IVACE manual base lacks inline `min` + missing on edit-load

**File:** `src/components/pos/line-detail/IvaTaxSection.tsx:218-242`.

The `base_amount` input has no HTML `min` constraint. The aggregated validator (`LineDetailDrawer.tsx:326-334`) catches `base_amount < subtotalAfterDiscount` only on attempted save, never at input time. UX is jarring (no inline error beside the field).

**Fix shape:** add `min={subtotalAfterDiscount}` + an inline error caption right below the input.

### 7.8 🟡 Product preview uses `detail_quantity = 1` silently

**File:** `src/components/products/ProductDrawerForm.tsx:344`, `src/components/products/sections/CommercialValueSection.tsx:88`.

The product drawer simulates the line at qty = 1. For per-unit special taxes (IUC, IPT, ISEC), the displayed total differs from what the cart will compute at qty > 1. Not wrong, but unsigned: the preview should show "@ qty 1" or otherwise label that the totals scale per cart-add.

**Fix shape:** add a "@ 1 unit" caption to the CommercialValueSection header, or render the per-unit + per-line breakdown side by side.

### 7.9 🟡 `tax_rate.code` captured on FE but FE calc never reads it

**File:** `src/components/pos/line-detail/IvaTaxSection.tsx:99-101` writes `rate_code`; `LineTax` carries it; the tax service ignores it. The new BE Pydantic validator (`TaxRateCode`) now requires this field, so it survives the round-trip and is sent — but the FE calc never branches on it. The pure FE preview can't validate against the rate-code constraint; only the BE will reject on save.

**Fix shape:** add a quick FE-side validator (`rate_code` must be in `TaxRateCode` enum values) so the user gets an inline error before save, matching the BE behaviour.

### 7.10 🟡 Tax service fallback inference of `hasRoyaltyOrBonus` is too permissive

**File:** `src/services/taxCalculationService.ts:140-144`.

```ts
const inferredHasRoyaltyOrBonus =
  hasRoyaltyOrBonus ??
  (discountedNatures !== undefined ? discountedNatures.length > 0 : ...);
```

The current callers always pass `hasRoyaltyOrBonus` explicitly, so the fallback never fires today. But the fallback `length > 0` would treat *any* discount nature as factory-routable — a future caller that passes only `discountedNatures` would silently misroute taxes.

**Fix shape:** `discountedNatures.some(c => (FACTORY_ASSUMED_DISCOUNT_NATURES as readonly string[]).includes(c))`.

### 7.11 🔴 Consolidate `reason` and `nature_discount` into a single `reason` field

**Files:** `src/types/productForm.ts`, `src/types/lineDetail.ts`, `src/components/pos/line-detail/DiscountsTab.tsx`, `src/components/products/sections/DiscountsSection.tsx`, `src/services/discountCalculationService.ts`, `src/pages/dashboard/{ProductsPage,ProductDetailPage}.tsx`, BE `app/dtos/{requests,responses}/product_*`, `app/services/discount_calculation_service.py`.

Decision: `reason` is the single canonical free-text descriptor on a discount entry. `nature_discount` is dropped from FE and BE — it was a redundant alias for the same data.

UX rule:
- For discount codes `01` / `02` / `03` (Royalty / Royalty-bonus-VAT-to-customer / Bonus): `reason` is **auto-filled** from the discount-type description at select time. The input stays editable but is pre-populated so the user doesn't have to retype the obvious.
- For code `99` (Other): `reason` is **required**, cleared on switch-to-99, and the user enters the Nota-20 nature text.

**Fix shape (FE):**
- `DiscountFormEntry` / `LineDiscount`: remove the `nature_discount` field, keep only `reason`. Update the comment to call out the dual-purpose (auto-filled for known codes, mandatory for 99).
- `DiscountsTab` + `DiscountsSection`: on discount-type select, auto-fill `reason` with the picked type's description; when the new code is `99`, clear it and mark required.
- `DiscountCalculationService.calculate`: read `reason` (trim) and throw `DiscountValidationError("discount.reason.required", index)` when `discount_type === OTHER` and reason is empty/whitespace.
- `ProductsPage` + `ProductDetailPage` save mappers: drop `nature_discount` from the body; send `reason` only.
- `LanguageContext`: replace `discount.natureDiscount.*` keys with `discount.reason.*` (label / required / placeholder).

**Fix shape (BE):**
- `ProductDiscountDTO` (request) + `ProductDiscountResponse` (response): drop `nature_discount`; update the `@model_validator` to require `reason` non-empty when `discount_type_id == DiscountType.OTHER.value`.
- `DiscountCalculator.calculate`: validate against `reason` instead of `nature_discount`.
- Alembic follow-up migration: strip `nature_discount` key from existing JSONB `discounts[]` (defensive — JSONB extra keys would be ignored anyway, but cleaner to remove). Drop the prior backfill of `"legacy"`.

This subsumes the FE row 5 in the gap matrix and replaces the §7.11 / §7.13.7 punch-list items.

### 7.12 🟡 Product `factoryTaxChargeId` form field never reaches BE payload

**Files:** `src/components/products/ProductDrawerForm.tsx`, the `handleSave` in `ProductsPage.tsx:230-296` and `ProductDetailPage.tsx:182-...`.

The form captures `factoryTaxChargeId` (data-services numeric id) and `hasFactoryTax` (boolean). Neither field is serialised to the BE product body. The line-detail derives `factory_tax` (string code) at cart-add time from the chosen product, but the canonical id-on-product is dropped on save.

**Fix shape:** add `factory_tax_charge_id: form.factoryTaxChargeId || undefined` to both `handleSave` bodies, and update the BE product DTO + model if the field doesn't exist there yet (audit task: confirm).

### 7.13 🟢 Confirmed working

- Sequential discount cascade (test `[10%, 5%, 5%]` on 1000 → 812.25 verified by code-trace).
- `hasRoyaltyOrBonus` set only when nature is `01` or `03`; code `02`/`99` correctly excluded from `FACTORY_ASSUMED_DISCOUNT_NATURES`.
- `factory_assumed_tax` correctly subtracted from `total_amount_line` and `net_tax` (issuer absorbs).
- `nature_discount` flows BE ↔ FE on edit-load and save, trimmed.
- IVARBU factor selection writes `taxFactor` and the tax service reads `tax.factor × subtotal`.
- ISEBA / ISEBEC formula branching by `CabysSpecialPrefix.ISEBEC_NON_ALCOHOLIC` is correct.

### 7.14 Priority punch list — **all items resolved**

| # | Severity | Item | Status |
|---|---|---|---|
| 1 | 🔴 | Pre-discount IVA base for royalty / bonus lines (§7.1) | ✅ done — `monto_total_original` plumbed through FE + BE; IVA uses pre-discount base when `hasRoyaltyOrBonus` or `customer_pays_tax_on_original_base` |
| 2 | 🔴 | Code `02` semantics (§7.2) | ✅ done — `customer_pays_tax_on_original_base` flag on `LineDiscountResult`; IVA goes to `net_tax` / `iva_tax_total` (customer), not `factory_assumed_tax` |
| 3 | 🔴 | Surface discount validation errors in product drawer (§7.3) | ✅ done — `CommercialValueSection` catches `DiscountValidationError` and bubbles via `onValidationChange`; `ProductDrawerForm` blocks save via `canSave` + inline error panel |
| 4 | 🔴 | Consolidate `reason` + `nature_discount` → single `reason` field (§7.11) | ✅ done — `nature_discount` deleted across FE + BE; `reason` auto-fills from discount-type description for codes 01/02/03, required+manual for 99; alembic `v2d3e4f5a6b7` migrates existing JSONB |
| 5 | 🔴 | Validate `special_fields` per code (§7.5) | ✅ done — FE `requiredSpecialFields` contract drives inline markers + `onValidationChange`; BE `@model_validator` on `ProductTaxDTO` rejects missing keys |
| 6 | 🟡 | Limit royalty/bonus factory-routing to IVA family (§7.6) | ✅ done — special-tax + OTHERS loops no longer route into `factory_assumed_tax` on royalty/bonus; verified by new BE test |
| 7 | 🟡 | IVACE inline `min` + edit-load (§7.7) | ✅ done — `min={subtotalAfterDiscount}` on the input + inline error caption |
| 8 | 🟡 | Product preview qty caption (§7.8) | ✅ done — `products.preview.perUnit` rendered in `CommercialValueSection` header |
| 9 | 🟡 | FE-side `TaxRateCode` validator (§7.9) | ✅ done — `IvaTaxSection` validates the picked `rate_code` is in the enum; surfaces `lineDetail.iva.rateCodeInvalid` via `onValidationChange` |
| 10 | 🟡 | Defensive fallback for `discountedNatures` (§7.10) | ✅ done — `FACTORY_ASSUMED_DISCOUNT_NATURES.some(...)` membership check on both FE and BE |
| 11 | 🟡 | Serialise `factory_tax_charge_id` (§7.12) | ✅ done — FE save bodies include it, edit-load hydrates from response; BE Product model + DTOs + alembic carry it |

§7.4 (CABYS auto-IVA overwrite) is intentional, not a bug — CABYS is the first fiscal pick.

**Verification gates (all green):**
- FE: `npx tsc --noEmit` exit 0; `grep -r "nature_discount" src/` empty.
- BE: `pytest tests/unit/services/` 31 passed (24 baseline + 7 new for §7.1 / §7.2 / §7.6).
- FE+BE: no Hacienda code literals outside the enum modules in any calc-touching file.
- Alembic head: `v2d3e4f5a6b7_drop_nature_discount_add_factory_tax_charge` depends on `u1c2d3e4f5a6_product_exemption_fields`.

---

## 8. Reuse references

- FE tax service public entrypoint — `src/services/taxCalculationService.ts:80` (`TaxCalculationService.getLineAmounts`).
- FE Hacienda enums — `src/lib/enums/hacienda.ts` (this audit).
- BE algorithm reference (read-only — file deleted in BE-CALC) — `app/utils/product_calculations.py:89-210`.
- BE Hacienda enums — `app/enums/hacienda_codes.py`.
- CABYS lookup — `src/hooks/useDataApi.ts → useCabysSearch`.
- Pattern for JSONB-array repository search — `app/repositories/product_repository.py:44-80`.
