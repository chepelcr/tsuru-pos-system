# Tax Calculation Flow

This document illustrates the complete tax calculation flow for Costa Rican invoices.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     LINE DETAIL CALCULATION                      │
└─────────────────────────────────────────────────────────────────┘

1. Start with Net Price × Quantity
2. Apply Discounts
3. Calculate Special Taxes
4. Calculate Consumption Taxes
5. Calculate Other Taxes
6. Calculate Base Amount
7. Calculate IVA Taxes
8. Apply Factory Tax Charge Logic
9. Calculate Final Total
```

---

## Detailed Flow Diagram

```
┌──────────────────────┐
│   Net Price × Qty    │
│    ₡10,000           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Apply Discounts    │
│   - 10% = ₡1,000     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Subtotal           │
│   ₡9,000             │
└──────────┬───────────┘
           │
           ├─────────────────────────────────────────┐
           │                                         │
           ▼                                         ▼
┌──────────────────────┐                  ┌──────────────────────┐
│  Special Taxes       │                  │  Consumption Taxes   │
│  (03,04,05,06)       │                  │  (02, 12)            │
│                      │                  │                      │
│  IUC, ISEBA,         │                  │  ISC: ₡900 (10%)     │
│  ISEBEC, IPT         │                  │  ISEC: ₡450 (5%)     │
│                      │                  │                      │
│  Based on quantity   │                  │  Applied to          │
│  and tax amounts     │                  │  subtotal            │
└──────────┬───────────┘                  └──────────┬───────────┘
           │                                         │
           └─────────────┬───────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Calculate Base     │
              │   Amount for IVA     │
              │                      │
              │   ₡9,000 (subtotal)  │
              │   + ₡900 (ISC)       │
              │   + ₡450 (ISEC)      │
              │   = ₡10,350          │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Other Taxes (99)   │
              │                      │
              │   Applied to base    │
              │   ₡10,350 × 5%       │
              │   = ₡517.50          │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   IVA Taxes          │
              │   (01, 07, 08)       │
              │                      │
              │   IVA 13%:           │
              │   ₡10,350 × 0.13     │
              │   = ₡1,345.50        │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Total Before       │
              │   Factory Charge     │
              │                      │
              │   ₡9,000 (subtotal)  │
              │   + ₡900 (ISC)       │
              │   + ₡450 (ISEC)      │
              │   + ₡517.50 (OTROS)  │
              │   + ₡1,345.50 (IVA)  │
              │   = ₡12,213          │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Factory Tax        │
              │   Charge Logic       │
              │                      │
              │   If applicable:     │
              │   - Subtract assumed │
              │     taxes from total │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   FINAL TOTAL        │
              │   ₡12,213            │
              └──────────────────────┘
```

---

## Tax Type Categories

### Category 1: IVA Taxes (Applied Last)
```
┌─────────────────────────────────────────────────────────┐
│  IVA TAXES - Applied to Base Amount                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  01 - IVA          │  base_amount × rate / 100          │
│  07 - IVACE        │  base_amount × rate / 100          │
│  08 - IVARBU       │  subtotal × factor                 │
│                                                          │
│  ✓ Applied after all other taxes                        │
│  ✓ Uses base_amount (subtotal + forBaseAmount taxes)    │
│  ✗ Never assumed by factory                             │
│  ✗ Never added to base amount                           │
└─────────────────────────────────────────────────────────┘
```

### Category 2: Special Taxes (Applied First)
```
┌─────────────────────────────────────────────────────────┐
│  SPECIAL TAXES - Require Tax Amount Lookup              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  03 - IUC          │  quantity × tax_amount             │
│  04 - ISEBA        │  detail_qty × (qty × %/100) × amt  │
│  05 - ISEBEC       │  Complex (see reference doc)       │
│  06 - IPT          │  detail_qty × qty × tax_amount     │
│                                                          │
│  ✓ Applied to subtotal                                  │
│  ✓ Can be assumed by factory                            │
│  ✓ Some add to base amount (04, 05)                     │
│  ✓ Require special fields (quantity, %, volume, etc.)   │
└─────────────────────────────────────────────────────────┘
```

### Category 3: Consumption Taxes (Applied Second)
```
┌─────────────────────────────────────────────────────────┐
│  CONSUMPTION TAXES - Simple Percentage                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  02 - ISC          │  subtotal × rate / 100             │
│  12 - ISEC         │  subtotal × 0.05 (fixed 5%)        │
│                                                          │
│  ✓ Applied to subtotal                                  │
│  ✓ Added to base amount for IVA                         │
│  ✓ ISEC can be assumed by factory                       │
│  ✗ ISC cannot be assumed by factory                     │
└─────────────────────────────────────────────────────────┘
```

### Category 4: Other Taxes (Applied Third)
```
┌─────────────────────────────────────────────────────────┐
│  OTHER TAXES - Catch-all Category                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  99 - OTROS        │  base_amount × rate / 100          │
│                                                          │
│  ✓ Applied to base amount (not subtotal)                │
│  ✗ Not added to base amount                             │
│  ✗ Cannot be assumed by factory                         │
│  ✓ User enters custom percentage                        │
└─────────────────────────────────────────────────────────┘
```

---

## Base Amount Calculation

The base amount is critical for IVA calculation:

```
base_amount = subtotal + taxes_with_forBaseAmount_true

Taxes that increase base amount:
├─ 02 (ISC)
├─ 04 (ISEBA)
├─ 05 (ISEBEC)
└─ 12 (ISEC)
```

### Example:
```
Subtotal:           ₡10,000
ISC (10%):          ₡1,000   ← Added to base
ISEC (5%):          ₡500     ← Added to base
IUC:                ₡200     ← NOT added to base
─────────────────────────────
Base Amount:        ₡11,500
IVA (13%):          ₡1,495
─────────────────────────────
Total:              ₡13,195
```

---

## Factory Tax Charge Logic

Factory tax charge affects which taxes are included in the final total:

```
┌─────────────────────────────────────────────────────────┐
│  FACTORY TAX CHARGE CONDITIONS                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Taxes are ASSUMED BY FACTORY when:                     │
│                                                          │
│  1. Tax has forFactoryTax = true                        │
│     AND factory_tax_charge_id is set                    │
│     AND charge code = '01' (assumed)                    │
│                                                          │
│  2. Tax is ISC (12) or IUC (03)                         │
│     AND has_factory_tax = true                          │
│                                                          │
│  3. Invoice has bonus/gift discounts (types 01, 03)     │
│     AND document is NOT purchase or export              │
│                                                          │
│  When assumed:                                          │
│  ├─ Tax is calculated normally                          │
│  ├─ Added to factory_assumed_tax                        │
│  ├─ Subtracted from net_tax                             │
│  └─ Subtracted from total_amount_line                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Example with Factory Charge:
```
Subtotal:                   ₡10,000
ISEC (5%):                  ₡500
Base Amount:                ₡10,500
IVA (13%):                  ₡1,365
─────────────────────────────────────
Total before factory:       ₡11,865
Factory assumed (ISEC):     -₡500
─────────────────────────────────────
FINAL TOTAL:                ₡11,365
```

---

## Discount Impact

Discounts are applied BEFORE any tax calculations:

```
┌─────────────────────────────────────────────────────────┐
│  DISCOUNT CALCULATION                                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Calculate base price                                │
│     base_price = net_price × quantity                   │
│                                                          │
│  2. Calculate discount amount                           │
│     discount_amount = base_price × (percentage / 100)   │
│                                                          │
│  3. Calculate subtotal                                  │
│     subtotal = base_price - discount_amount             │
│                                                          │
│  4. All taxes applied to subtotal                       │
│                                                          │
│  Special discount types (01, 03) trigger factory tax:   │
│  ├─ 01: Bonus/promotional discount                      │
│  └─ 03: Gift/free item                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Complete Example

### Scenario: Product with Multiple Taxes

```
Product Details:
├─ Net Price: ₡10,000
├─ Quantity: 1
├─ Discount: 10%
└─ Taxes: ISC (10%), ISEC (5%), IVA (13%)

Step-by-Step Calculation:

1. Base Price
   ₡10,000 × 1 = ₡10,000

2. Apply Discount
   ₡10,000 × 10% = ₡1,000
   Subtotal = ₡10,000 - ₡1,000 = ₡9,000

3. Calculate ISC (Consumption Tax)
   ₡9,000 × 10% = ₡900
   [Added to base amount]

4. Calculate ISEC (Specific Consumption Tax)
   ₡9,000 × 5% = ₡450
   [Added to base amount]

5. Calculate Base Amount for IVA
   ₡9,000 + ₡900 + ₡450 = ₡10,350

6. Calculate IVA
   ₡10,350 × 13% = ₡1,345.50

7. Calculate Total
   ₡9,000 (subtotal)
   + ₡900 (ISC)
   + ₡450 (ISEC)
   + ₡1,345.50 (IVA)
   ─────────────────
   = ₡11,695.50

8. Apply Factory Charge (if applicable)
   If ISEC is assumed by factory:
   ₡11,695.50 - ₡450 = ₡11,245.50

FINAL BREAKDOWN:
├─ Subtotal after discount:  ₡9,000.00
├─ ISC (10%):                ₡900.00
├─ ISEC (5%):                ₡450.00
├─ IVA (13%):                ₡1,345.50
├─ Factory assumed:          -₡450.00
└─ TOTAL:                    ₡11,245.50
```

---

## Tax Calculation Service Methods

### Main Method: `getLineAmounts()`

```typescript
interface LineAmountsResult {
  net_tax: number;              // Total taxes added to line
  total_amount_line: number;    // Final line total
  base_amount: number;          // Base for IVA calculation
  factory_assumed_tax: number;  // Taxes assumed by factory
  iva_tax_total: number;        // Total IVA taxes
  other_tax_total: number;      // Total non-IVA taxes
}
```

### Processing Order:

1. **Process Special Taxes** (03, 04, 05, 06)
   - Calculate using tax amounts
   - Add to base if `forBaseAmount = true`
   - Check factory tax conditions

2. **Process Consumption Taxes** (02, 12)
   - Calculate from subtotal
   - Add to base amount
   - Check factory tax conditions

3. **Process Other Taxes** (99)
   - Calculate from base amount
   - Check factory tax conditions

4. **Process IVA Taxes** (01, 07, 08)
   - Calculate from base amount
   - Check bonus/gift discount conditions
   - Never added to base amount

---

## Key Formulas

### IVA Calculation
```
IVA (01, 07) = base_amount × rate / 100
IVARBU (08) = subtotal × factor
```

### Base Amount
```
base_amount = subtotal + Σ(taxes where forBaseAmount = true)
```

### Factory Assumed Tax
```
factory_assumed_tax = Σ(taxes where conditions met)

Conditions:
- (forFactoryTax && has_factory_tax) OR
- (code in ['12', '03'] && has_factory_tax) OR
- (has_bonus_gift_discounts && !is_purchase_export)
```

### Final Total
```
total_amount_line = subtotal + net_tax
net_tax = Σ(all_taxes) - factory_assumed_tax
```

---

## References

- **Implementation**: `src/services/taxCalculationService.ts`
- **Configuration**: `src/types/taxTypeConfig.ts`
- **Tax Types Reference**: `TAX_TYPES_REFERENCE.md`
