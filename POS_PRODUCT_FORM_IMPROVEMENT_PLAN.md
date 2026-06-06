# POS Product Form Improvement Plan

## Executive Summary

This document outlines the comprehensive improvements needed for the POS system product form to match the patterns and best practices established in the Dashboard (`E:\dev\BeautyMarket\dashboard\src`) and JCampos-Biller (`E:\dev\JCampos-Biller`) projects.

**Current State:** Simple drawer form with basic fields
**Target State:** Organized, sectioned form with proper field ordering, validation, and calculation capabilities

---

## 1. Architecture & Component Structure

### 1.1 Create Reusable Section Component (COMMON COMPONENT)

**Location:** `src/components/common/SectionWrapper.tsx` ⚠️ **IMPORTANT: Common component for reuse across ALL forms**

**Purpose:** Standardized collapsible section with icon, title, and eye button that can be used in:
- Product forms
- Branch forms
- Customer forms
- Invoice line detail forms
- Any other forms requiring sectioned organization

**Features:**
- Collapsible/expandable behavior
- Icon support (lucide-react)
- Disabled state handling with visual feedback
- Smooth transitions (300ms ease-in-out)
- Eye button for toggle
- Optional badge/counter display
- Conditional rendering based on visibility prop
- Loading state support
- Error state support

**Props Interface:**
```typescript
interface SectionWrapperProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  visible?: boolean; // For conditional sections
  badge?: string | number; // Optional badge (e.g., "3 items")
  loading?: boolean;
  error?: string;
  className?: string;
}
```

**Reference:** 
- Dashboard: `BranchLocationSection.tsx` (location section pattern)
- Dashboard: All section files in `components/products/sections/`
- JCampos-Biller: `LineDetailModal.tsx` (section organization)

---

## 2. Section Organization & Order

### 2.1 Required Sections (In Order)

#### **Section 1: General Information**  REQUIRED FIRST
**Icon:** `Package`
**Fields:**
- Product Name* (required)
- Description (textarea)
- Category (select dropdown)
- Unit of Measure (select with "Otros" option that transforms to input)
- SKU/Internal Code
- Track Inventory (switch)
- Has Fiscal Info (switch)

**Validation:**
- Name, Category, and Unit are required
- Must be completed before other sections unlock (in insert mode)

**Reference:** `dashboard/src/components/products/sections/GeneralInfoSection.tsx`

---

#### **Section 2: Image Upload**
**Icon:** `Image`
**Component:** Reuse existing `ImagePicker`
**Features:**
- Current image preview
- File upload
- Clear/remove option

**Reference:** `dashboard/src/components/products/sections/ImageUploadSection.tsx`

---

#### **Section 3: Packaging Information** (Conditional)
**Icon:** `Package2`
**Visibility:** Only if "Has Package Info" is enabled
**Fields:**
- Is Packaged (checkbox)
- Units per Box (number)
- Commercial Unit Measure (text)

**Reference:** `dashboard/src/components/products/sections/PackagingSection.tsx`

---

#### **Section 4: Inventory Management** (Conditional)
**Icon:** `Package2`
**Visibility:** Only if "Track Inventory" is enabled
**Fields:**
- Current Stock Quantity (number, read-only in POS)
- Low Stock Threshold (number)
- Stock alerts configuration

**Reference:** `dashboard/src/components/products/sections/InventorySection.tsx`

---

#### **Section 5: Product Codes** (Optional)
**Icon:** `Barcode`
**Visibility:** Collapsed by default, expandable
**Fields:**
- Code Type (select from data API)
- Code Number (input)
- Description (auto-filled based on type)
- Add/Remove multiple codes

**Features:**
- Dynamic code entry
- Support for multiple code types (01-13)
- SKU is handled separately in General Info (code type 03)

**Reference:** 
- `dashboard/src/components/products/sections/CodesSection.tsx`
- `JCampos-Biller/client/src/components/products/sections/CodesSection.tsx`

---

#### **Section 6: Fiscal Information** (Optional) 
**Icon:** `Landmark`
**Visibility:** Only if "Has Fiscal Info" is enabled
**Unlock Condition:** General Info must be complete

**Sub-sections:**

##### 6.1 CABYS Selection
- CABYS Code (13 digits)
- CABYS Description (searchable)
- Search button with modal
- Clear button when selected
- Product Type selection (Bien/Servicio)

##### 6.2 IVA Tax Section (Auto-appears after CABYS)
- Tax Type selection (IVA 01, IVACE 07, IVARBU 08)
- Tax Rate dropdown (from data API)
- Tax Factor (for IVARBU only)
- Rate percentage display
- Calculated tax amount preview

**Reference:** 
- `dashboard/src/components/products/sections/FiscalInformationSection.tsx`
- `dashboard/src/components/products/sections/IvaTaxSection.tsx`
- `JCampos-Biller/client/src/components/products/sections/FiscalInformationSection.tsx`

---

#### **Section 7: Other Taxes** (Optional) 
**Icon:** `Receipt`
**Visibility:** Collapsed by default
**Unlock Condition:** CABYS must be selected

**Features:**
- Add multiple tax types (excluding IVA types)
- Tax type badges with codes
- Rate input for each tax
- Special fields for specific tax types
- Remove tax button
- Calculated amounts

**Tax Types Supported:**
- 02: Selective Consumption
- 03: Unique Social Contribution
- 04: Specific Consumption
- 05: Fuels
- 06: Tobacco
- 99: Other

**Reference:** 
- `dashboard/src/components/products/sections/OtherTaxSection.tsx`
- `JCampos-Biller/client/src/components/invoices/line-detail/OtherTaxSection.tsx`

---

#### **Section 8: Discounts** (Optional) 
**Icon:** `Percent`
**Visibility:** Collapsed by default
**Unlock Condition:** General Info must be complete

**Features:**
- Add multiple discount types
- Discount type selection (from data API)
- Percentage input
- Calculated discount amounts
- Remove discount button

**Reference:** 
- `dashboard/src/components/products/sections/DiscountsSection.tsx`
- `JCampos-Biller/client/src/components/products/sections/DiscountsSection.tsx`

---

#### **Section 9: Customs Information** (Optional) 
**Icon:** `Globe`
**Visibility:** Collapsed by default
**Unlock Condition:** General Info must be complete

**Fields:**
- Customs Part Number (text)
- Additional customs data

**Reference:** 
- `dashboard/src/components/products/sections/CustomsSection.tsx`
- `JCampos-Biller/client/src/components/products/sections/CustomsSection.tsx`

---

#### **Section 10: Commercial Value & Pricing** 
**Icon:** `DollarSign`
**Unlock Condition:** General Info must be complete

**Fields:**
- Base Price (without taxes) - REQUIRED*
- Base Amount (for IVACE calculations)
- Unit Price (calculated)
- Sale Price (calculated with all taxes/discounts)

**Calculations:**
- Real-time price calculation
- Tax amount breakdown
- Discount application
- Final sale price display

**Reference:** 
- `dashboard/src/components/products/sections/CommercialValueSection.tsx`
- `JCampos-Biller/client/src/components/products/sections/CommercialValueSection.tsx`

---

## 3. Calculation Service Integration (CRITICAL - JCampos-Biller Business Logic)

### 3.1 Tax Calculation Service - COMPLETE MIGRATION

**Location:** `src/services/taxCalculationService.ts`

**Current Implementation:** Basic `computeSalePrice` function

**REQUIRED:** Complete migration of JCampos-Biller calculation logic

**Reference:** `JCampos-Biller/client/src/services/taxCalculationService.ts`

---

### 3.2 Core Calculation Functions

#### 3.2.1 Main Line Amounts Calculation
```typescript
static getLineAmounts(params: LineAmountsParams): LineAmountsResult
```

**Purpose:** Calculate all amounts for a product/line item

**Inputs:**
- `subtotal`: Base amount after discounts
- `baseAmount`: For IVACE calculations
- `taxes`: Array of tax entries
- `taxTypes`: Available tax types
- `discounts`: Array of discount entries
- `documentType`: Invoice type (affects calculations)
- `detailQuantity`: Quantity of items
- `cabys`: Product CABYS code
- `taxAmounts`: Tax amount lookup table
- `hasFactoryTax`: Factory tax indicator

**Outputs:**
- `netTax`: Total tax amount
- `totalAmountLine`: Final line total
- `baseAmount`: Calculated base amount
- `factoryAssumedTax`: Tax assumed by factory
- `ivaTaxTotal`: Total IVA taxes
- `otherTaxTotal`: Total other taxes

**Business Logic:**
1. Process special taxes first (ISC, IUC, ISEBA, ISEBEC, IPT, ISEC)
2. Add special taxes to base amount if required
3. Handle factory assumed tax logic
4. Process "Other" taxes (code 99)
5. Process IVA taxes last (01, 07, 08)

---

#### 3.2.2 IVA Tax Calculation
```typescript
static calculateIvaTaxAmount(params: IvaTaxCalculationParams): number
```

**Tax Types:**
- **01 (IVA):** Standard VAT
- **07 (IVACE):** VAT with factory charge
- **08 (IVARBU):** VAT with factor

**Special Cases:**
- **Bonus/Gift Discounts:** Use total amount instead of base amount
- **Export Bills:** Use total amount
- **Factory Tax:** Affects base amount calculation

**Formula:**
- IVA/IVACE: `baseAmount * rate / 100` OR `totalAmount * rate / 100`
- IVARBU: `factor * subtotal`

---

#### 3.2.3 Other Tax Calculation
```typescript
static calculateTaxAmount(params: TaxCalculationParams): number
```

**Tax Types & Formulas:**

**02 (IUC) - Unique Social Contribution:**
```typescript
amount = taxAmount.amount * specialFields.quantity
```

**03 (ISEBA) - Specific Beverage Tax:**
```typescript
proportion = specialFields.quantity * specialFields.percentage / 100
amount = detailQuantity * proportion * taxAmount.amount
```

**04 (IPT) - Tobacco Products Tax:**
```typescript
amount = detailQuantity * specialFields.quantity * taxAmount.amount
```

**05 (ISEBEC) - Specific Consumption Tax:**
```typescript
// For non-alcoholic beverages (CABYS starts with 2202)
if (cabys.startsWith('2202')) {
  altAmount = taxAmount.amount / specialFields.volumeConsumption
  amount = detailQuantity * specialFields.quantity * altAmount
} else {
  // For soaps
  amount = specialFields.quantity * specialFields.volumeConsumption * taxAmount.amount
}
```

**06 (ISEC) - Selective Consumption:**
```typescript
amount = subtotal * 5.0 / 100  // Fixed 5% rate
```

**99 (OTHERS) - Other Taxes:**
```typescript
amount = baseAmount * rate / 100
```

---

### 3.3 Discount Calculation Logic

#### 3.3.1 Discount Types (from JCampos-Biller)

**Special Discount Types:**
- **01:** Commercial Discount (Regalía)
- **03:** Bonification (Bonificación)

**Business Rule:** Discounts of type 01 or 03 trigger special tax calculation:
- Use `totalAmount` instead of `baseAmount` for IVA calculation
- Affects factory assumed tax logic

#### 3.3.2 Discount Calculation
```typescript
calculateDiscountAmount(percentage: number, netTotal: number): number {
  return (percentage * netTotal) / 100
}

calculateTotalDiscountAmount(discounts: Discount[], netTotal: number): number {
  return discounts.reduce((total, discount) => {
    return total + calculateDiscountAmount(discount.percentage, netTotal)
  }, 0)
}
```

---

### 3.4 Factory Assumed Tax Logic (CRITICAL)

**Conditions for Factory Assumed Tax:**

1. **Condition 1:** Tax type requires factory tax AND no factory tax is set
   ```typescript
   if (taxConfig.forFactoryTax && !hasFactoryTax)
   ```

2. **Condition 2:** Tax codes 12 or 03 AND factory tax is set
   ```typescript
   if ((taxType.code === '12' || taxType.code === '03') && hasFactoryTax)
   ```

3. **Condition 3:** Has bonus/gift discounts AND not purchase/export invoice
   ```typescript
   if (hasDiscountsBonusOrGifts && !isPurchaseOrExportBill)
   ```

**Effect:** Tax amount is:
- Added to `factoryAssumedTax`
- Subtracted from `totalAmountLine`
- Subtracted from `netTax`

---

### 3.5 Base Amount Calculation Logic

**Base Amount Rules:**

1. **Initial:** `baseAmount = subtotal` (after discounts)

2. **Add Special Taxes:** If tax config has `forBaseAmount = true`
   ```typescript
   if (taxConfig.forBaseAmount) {
     baseAmount += taxAmount
   }
   ```

3. **IVACE (07) Requirement:** Must have explicit base amount for factory charge

4. **Editable When:**
   - Has factory tax charge with code '01'
   - Has IVACE tax (code '07')

---

### 3.6 Validation Functions

```typescript
// Document type checks
isExportBill(): boolean
isPurchaseInvoice(): boolean

// Product checks
isProductType(): boolean  // vs Service

// Tax checks
hasFactoryTax(): boolean
hasIvaCE(): boolean
hasDiscountsBonusOrGifts(): boolean

// Field validation
shouldShowCustomsPart(): boolean
shouldShowFactoryCharge(): boolean
shouldBaseAmountBeEditable(): boolean
validateCustomsPart(value: string): string | null
```

---

### 3.7 Tax Configuration System

**Location:** `src/types/taxTypeConfig.ts`

**Purpose:** Define tax type behavior

```typescript
interface TaxConfig {
  iva: boolean;           // Is IVA-type tax
  forBaseAmount: boolean; // Add to base amount
  forFactoryTax: boolean; // Can be factory assumed
  requiresSpecialFields: boolean;
}

const TAX_CONFIGS: Record<string, TaxConfig> = {
  '01': { iva: true, forBaseAmount: false, forFactoryTax: false, requiresSpecialFields: false },
  '07': { iva: true, forBaseAmount: false, forFactoryTax: false, requiresSpecialFields: false },
  '08': { iva: true, forBaseAmount: false, forFactoryTax: false, requiresSpecialFields: true },
  '02': { iva: false, forBaseAmount: true, forFactoryTax: true, requiresSpecialFields: false },
  '03': { iva: false, forBaseAmount: true, forFactoryTax: true, requiresSpecialFields: true },
  // ... etc
}
```

---

### 3.8 Migration Checklist

 Migrate `TaxCalculationService` class completely
 Implement `getLineAmounts()` with all business logic
 Implement `calculateIvaTaxAmount()` with special cases
 Implement `calculateTaxAmount()` for all tax types
 Add factory assumed tax logic
 Add base amount calculation logic
 Add discount type detection
 Add validation functions
 Create tax configuration system
 Add comprehensive unit tests for each tax type
 Test edge cases (bonus discounts, export bills, etc.)
 Verify calculations match JCampos-Biller exactly

---

## 4. Data API Integration

### 4.1 Required API Hooks

**Location:** `src/hooks/useDataApi.ts`

**Already Available:** 
- `useAllTaxes()`
- `useAllTaxRates()`
- `useAllDiscountTypes()`
- `useCabysSearch()`

**Need to Add:**
- `useAllMeasurementUnits()` - For unit selection
- `useAllProductTypes()` - For product type selection
- `useAllTaxFactors()` - For IVARBU tax factors
- `useAllCodeTypes()` - For product codes
- `useAllTaxAmounts()` - For special tax calculations

**Reference:** `dashboard/src/hooks/useDataApi.ts`

---

## 5. Form State Management

### 5.1 Enhanced Form State

**Current:** Simple flat structure in `ProductDrawerForm.tsx`

**Target:** Structured state with proper typing

```typescript
interface ProductFormState {
  // General Info
  name: string;
  description: string;
  category_id: string;
  unitId?: number;
  commercialUnitMeasure?: string;
  sku: string;
  track_inventory: boolean;
  has_fiscal_info: boolean;
  has_package_info: boolean;
  
  // Packaging
  isPackaged: boolean;
  unitsPerBox?: number;
  
  // Inventory
  stock_quantity: number;
  low_stock_threshold: number;
  
  // Codes
  codes: CodeEntry[];
  
  // Fiscal
  cabys: string;
  cabysDescription: string;
  productTypeId: number;
  
  // Taxes
  taxes: TaxFormEntry[];
  
  // Discounts
  discounts: DiscountFormEntry[];
  
  // Customs
  customsPart?: string;
  
  // Pricing
  price: string; // Base price
  baseAmount?: number; // For IVACE
  unitPrice?: number; // Calculated
  salePrice?: number; // Calculated
}
```

---

## 6. UI/UX Improvements

### 6.1 Section Behavior

**Insert Mode (New Product):**
- General Info: Always expanded, always enabled
- All other sections: Disabled until General Info is complete
- Fiscal sections: Disabled until CABYS is selected
- Visual indicators for locked sections

**Edit Mode (Existing Product):**
- All sections enabled
- Sections with data: Expanded by default
- Empty sections: Collapsed by default

### 6.2 Visual Indicators

**Required Fields:**
- Red asterisk (*)
- Clear error messages
- Validation on blur

**Calculated Fields:**
- Read-only styling
- Different background color
- Clear labeling

**Locked Sections:**
- Muted appearance
- Tooltip explaining unlock condition
- Disabled state

### 6.3 Price Preview Card

**Location:** After all sections, before footer

**Design:**
- Prominent card with primary color background
- Large sale price display
- Breakdown of taxes and discounts
- Real-time updates

**Reference:** Current implementation in `ProductDrawerForm.tsx` (keep and enhance)

---

## 7. Validation Rules

### 7.1 Field Validation

**Required Fields:**
- Name (min 3 characters)
- Category
- Unit of Measure
- Base Price (> 0)

**Conditional Required:**
- CABYS Code (if has_fiscal_info = true)
- Tax Rate (if CABYS selected)
- Units per Box (if isPackaged = true)
- Low Stock Threshold (if track_inventory = true)

**Format Validation:**
- CABYS: Exactly 13 digits
- SKU: Alphanumeric
- Prices: Positive numbers
- Percentages: 0-100

### 7.2 Business Logic Validation

**Tax Rules:**
- Only one IVA-type tax allowed (01, 07, or 08)
- IVACE (07) requires baseAmount
- IVARBU (08) requires taxFactor
- Other taxes require CABYS selection

**Discount Rules:**
- Total discounts cannot exceed 100%
- Each discount type can only be added once

---

## 8. Component Files to Create

### 8.1 Common Components (Reusable Across All Forms)

```
src/components/common/
 SectionWrapper.tsx          ⭐ REUSABLE - Use in products, branches, customers, invoices
```

### 8.2 New Section Components

```
src/components/products/sections/
 GeneralInfoSection.tsx      (Section 1)
 ImageUploadSection.tsx      (Section 2)
 PackagingSection.tsx        (Section 3)
 InventorySection.tsx        (Section 4)
 CodesSection.tsx            (Section 5)
 FiscalInformationSection.tsx (Section 6)
 IvaTaxSection.tsx           (Section 6.2)
 OtherTaxSection.tsx         (Section 7)
 DiscountsSection.tsx        (Section 8)
 CustomsSection.tsx          (Section 9)
 CommercialValueSection.tsx  (Section 10)
```

### 8.3 Supporting Components

```
src/components/products/
 CabysModal.tsx              (CABYS search modal)
 TaxRateSelector.tsx         (Tax rate dropdown)
 DiscountTypeSelector.tsx    (Discount type dropdown)
 PricePreviewCard.tsx        (Final price display)
```

### 8.4 Type Definitions

```
src/types/
 taxTypeConfig.ts            ⭐ NEW - Tax configuration system
 productForm.ts              (Enhanced form types)
```

---

## 9. Migration Strategy

### Phase 1: Foundation (Week 1)
1. Create `SectionWrapper` component
2. Add missing data API hooks
3. Enhance `taxCalculationService`
4. Update form state structure

### Phase 2: Core Sections (Week 2)
1. Implement GeneralInfoSection
2. Implement ImageUploadSection
3. Implement PackagingSection
4. Implement InventorySection

### Phase 3: Fiscal Sections (Week 3)
1. Implement FiscalInformationSection
2. Implement IvaTaxSection
3. Implement OtherTaxSection
4. Implement DiscountsSection

### Phase 4: Additional Sections (Week 4)
1. Implement CodesSection
2. Implement CustomsSection
3. Implement CommercialValueSection
4. Implement PricePreviewCard

### Phase 5: Integration & Testing (Week 5)
1. Integrate all sections into ProductDrawerForm
2. Implement validation logic
3. Test calculations
4. Test all user flows
5. Performance optimization

---

## 10. Key Differences from Current Implementation

### 10.1 Current State
- Single flat form
- All fields visible at once
- Limited validation
- Basic tax calculation
- No section organization

### 10.2 Target State
- Organized sections with icons
- Progressive disclosure
- Comprehensive validation
- Advanced tax calculations
- Proper field ordering
- Disabled state management
- Real-time price preview

---

## 11. Testing Requirements

### 11.1 Unit Tests
- Tax calculation accuracy
- Discount calculation accuracy
- Form validation rules
- State management

### 11.2 Integration Tests
- Section unlock logic
- CABYS selection flow
- Tax type switching
- Price calculation updates

### 11.3 User Acceptance Tests
- Create new product flow
- Edit existing product flow
- Complex tax scenarios
- Multiple discounts
- Edge cases

---

## 12. Performance Considerations

### 12.1 Optimization Strategies
- Lazy load sections
- Debounce calculation updates
- Memoize expensive calculations
- Optimize re-renders with React.memo
- Use form field subscriptions wisely

### 12.2 Data Fetching
- Cache data API responses
- Prefetch common data (tax types, rates)
- Implement proper loading states
- Handle errors gracefully

---

## 13. Accessibility Requirements

### 13.1 Keyboard Navigation
- Tab order follows visual order
- All interactive elements keyboard accessible
- Escape key closes modals
- Enter key submits forms

### 13.2 Screen Readers
- Proper ARIA labels
- Section headings
- Error announcements
- Status updates

### 13.3 Visual Accessibility
- Sufficient color contrast
- Clear focus indicators
- Error messages visible
- Loading states announced

---

## 14. Documentation Requirements

### 14.1 Code Documentation
- JSDoc comments for all components
- Type definitions for all interfaces
- Inline comments for complex logic
- README for section components

### 14.2 User Documentation
- Field descriptions
- Validation rules
- Calculation explanations
- Common workflows

---

## 15. Success Criteria

### 15.1 Functional Requirements
 All sections implemented and working
 Calculations match JCampos-Biller accuracy
 Validation prevents invalid data
 Data API integration complete
 Form state properly managed

### 15.2 Quality Requirements
 Code follows project patterns
 Components are reusable
 Performance is acceptable (<100ms updates)
 Accessibility standards met
 Tests pass with >80% coverage

### 15.3 User Experience Requirements
 Intuitive section organization
 Clear visual feedback
 Helpful error messages
 Smooth transitions
 Responsive design

---

## 16. References

### 16.1 Dashboard Implementation
- **Path:** `E:\dev\BeautyMarket\dashboard\src`
- **Key Files:**
  - `components/admin/product-form.tsx`
  - `components/products/sections/*.tsx`
  - `components/branches/BranchLocationSection.tsx`

### 16.2 JCampos-Biller Implementation
- **Path:** `E:\dev\JCampos-Biller\client\src`
- **Key Files:**
  - `components/products/ProductForm.tsx`
  - `components/products/sections/*.tsx`
  - `services/taxCalculationService.ts`

### 16.3 Current POS Implementation
- **Path:** `E:\dev\BeautyMarket\templates\pos-system\src`
- **Key Files:**
  - `components/products/ProductDrawerForm.tsx`
  - `services/taxCalculationService.ts`
  - `hooks/useDataApi.ts`

---

## 18. Special Business Logic Cases (JCampos-Biller)

### 18.1 Bonus & Gift Discount Logic

**Discount Types that Trigger Special Behavior:**
- **Type 01:** Regalía (Commercial Discount)
- **Type 03:** Bonificación (Bonification/Gift)

**Detection:**
```typescript
hasDiscountsBonusOrGifts(): boolean {
  return discounts.some(d => d.discountTypeId === 1 || d.discountTypeId === 3)
}
```

**Effects:**

1. **IVA Tax Calculation:**
   - Normal: Use `baseAmount`
   - With Bonus/Gift: Use `totalAmount` (includes other taxes)

2. **Factory Assumed Tax:**
   - ALL taxes become factory assumed (not added to line total)
   - Exception: Purchase invoices and export bills

3. **Tax Flow:**
   ```
   Normal Flow:
   Subtotal → Add Taxes → Total Line
   
   Bonus/Gift Flow:
   Subtotal → Calculate Taxes → Move to Factory Assumed → Total Line (no tax added)
   ```

---

### 18.2 Document Type Special Cases

#### Export Bills (EXPORT_BILL)
**Effects:**
- IVA calculated on `totalAmount` (not `baseAmount`)
- Customs part field becomes required for products
- Must be exactly 12 digits
- Factory charge section hidden

#### Purchase Invoices (PURCHASE_INVOICE)
**Effects:**
- Factory charge section hidden
- Different tax calculation rules
- Bonus/gift logic does NOT apply

---

### 18.3 Factory Tax Charge Logic

**Factory Tax Charge Types:**
- **Code '01':** Has factory tax
- **Other codes:** No factory tax

**Detection:**
```typescript
hasFactoryTax(): boolean {
  const factoryCharge = factoryTaxCharges.find(
    f => f.factoryTaxChargeId === detail.factoryTaxChargeId
  )
  return factoryCharge?.description?.includes('01')
}
```

**Effects:**

1. **Base Amount Editability:**
   - Editable when: `hasFactoryTax() || hasIvaCE()`
   - Read-only otherwise

2. **Tax Assumption Rules:**
   - Taxes with `forFactoryTax = true` AND no factory tax → Factory assumed
   - Tax codes 12 or 03 AND has factory tax → Factory assumed

---

### 18.4 CABYS-Based Tax Logic

**CABYS Code Patterns:**

**Non-Alcoholic Beverages (starts with '2202'):**
```typescript
if (cabys.startsWith('2202')) {
  // Special ISEBEC calculation
  altAmount = taxAmount.amount / specialFields.volumeConsumption
  amount = detailQuantity * specialFields.quantity * altAmount
}
```

**Other Products:**
```typescript
// Standard ISEBEC calculation
amount = specialFields.quantity * specialFields.volumeConsumption * taxAmount.amount
```

---

### 18.5 Tax Processing Order (CRITICAL)

**Order Matters for Correct Calculations:**

1. **Special Taxes First** (ISC, IUC, ISEBA, ISEBEC, IPT, ISEC)
   - Calculate amounts
   - Add to base amount if `forBaseAmount = true`
   - Check factory assumed conditions
   - Add to `otherTaxTotal` or `factoryAssumedTax`

2. **Other Taxes (99)** Second
   - Calculate on current base amount
   - Add to base amount if `forBaseAmount = true`
   - Check factory assumed conditions

3. **IVA Taxes Last** (01, 07, 08)
   - Calculate on final base amount or total amount
   - Check bonus/gift discount conditions
   - Add to `ivaTaxTotal` or `factoryAssumedTax`

**Why This Order:**
- Special taxes can increase base amount
- Base amount affects IVA calculation
- Factory assumed tax depends on all previous calculations

---

### 18.6 Validation Rules (Business Logic)

#### Tax Validation
```typescript
// Only one IVA-type tax allowed
const ivaCount = taxes.filter(t => 
  ['01', '07', '08'].includes(t.taxTypeCode)
).length
if (ivaCount > 1) throw new Error('Only one IVA tax allowed')

// IVACE requires base amount
if (hasIvaCE() && !baseAmount) {
  throw new Error('IVACE requires base amount')
}

// IVARBU requires tax factor
if (taxType.code === '08' && !tax.taxFactorId) {
  throw new Error('IVARBU requires tax factor')
}
```

#### Discount Validation
```typescript
// Total discounts cannot exceed 100%
const totalPercentage = discounts.reduce((sum, d) => sum + d.percentage, 0)
if (totalPercentage > 100) {
  throw new Error('Total discounts cannot exceed 100%')
}

// Each discount type only once
const uniqueTypes = new Set(discounts.map(d => d.discountTypeId))
if (uniqueTypes.size !== discounts.length) {
  throw new Error('Each discount type can only be used once')
}

// "Other" discount type requires reason
if (discount.discountTypeId === 99 && !discount.reason) {
  throw new Error('Other discount type requires reason')
}
```

#### Customs Validation
```typescript
// Export bills require customs part for products
if (isExportBill() && isProductType() && !customsPart) {
  throw new Error('Customs part required for export bills')
}

// Customs part must be exactly 12 digits
if (customsPart && customsPart.length !== 12) {
  throw new Error('Customs part must be 12 digits')
}
```

---

### 18.7 Edge Cases to Handle

#### Case 1: Multiple Discounts with Bonus
```typescript
// Scenario: 10% commercial + 5% bonus
// Result: Both discounts apply, ALL taxes become factory assumed
```

#### Case 2: IVACE with Factory Tax
```typescript
// Scenario: IVACE tax + Factory charge code '01'
// Result: Base amount is editable, tax calculated on base amount
```

#### Case 3: Special Tax + Bonus Discount
```typescript
// Scenario: ISC tax + Bonus discount
// Result: ISC added to base amount, then becomes factory assumed
```

#### Case 4: Export Bill with IVA
```typescript
// Scenario: Export bill + IVA 13%
// Result: IVA calculated on total amount (including other taxes)
```

#### Case 5: CABYS 2202 Product with ISEBEC
```typescript
// Scenario: Non-alcoholic beverage with ISEBEC tax
// Result: Special calculation (divide by volume consumption)
```

---

### 18.8 Testing Scenarios (Required)

#### Scenario 1: Basic Product
- No discounts
- IVA 13%
- Expected: Simple calculation

#### Scenario 2: Product with Bonus
- 10% bonus discount
- IVA 13%
- Expected: IVA becomes factory assumed

#### Scenario 3: Product with Multiple Taxes
- IVA 13%
- ISC 5%
- Expected: ISC added to base, then IVA calculated

#### Scenario 4: IVACE Product
- IVACE 13%
- Factory charge
- Base amount: 1000
- Expected: Tax on base amount

#### Scenario 5: Export Product
- IVA 13%
- ISC 5%
- Customs part: 123456789012
- Expected: IVA on total amount

#### Scenario 6: Beverage with ISEBEC
- CABYS: 2202XXXXXXXX
- ISEBEC tax
- Expected: Special calculation

#### Scenario 7: Multiple Discounts
- 10% commercial
- 5% volume
- IVA 13%
- Expected: Both discounts, normal IVA

#### Scenario 8: Bonus + Multiple Taxes
- 10% bonus
- IVA 13%
- ISC 5%
- IPT tax
- Expected: All taxes factory assumed

---

### 18.9 Implementation Priority

**Phase 1: Core Calculations**
1. Basic tax calculation (IVA, IVACE, IVARBU)
2. Discount calculation
3. Subtotal and total calculation

**Phase 2: Special Taxes**
1. ISC, IUC, ISEBA calculations
2. ISEBEC, IPT, ISEC calculations
3. Base amount logic

**Phase 3: Factory Logic**
1. Factory assumed tax detection
2. Factory charge handling
3. Base amount editability

**Phase 4: Special Cases**
1. Bonus/gift discount logic
2. Export bill logic
3. CABYS-based calculations

**Phase 5: Validation**
1. Tax validation rules
2. Discount validation rules
3. Customs validation rules

---

## 17. Next Steps

1. **Review this plan** with the team
2. **Prioritize sections** based on business needs
3. **Create tickets** for each phase
4. **Set up development environment** with all three projects
5. **Begin Phase 1** implementation

---

## Appendix A: Field Mapping

### Dashboard  POS Mapping

| Dashboard Field | POS Field | Section | Notes |
|----------------|-----------|---------|-------|
| name | name | General Info | Required |
| description | description | General Info | Optional |
| categoryId | category_id | General Info | Required |
| unitId | unitId | General Info | Required |
| sku | sku | General Info | Optional |
| trackInventory | track_inventory | General Info | Switch |
| hasFiscalInfo | has_fiscal_info | General Info | Switch |
| hasPackageInfo | has_package_info | General Info | Switch |
| imageUrl | image_url | Image Upload | Optional |
| isPackaged | isPackaged | Packaging | Conditional |
| unitsPerBox | unitsPerBox | Packaging | Conditional |
| stockQuantity | stock_quantity | Inventory | Conditional |
| lowStockThreshold | low_stock_threshold | Inventory | Conditional |
| codes | codes | Codes | Array |
| cabys | cabys | Fiscal | Conditional |
| cabysDescription | cabysDescription | Fiscal | Conditional |
| productTypeId | productTypeId | Fiscal | Conditional |
| taxes | taxes | Fiscal/Other Taxes | Array |
| discounts | discounts | Discounts | Array |
| customsPart | customsPart | Customs | Optional |
| price | price | Commercial Value | Required |
| baseAmount | baseAmount | Commercial Value | Conditional |

---

## Appendix B: Tax Type Codes Reference

| Code | Name | Category | Special Fields |
|------|------|----------|----------------|
| 01 | IVA | IVA | taxRateId |
| 07 | IVACE | IVA | taxRateId, baseAmount |
| 08 | IVARBU | IVA | taxFactorId |
| 02 | Selective Consumption | Other | percentage |
| 03 | Unique Social Contribution | Other | percentage |
| 04 | Specific Consumption | Other | taxAmountId, quantity |
| 05 | Fuels | Other | taxAmountId, volumeConsumption |
| 06 | Tobacco | Other | percentage |
| 99 | Other | Other | percentage |

---

## Appendix C: Discount Type Codes Reference

| Code | Name | Application |
|------|------|-------------|
| 01 | Commercial Discount | Percentage |
| 02 | Volume Discount | Percentage |
| 03 | Promotional Discount | Percentage |
| 04 | Special Discount | Percentage |
| 05 | Early Payment | Percentage |
| 99 | Other | Percentage |

---

**Document Version:** 2.0  
**Last Updated:** May 7, 2026  
**Author:** Development Team  
**Status:** Ready for Implementation

---

## Summary of Key Changes from Version 1.0

### New in Version 2.0:

1. **SectionWrapper as Common Component**
   - Moved from product-specific to common components
   - Can be reused across all forms (products, branches, customers, invoices)
   - Enhanced with loading and error states

2. **Complete JCampos-Biller Calculation Migration**
   - Detailed tax calculation formulas for ALL tax types
   - Factory assumed tax logic fully documented
   - Base amount calculation rules
   - Tax processing order (critical for accuracy)

3. **Special Business Logic Cases**
   - Bonus & gift discount behavior
   - Document type special cases (export bills, purchase invoices)
   - Factory tax charge logic
   - CABYS-based tax calculations
   - Edge cases and testing scenarios

4. **Tax Configuration System**
   - New `taxTypeConfig.ts` for tax behavior definitions
   - Centralized tax rules management

5. **Comprehensive Validation Rules**
   - Tax validation (IVA limits, required fields)
   - Discount validation (percentage limits, uniqueness)
   - Customs validation (export bills, digit requirements)

6. **Testing Scenarios**
   - 8 detailed test scenarios covering all edge cases
   - Expected results for each scenario

### Critical Implementation Notes:

⚠️ **Tax Processing Order is CRITICAL** - Must process special taxes first, then other taxes, then IVA taxes last

⚠️ **Bonus/Gift Discounts Change Everything** - All taxes become factory assumed when discount types 01 or 03 are present

⚠️ **Base Amount is Dynamic** - Increases as special taxes are added (if `forBaseAmount = true`)

⚠️ **CABYS Code Matters** - Different calculations for beverages (2202) vs other products

⚠️ **Document Type Affects Calculations** - Export bills and purchase invoices have special rules

---

## Quick Reference: Tax Type Codes

| Code | Name | Category | Base Amount | Factory Tax | Special Fields |
|------|------|----------|-------------|-------------|----------------|
| 01 | IVA | IVA | No | No | taxRateId |
| 07 | IVACE | IVA | No | No | taxRateId, baseAmount |
| 08 | IVARBU | IVA | No | No | taxFactorId |
| 02 | ISC | Other | Yes | Yes | percentage |
| 03 | IUC | Other | Yes | Yes | taxAmountId, quantity |
| 04 | ISEBA | Other | Yes | Yes | taxAmountId, quantity, percentage |
| 05 | ISEBEC | Other | Yes | Yes | taxAmountId, quantity, volumeConsumption |
| 06 | IPT | Other | Yes | Yes | taxAmountId, quantity |
| 12 | ISEC | Other | No | Yes | Fixed 5% |
| 99 | OTHERS | Other | Yes | No | percentage |

---

## Implementation Checklist

### Foundation
 Create `SectionWrapper` in `src/components/common/`
 Create `taxTypeConfig.ts` with all tax configurations
 Migrate `TaxCalculationService` completely
 Add all missing data API hooks
 Update form state structure

### Sections (In Order)
 GeneralInfoSection (required first)
 ImageUploadSection
 PackagingSection (conditional)
 InventorySection (conditional)
 CodesSection (optional)
 FiscalInformationSection (optional)
 IvaTaxSection (conditional on CABYS)
 OtherTaxSection (conditional on CABYS)
 DiscountsSection (optional)
 CustomsSection (optional)
 CommercialValueSection (required)

### Calculations
 Basic calculations (subtotal, discounts)
 IVA tax calculations (01, 07, 08)
 Special tax calculations (02-06, 12)
 Other tax calculations (99)
 Factory assumed tax logic
 Base amount dynamic calculation
 Bonus/gift discount detection
 Document type handling

### Validation
 Field validation (required, format)
 Tax validation (limits, requirements)
 Discount validation (percentage, uniqueness)
 Customs validation (export bills)
 Business logic validation

### Testing
 Unit tests for each tax type
 Integration tests for combinations
 Edge case tests (8 scenarios)
 Performance tests
 User acceptance tests

---

## Contact & Support

For questions or clarifications on this implementation plan:
- Review JCampos-Biller source code: `E:\dev\JCampos-Biller\client\src`
- Review Dashboard source code: `E:\dev\BeautyMarket\dashboard\src`
- Consult `LineDetailModal.tsx` for complete calculation examples
- Consult `TaxCalculationService.ts` for exact formulas

**Good luck with the implementation! 🚀**
