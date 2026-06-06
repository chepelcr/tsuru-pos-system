# IVA and Factory Charge - Important Clarification

## ⚠️ CRITICAL UNDERSTANDING

**IVA DOES NOT go to factory_assumed_tax when you select a factory charge!**

This is the correct behavior according to the JCampos-Biller implementation.

---

## The Two Separate Mechanisms

### 1. Factory Charge Selection (Codes '01' and '02')
**Purpose:** Determines which SPECIAL TAXES are assumed by the factory

**Code '01' (SEDINF - Tax IS assumed):**
- Only ISEC ('12') and IUC ('03') → factory_assumed_tax
- **IVA → Added to customer total** ✅
- Other special taxes → Added to customer total

**Code '02' (SEDINF_EXEMPT - Tax NOT assumed):**
- All taxes with `forFactoryTax=true` → factory_assumed_tax
- **IVA → Added to customer total** ✅

**Key Point:** Factory charge selection NEVER affects IVA!

---

### 2. Bonus/Gift Discounts (Codes '01' and '03')
**Purpose:** When giving away products or bonuses, ALL taxes are assumed

**When discount code '01' (Regalía) or '03' (Bonificación) is present:**
- ALL special taxes → factory_assumed_tax
- **IVA → factory_assumed_tax** ✅
- Customer pays ONLY the discounted price

**Key Point:** This is the ONLY way IVA goes to factory_assumed_tax!

---

## Why This Makes Business Sense

### Normal Sale with Factory Charge
```
Product: ₡10,000
ISEC 5%: ₡500
IVA 13%: ₡1,365

Factory Charge '01' selected:
- ISEC is assumed by factory (they pay it)
- Customer still pays IVA (₡1,365)
- Customer total: ₡11,365

Why? The factory is taking responsibility for the special cement tax,
but the customer still owes the government the value-added tax.
```

### Gift/Bonus Discount
```
Product: ₡10,000
Discount 10% (code '01' - Regalía): -₡1,000
Subtotal: ₡9,000
IVA 13%: ₡1,170

Bonus discount present:
- IVA is assumed by factory (they pay it)
- Customer pays: ₡9,000

Why? When giving away a product as a gift/bonus, the company
absorbs ALL taxes. The customer receives it at the discounted
price with no additional charges.
```

---

## Testing Scenarios

### ✅ Test 1: Normal Case (No Factory Charge, No Bonus)
**Expected:**
- IVA added to customer total
- factory_assumed_tax = 0

### ✅ Test 2: Factory Charge '01' with ISEC
**Expected:**
- ISEC → factory_assumed_tax
- IVA → added to customer total
- factory_assumed_tax = ISEC amount only

### ✅ Test 3: Factory Charge '02' with ISEC
**Expected:**
- ISEC → factory_assumed_tax
- IVA → added to customer total
- factory_assumed_tax = ISEC amount only

### ✅ Test 4: Bonus Discount (code '01' or '03')
**Expected:**
- ALL taxes → factory_assumed_tax
- IVA → factory_assumed_tax
- Customer pays only discounted price

---

## What You Should See in the UI

### Commercial Value Section - Normal Case
```
Base price:           ₡10,000
IVA 13%:              +₡1,300
Total:                ₡11,300
```

### Commercial Value Section - Factory Charge '01' with ISEC
```
Base price:           ₡10,000
ISEC 5%:              +₡500
Base for IVA:          ₡10,500
IVA 13%:              +₡1,365
Factory Assumed:      -₡500 (ISEC only)
Total:                ₡11,365
```

### Commercial Value Section - Bonus Discount
```
Base price:           ₡10,000
Discount 10%:         -₡1,000
Subtotal:              ₡9,000
IVA 13%:              +₡1,170 (calculated)
Factory Assumed:      -₡1,170 (IVA)
Total:                 ₡9,000
```

---

## Summary

| What You Select | IVA Behavior |
|----------------|--------------|
| No factory charge | IVA → customer pays |
| Factory charge '01' | IVA → customer pays |
| Factory charge '02' | IVA → customer pays |
| Bonus/gift discount | IVA → factory assumes |

**The implementation is correct!** IVA only goes to factory_assumed_tax when there's a bonus/gift discount, not when you select a factory charge.
