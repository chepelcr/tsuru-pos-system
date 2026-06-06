# Factory Charge & Discount Logic - Complete Reference

## Factory Charge Codes

- **Code '01' (SEDINF)**: Tax IS assumed by factory
- **Code '02' (SEDINF_EXEMPT)**: Tax NOT assumed by factory

## Discount Codes (Bonus/Gift)

- **Code '01'**: Regalía (Gift/Regalia)
- **Code '03'**: Bonificación (Bonus/Bonification)

---

## Complete Calculation Flow

### **Scenario 1: Normal Case**
**No factory charge, no bonus/gift discounts**

**Example:**
- Product: ₡10,000
- IVA 13%

**Calculation:**
1. Subtotal = ₡10,000
2. `hasFactoryTax = false` (no factory charge)
3. `hasDiscountsBonusOrGifts = false`
4. IVA = ₡10,000 × 13% = ₡1,300
5. Condition: `hasDiscountsBonusOrGifts && !isPurchaseOrExportBill` = FALSE
6. **IVA added to total**

**Result:**
```
Subtotal:             ₡10,000
IVA 13%:              +₡1,300
Factory Assumed:       ₡0
Total:                ₡11,300
```

---

### **Scenario 2: Factory Charge Code '01' (SEDINF)**
**Tax IS assumed by factory, no bonus/gift discounts**

**Example:**
- Product: ₡10,000
- ISEC 5%
- IVA 13%
- Factory Charge: Code '01'

**Calculation:**
1. Subtotal = ₡10,000
2. `hasFactoryTax = true` (code '01' selected)
3. `hasDiscountsBonusOrGifts = false`

**ISEC Processing:**
- ISEC amount = ₡10,000 × 5% = ₡500
- ISEC has `forFactoryTax = true`, `forBaseAmount = true`
- baseAmount += ₡500 → baseAmount = ₡10,500
- Condition check:
  - `(forFactoryTax && !hasFactoryTax)` = (true && false) = FALSE
  - `((code === '12' || code === '03') && hasFactoryTax)` = (true && true) = **TRUE**
- **ISEC goes to factory_assumed_tax**
- totalAmountLine -= ₡500

**IVA Processing:**
- IVA amount = baseAmount × 13% = ₡10,500 × 0.13 = ₡1,365
- IVA has `forFactoryTax = false`
- Condition: `hasDiscountsBonusOrGifts && !isPurchaseOrExportBill` = FALSE
- **IVA added to total**

**Result:**
```
Subtotal:             ₡10,000
ISEC 5%:              +₡500 (in base)
Base for IVA:          ₡10,500
IVA 13%:              +₡1,365
Factory Assumed:      -₡500 (ISEC)
Total:                ₡11,365
```

**Key Point:** With factory charge '01', ONLY ISEC ('12') and IUC ('03') go to factory_assumed_tax. IVA is still added to the customer total.

---

### **Scenario 3: Factory Charge Code '02' (SEDINF_EXEMPT)**
**Tax NOT assumed by factory, no bonus/gift discounts**

**Example:**
- Product: ₡10,000
- ISEC 5%
- IVA 13%
- Factory Charge: Code '02'

**Calculation:**
1. Subtotal = ₡10,000
2. `hasFactoryTax = false` (code '02' selected)
3. `hasDiscountsBonusOrGifts = false`

**ISEC Processing:**
- ISEC amount = ₡10,000 × 5% = ₡500
- baseAmount += ₡500 → baseAmount = ₡10,500
- Condition check:
  - `(forFactoryTax && !hasFactoryTax)` = (true && true) = **TRUE**
  - **ISEC goes to factory_assumed_tax**
- totalAmountLine -= ₡500

**IVA Processing:**
- IVA amount = baseAmount × 13% = ₡10,500 × 0.13 = ₡1,365
- Condition: `hasDiscountsBonusOrGifts && !isPurchaseOrExportBill` = FALSE
- **IVA added to total**

**Result:**
```
Subtotal:             ₡10,000
ISEC 5%:              +₡500 (in base)
Base for IVA:          ₡10,500
IVA 13%:              +₡1,365
Factory Assumed:      -₡500 (ISEC)
Total:                ₡11,365
```

**Key Point:** With factory charge '02' or no factory charge, taxes with `forFactoryTax=true` go to factory_assumed_tax.

---

### **Scenario 4: Bonus/Gift Discount**
**Discount code '01' (Regalía) or '03' (Bonificación) present**

**Example:**
- Product: ₡10,000
- Discount: 10% (code '01' - Regalía)
- IVA 13%

**Calculation:**
1. Net price = ₡10,000
2. Discount = ₡10,000 × 10% = ₡1,000
3. Subtotal = ₡10,000 - ₡1,000 = ₡9,000
4. `hasDiscountsBonusOrGifts = true` (discount code '01' present)
5. `hasFactoryTax = false` (no factory charge)

**IVA Processing:**
- IVA calculated on totalAmountLine (not baseAmount)
- IVA amount = ₡9,000 × 13% = ₡1,170
- Condition: `hasDiscountsBonusOrGifts && !isPurchaseOrExportBill` = **TRUE**
- **IVA goes to factory_assumed_tax**
- totalAmountLine stays at ₡9,000 (IVA not added)

**Result:**
```
Base price:           ₡10,000
Discount 10%:         -₡1,000
Subtotal:              ₡9,000
IVA 13%:              +₡1,170 (calculated but not added)
Factory Assumed:      -₡1,170 (IVA)
Total:                 ₡9,000
```

**Key Point:** When bonus/gift discount present, ALL taxes (including IVA) go to factory_assumed_tax. Customer pays only the discounted price.

---

## The Two Critical Conditions

### **Condition 1: Special Taxes (ISEC, IUC, ISEBA, etc.)**
```typescript
if (
  (tax_config?.forFactoryTax && !has_factory_tax) ||
  ((tax_type.code === '12' || tax_type.code === '03') && has_factory_tax)
)
```

**Goes to factory_assumed_tax when:**
- Tax has `forFactoryTax=true` AND no factory charge selected (code '02' or none)
- **OR** tax is ISEC ('12') or IUC ('03') AND factory charge code '01' selected

### **Condition 2: Bonus/Gift Discounts (ALL Taxes)**
```typescript
else if (has_discounts_bonus_or_gifts && !is_purchase_or_export_bill)
```

**Goes to factory_assumed_tax when:**
- Discount code '01' (Regalía) OR '03' (Bonificación) present
- AND document is NOT purchase invoice or export bill
- **Applies to ALL taxes including IVA**

---

## Tax Configuration Reference

### Taxes with `forFactoryTax = true`
- **'03'** - IUC (Unique Fuel Tax)
- **'04'** - ISEBA (Alcoholic Beverages)
- **'05'** - ISEBEC (Packaged Beverages)
- **'06'** - IPT (Tobacco Products)
- **'12'** - ISEC (Cement Tax - 5% fixed)

### Taxes with `forFactoryTax = false`
- **'01'** - IVA (Value Added Tax)
- **'02'** - ISC (Selective Consumption Tax)
- **'07'** - IVACE (IVA for Authorized Purchases)
- **'08'** - IVARBU (IVA for Used Goods)
- **'99'** - OTROS (Other Taxes)

---

## Summary Table

| Scenario | Factory Charge | Bonus/Gift Discount | ISEC/IUC | Other Special Taxes | IVA | Customer Pays |
|----------|----------------|---------------------|----------|---------------------|-----|---------------|
| Normal | None | No | Added to total | Added to total | Added to total | Subtotal + All Taxes |
| Code '01' | SEDINF (assumed) | No | **Factory assumed** | Added to total | Added to total | Subtotal + IVA + Other Taxes |
| Code '02' | SEDINF_EXEMPT | No | **Factory assumed** | Added to total | Added to total | Subtotal + IVA + Other Taxes |
| Any | Any | **Yes** | **Factory assumed** | **Factory assumed** | **Factory assumed** | Subtotal only |

---

## Implementation Notes

1. **hasFactoryTax determination:**
   - `true` when factory charge code '01' is selected
   - `false` when factory charge code '02' is selected OR no factory charge

2. **Discount code checking:**
   - Must check `discount_code === '01' || discount_code === '03'`
   - NOT `discount_type_id === 1 || discount_type_id === 3`
   - Codes are strings, not numbers

3. **Tax type matching:**
   - Use `tax_type.code` for comparisons
   - API returns `id` field from HaciendaBase
   - Map `tax_id: tt.id` when passing to calculation service

4. **Display in Commercial Value:**
   - Show factory_assumed_tax only when > 0
   - Display in warning color (orange/yellow)
   - Subtract from total line amount
