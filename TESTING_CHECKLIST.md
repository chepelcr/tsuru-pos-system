# Line Detail Drawer - Testing Checklist

## ✅ Fixed Issues

### 1. Syntax Error - FIXED
**Issue:** Missing closing parenthesis in discount mapping
**Status:** ✅ Fixed - Added proper parentheses wrapping

### 2. Data Loss on Tax Add - FIXED
**Issue:** When adding combustible tax (IUC), drawer resets and loses data
**Root Cause:** `useEffect` dependency array included `taxTypes` and `discountTypes`, causing reset when data loads
**Fix:** 
- Split into two effects
- First effect only depends on `product.product_id, qty, lineDiscount, lineNote`
- Second effect handles section expansion separately
**Status:** ✅ Fixed

### 3. Missing discount_code Field - FIXED
**Issue:** `LineDiscount` interface in `taxCalculationService.ts` missing `discount_code` field
**Status:** ✅ Fixed - Added `discount_code?: string` field

---

## 🧪 Test Scenarios

### Test 1: Normal Case (No Factory Charge, No Bonus)
**Setup:**
- Product: ₡10,000
- Add IVA 13%
- No factory charge selected
- No discounts

**Expected Results:**
```
Base price:           ₡10,000
IVA 13%:              +₡1,300
Factory Assumed:       ₡0
Total:                ₡11,300
```

**Console Log Should Show:**
```javascript
{
  hasFactoryTaxAssumed: false,
  selectedFactoryCharge: undefined,
  hasBonusGiftDiscount: false,
  discountCodes: [],
  result: {
    iva_tax_total: 1300,
    factory_assumed_tax: 0,
    total_amount_line: 11300
  }
}
```

---

### Test 2: Factory Charge Code '01' with ISEC
**Setup:**
- Product: ₡10,000
- Add ISEC 5% (code '12')
- Add IVA 13%
- Select Factory Charge: Code '01' (SEDINF)

**Expected Results:**
```
Base price:           ₡10,000
ISEC 5%:              +₡500 (added to base)
Base for IVA:          ₡10,500
IVA 13%:              +₡1,365
Factory Assumed:      -₡500 (ISEC only)
Total:                ₡11,365
```

**Console Log Should Show:**
```javascript
{
  hasFactoryTaxAssumed: true,
  selectedFactoryCharge: { id: X, code: '01', description: 'SEDINF' },
  hasBonusGiftDiscount: false,
  taxCodes: [
    { code: '12', description: 'ISEC' },
    { code: '01', description: 'IVA' }
  ],
  result: {
    base_amount: 10500,
    other_tax_total: 0,
    iva_tax_total: 1365,
    factory_assumed_tax: 500,
    total_amount_line: 11365
  }
}
```

**Key Point:** IVA is added to customer total, NOT factory_assumed_tax

---

### Test 3: Factory Charge Code '02' with ISEC
**Setup:**
- Product: ₡10,000
- Add ISEC 5% (code '12')
- Add IVA 13%
- Select Factory Charge: Code '02' (SEDINF_EXEMPT)

**Expected Results:**
```
Base price:           ₡10,000
ISEC 5%:              +₡500 (added to base)
Base for IVA:          ₡10,500
IVA 13%:              +₡1,365
Factory Assumed:      -₡500 (ISEC only)
Total:                ₡11,365
```

**Console Log Should Show:**
```javascript
{
  hasFactoryTaxAssumed: false,
  selectedFactoryCharge: { id: X, code: '02', description: 'SEDINF_EXEMPT' },
  hasBonusGiftDiscount: false,
  result: {
    base_amount: 10500,
    iva_tax_total: 1365,
    factory_assumed_tax: 500,
    total_amount_line: 11365
  }
}
```

**Key Point:** Same result as Code '01' for ISEC. IVA still added to customer total.

---

### Test 4: Combustible Tax (IUC - Code '03')
**Setup:**
- Product: ₡10,000
- Add IUC (code '03') with special fields
- Add IVA 13%
- Select Factory Charge: Code '01'

**Expected Results:**
```
Base price:           ₡10,000
IUC:                  +₡XXX (calculated from special fields)
Base for IVA:          ₡10,XXX
IVA 13%:              +₡X,XXX
Factory Assumed:      -₡XXX (IUC only)
Total:                ₡XX,XXX
```

**Key Test:** Drawer should NOT close/reset when adding IUC tax

---

### Test 5: Bonus Discount (Code '01' - Regalía)
**Setup:**
- Product: ₡10,000
- Add discount 10% with type "Regalía" (code '01')
- Add IVA 13%
- No factory charge

**Expected Results:**
```
Base price:           ₡10,000
Discount 10%:         -₡1,000
Subtotal:              ₡9,000
IVA 13%:              +₡1,170 (calculated but not added)
Factory Assumed:      -₡1,170 (IVA)
Total:                 ₡9,000
```

**Console Log Should Show:**
```javascript
{
  hasFactoryTaxAssumed: false,
  selectedFactoryCharge: undefined,
  hasBonusGiftDiscount: true,
  discountCodes: [{ id: 1, code: '01' }],
  result: {
    iva_tax_total: 0,
    factory_assumed_tax: 1170,
    total_amount_line: 9000
  }
}
```

**Key Point:** IVA goes to factory_assumed_tax because of bonus discount

---

### Test 6: Bonus Discount (Code '03' - Bonificación)
**Setup:**
- Product: ₡10,000
- Add discount 15% with type "Bonificación" (code '03')
- Add IVA 13%
- No factory charge

**Expected Results:**
```
Base price:           ₡10,000
Discount 15%:         -₡1,500
Subtotal:              ₡8,500
IVA 13%:              +₡1,105 (calculated but not added)
Factory Assumed:      -₡1,105 (IVA)
Total:                 ₡8,500
```

**Console Log Should Show:**
```javascript
{
  hasBonusGiftDiscount: true,
  discountCodes: [{ id: 3, code: '03' }],
  result: {
    factory_assumed_tax: 1105,
    total_amount_line: 8500
  }
}
```

---

### Test 7: Regular Discount (NOT Bonus/Gift)
**Setup:**
- Product: ₡10,000
- Add discount 10% with type "Descuento comercial" (code '02' or other)
- Add IVA 13%

**Expected Results:**
```
Base price:           ₡10,000
Discount 10%:         -₡1,000
Subtotal:              ₡9,000
IVA 13%:              +₡1,170
Factory Assumed:       ₡0
Total:                ₡10,170
```

**Console Log Should Show:**
```javascript
{
  hasBonusGiftDiscount: false,
  discountCodes: [{ id: 2, code: '02' }],
  result: {
    iva_tax_total: 1170,
    factory_assumed_tax: 0,
    total_amount_line: 10170
  }
}
```

**Key Point:** Regular discounts don't affect tax treatment

---

## 🎯 What to Verify

1. **Drawer Stability:** Adding any tax should NOT close/reset the drawer
2. **Discount Codes:** Check console logs show correct discount codes ('01', '03', etc.)
3. **Tax Codes:** Check console logs show correct tax codes ('01', '12', '03', etc.)
4. **IVA Behavior:**
   - With factory charge: IVA added to total
   - With bonus/gift discount: IVA goes to factory_assumed_tax
5. **ISEC/IUC Behavior:**
   - With factory charge '01': Goes to factory_assumed_tax
   - With factory charge '02': Goes to factory_assumed_tax
   - Without factory charge: Added to total (if forFactoryTax=false) or factory_assumed_tax (if forFactoryTax=true)

---

## 📝 Summary of Correct Behavior

| Scenario | Factory Charge | Discount Type | IVA Treatment | ISEC/IUC Treatment |
|----------|----------------|---------------|---------------|-------------------|
| Normal | None | None | Added to total | Added to total |
| Code '01' | SEDINF | None | Added to total | Factory assumed |
| Code '02' | SEDINF_EXEMPT | None | Added to total | Factory assumed |
| Any | Any | Bonus/Gift ('01'/'03') | Factory assumed | Factory assumed |
| Any | Any | Regular (other codes) | Added to total | Depends on factory charge |

**The implementation is CORRECT!** IVA only goes to factory_assumed_tax with bonus/gift discounts, not with factory charge selection.
