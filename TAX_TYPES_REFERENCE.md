# Costa Rica Tax Types Reference

This document provides a comprehensive reference for all tax types supported in the POS system, based on Costa Rica's Ministerio de Hacienda electronic invoicing specifications.

## Tax Type Configuration

All tax types are configured in `src/types/taxTypeConfig.ts` with the following properties:

- **code**: Hacienda tax code (e.g., '01' for IVA)
- **name**: Human-readable name
- **iva**: Whether this is an IVA-type tax
- **requiresSpecialFields**: Whether special fields are needed (quantity, percentage, volume, tax_amount_id)
- **requireRate**: Whether a rate/percentage input is required
- **fixedRate**: Fixed rate if applicable (e.g., ISC is always 5%)
- **forBaseAmount**: Whether this tax should be added to the base amount for IVA calculation
- **forFactoryTax**: Whether this tax can be assumed by factory (cargo por fábrica)
- **requiresFactor**: Whether this tax requires a tax factor (e.g., IVARBU)
- **requiresRateSelection**: Whether this tax requires selecting a rate from tax_rates table
- **requiresTaxAmount**: Whether this tax requires tax amount lookup from tax_amounts table

---

## IVA Taxes (Value Added Tax)

### 01 - IVA (Impuesto al Valor Agregado)
**Standard VAT**

- **Applied to**: Base amount (subtotal + special taxes that increase base)
- **Rate**: Selected from `tax_rates` table (typically 13%, 4%, 2%, 1%, 0%)
- **Calculation**: `base_amount × rate / 100`
- **Special notes**: Most common tax type. Applied after all special consumption taxes.

**Example**:
```
Subtotal: ₡10,000
IVA 13%: ₡1,300
Total: ₡11,300
```

---

### 07 - IVACE (IVA para Compras Autorizadas)
**IVA for Authorized Purchases**

- **Applied to**: Same as IVA (01)
- **Rate**: Selected from `tax_rates` table
- **Calculation**: Same as IVA (01)
- **Special notes**: Used for specific authorized purchase scenarios. Calculation identical to standard IVA.

---

### 08 - IVARBU (IVA Régimen de Bienes Usados)
**IVA for Used Goods Regime**

- **Applied to**: Subtotal (before other taxes)
- **Factor**: Selected from `tax_factors` table
- **Calculation**: `subtotal × factor`
- **Special notes**: Different calculation method than standard IVA. Uses a factor instead of percentage rate.

**Example**:
```
Subtotal: ₡10,000
Factor: 0.13
IVARBU: ₡1,300
```

---

## Special Consumption Taxes

### 02 - ISC (Impuesto Selectivo de Consumo)
**Selective Consumption Tax**

- **Applied to**: Subtotal
- **Rate**: User-entered percentage
- **Calculation**: `subtotal × rate / 100`
- **Adds to base**: ✅ Yes (included in IVA calculation base)
- **Can be assumed by factory**: ❌ No

**Example**:
```
Subtotal: ₡10,000
ISC 10%: ₡1,000
Base for IVA: ₡11,000
IVA 13%: ₡1,430
Total: ₡12,430
```

---

### 12 - ISEC (Impuesto Específico de Consumo)
**Specific Consumption Tax**

- **Applied to**: Subtotal
- **Rate**: Fixed at 5%
- **Calculation**: `subtotal × 0.05`
- **Adds to base**: ✅ Yes (included in IVA calculation base)
- **Can be assumed by factory**: ✅ Yes

**Example**:
```
Subtotal: ₡10,000
ISEC 5%: ₡500
Base for IVA: ₡10,500
IVA 13%: ₡1,365
Total: ₡11,865
```

---

## Special Taxes with Amount Tables

These taxes require looking up amounts from the `tax_amounts` table and require special fields.

### 03 - IUC (Impuesto Único a los Combustibles)
**Fuel Tax**

- **Applied to**: Per unit of fuel
- **Required fields**:
  - `tax_amount_id`: ID from tax_amounts table
  - `quantity`: Number of units
- **Calculation**: `quantity × tax_amount`
- **Adds to base**: ❌ No
- **Can be assumed by factory**: ✅ Yes

**Example**:
```
Quantity: 50 liters
Tax per liter: ₡200
IUC: ₡10,000
```

---

### 04 - ISEBA (Impuesto Específico sobre las Bebidas Alcohólicas)
**Alcoholic Beverages Tax**

- **Applied to**: Alcoholic beverages
- **Required fields**:
  - `tax_amount_id`: ID from tax_amounts table
  - `quantity`: Quantity of product
  - `percentage`: Alcohol percentage
- **Calculation**: `detail_quantity × (quantity × percentage/100) × tax_amount`
- **Adds to base**: ✅ Yes
- **Can be assumed by factory**: ✅ Yes

**Example**:
```
Detail quantity: 10 bottles
Quantity per bottle: 750ml
Alcohol percentage: 40%
Tax per unit: ₡50
ISEBA: 10 × (750 × 0.40) × 50 = ₡150,000
```

---

### 05 - ISEBEC (Impuesto Específico sobre las Bebidas Envasadas)
**Non-Alcoholic Beverages and Soaps Tax**

- **Applied to**: Non-alcoholic beverages (CABYS 2202) and alcoholic beverages (CABYS 3401)
- **Required fields**:
  - `tax_amount_id`: ID from tax_amounts table
  - `quantity`: Quantity of product
  - `volume_consumption`: Volume per unit
  - `percentage`: Alcohol percentage (for alcoholic beverages only)
- **Calculation**:
  - **Alcoholic (CABYS 3401)**: `quantity × volume_consumption × tax_amount`
  - **Non-alcoholic (CABYS 2202)**: `detail_quantity × quantity × (tax_amount / volume_consumption)`
- **Adds to base**: ✅ Yes
- **Can be assumed by factory**: ✅ Yes

**Example (Non-alcoholic)**:
```
Detail quantity: 24 cans
Quantity per can: 355ml
Volume consumption: 100ml
Tax per 100ml: ₡10
ISEBEC: 24 × 355 × (10 / 100) = ₡852
```

---

### 06 - IPT (Impuesto a los Productos de Tabaco)
**Tobacco Products Tax**

- **Applied to**: Tobacco products
- **Required fields**:
  - `tax_amount_id`: ID from tax_amounts table
  - `quantity`: Quantity of product
- **Calculation**: `detail_quantity × quantity × tax_amount`
- **Adds to base**: ❌ No
- **Can be assumed by factory**: ✅ Yes

**Example**:
```
Detail quantity: 5 packs
Quantity per pack: 20 cigarettes
Tax per cigarette: ₡5
IPT: 5 × 20 × 5 = ₡500
```

---

## Other Taxes

### 99 - OTROS (Otros Impuestos)
**Other Taxes**

- **Applied to**: Base amount (after special taxes)
- **Rate**: User-entered percentage
- **Calculation**: `base_amount × rate / 100`
- **Adds to base**: ❌ No
- **Can be assumed by factory**: ❌ No
- **Special notes**: Catch-all category for taxes not covered by other codes.

**Example**:
```
Subtotal: ₡10,000
ISC 10%: ₡1,000
Base: ₡11,000
OTROS 5%: ₡550
IVA 13%: ₡1,430
Total: ₡12,980
```

---

## Tax Calculation Order

The system calculates taxes in the following order:

1. **Special taxes** (03, 04, 05, 06) - Applied to subtotal
2. **Consumption taxes** (02, 12) - Applied to subtotal
3. **Other taxes** (99) - Applied to base amount
4. **IVA taxes** (01, 07, 08) - Applied to base amount (subtotal + taxes that increase base)

### Base Amount Calculation

The base amount for IVA is calculated as:
```
base_amount = subtotal + taxes_that_increase_base
```

Taxes that increase base (`forBaseAmount = true`):
- 02 (ISC)
- 04 (ISEBA)
- 05 (ISEBEC)
- 12 (ISEC)

---

## Factory Tax Charge (Cargo por Fábrica)

Some taxes can be "assumed by factory" meaning they are calculated but not added to the final total. This is controlled by:

1. **Factory tax charge selection** (`factory_tax_charge_id`)
2. **Tax type configuration** (`forFactoryTax = true`)
3. **Discount conditions** (bonus/gift discounts)

Taxes that can be assumed by factory:
- 03 (IUC)
- 04 (ISEBA)
- 05 (ISEBEC)
- 06 (IPT)
- 12 (ISEC)

When a tax is assumed by factory:
- It's calculated normally
- Added to `factory_assumed_tax` total
- **Subtracted** from the final line total
- Still shown in the breakdown for transparency

---

## Helper Functions

The `taxTypeConfig.ts` file provides several helper functions:

```typescript
// Get configuration for a tax code
getTaxConfig(code: string): TaxTypeConfig | undefined

// Check if a tax is IVA-type
isIvaTax(code: string): boolean

// Check if a tax requires special fields
requiresSpecialFields(code: string): boolean

// Check if a tax can be assumed by factory
canBeAssumedByFactory(code: string): boolean

// Get all IVA tax codes
getIvaTaxCodes(): string[]

// Get all special tax codes (requiring tax amounts)
getSpecialTaxCodes(): string[]
```

---

## Usage in Components

### Product Form
- Uses full tax configuration with special fields
- Supports all tax types including complex calculations
- Shows tax amounts and special field inputs

### Line Detail Drawer (POS)
- Simplified tax configuration
- Focuses on rate adjustments
- Does not support complex special fields (ISEBA, ISEBEC, etc.)
- Suitable for quick line-level edits

---

## API Integration

### Tax Types
- Endpoint: `/taxes`
- Returns: `TaxResponse[]` with `code`, `description`, `special_fields_required`

### Tax Rates
- Endpoint: `/tax-rates`
- Returns: `TaxRateResponse[]` with `percentage`, `description`
- Used for: IVA (01), IVACE (07)

### Tax Factors
- Endpoint: `/tax-factors`
- Returns: `TaxFactorResponse[]` with `factor`, `description`
- Used for: IVARBU (08)

### Tax Amounts
- Endpoint: `/tax-amounts?tax_id={tax_type_id}`
- Returns: `TaxAmountResponse[]` with `amount`, `description`, `min_percentage`, `max_percentage`
- Used for: IUC (03), ISEBA (04), ISEBEC (05), IPT (06)

### Factory Tax Charges
- Endpoint: `/factory-tax-charges`
- Returns: `FactoryTaxChargeResponse[]` with `code`, `description`
- Codes: '01' (assumed), '02' (not assumed)

---

## References

- **Tax Calculation Service**: `src/services/taxCalculationService.ts`
- **Discount Calculation Service**: `src/services/discountCalculationService.ts`
- **Tax Type Config**: `src/types/taxTypeConfig.ts`
- **Hacienda Documentation**: Costa Rica Ministerio de Hacienda electronic invoicing specs
