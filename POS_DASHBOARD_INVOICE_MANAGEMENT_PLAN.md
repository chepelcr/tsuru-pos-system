# POS Dashboard Invoice Management Plan

## Executive Summary

This document outlines the comprehensive mapping of JCampos-Biller invoice management features to the POS Dashboard system. The goal is to transform the current simple sale process into a complete invoice management system with document creation, viewing, filtering, and payment processing capabilities.

**Current State:** Basic POS sale flow with sidebar cart and simple payment
**Target State:** Full invoice management system with document tabs, multiple document types, filters, and modal-based payment flow

---

## 1. Architecture Overview

### 1.1 Current POS Implementation

**File:** E:\dev\BeautyMarket\templates\pos-system\src\pages\dashboard\POSIntegratedPage.tsx

**Current Features:**
- Tab-based navigation (Products, Cart, Clients)
- Sidebar cart with product list
- Simple payment section in sidebar
- Basic payment methods (cash, card, SINPE)
- Client selection from search

**Limitations:**
- No document management (view past invoices)
- No document type selection (only sales)
- No document filters or search
- No document actions (PDF, download, validate)
- Payment in sidebar (not modal)
- No tabs for general data and other sections
- No complete invoice request/response mapping

---

### 1.2 Target JCampos-Biller Implementation

**File:** E:\dev\JCampos-Biller\client\src\pages\Invoices.tsx

**Target Features:**
- View mode toggle (Tabs vs List)
- Document creation dropdown with multiple types
- Issued vs Received documents toggle
- Document list with filters and pagination
- Document tabs for multiple open documents
- Modal-based payment flow
- Complete invoice request/response structures

---

## 2. Page Structure Transformation

### 2.1 New Page Layout

**Transform:** POSIntegratedPage.tsx  POSInvoiceManagementPage.tsx

**New Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│ Header Bar                                                   │
│ - Title: "Punto de venta"                                   │
│ - Branch & Terminal info                                    │
│ - User info & Sync status                                   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ Action Bar                                                   │
│ - [Create Document Dropdown] [List View Button]             │
│ - View Mode Toggle (Tabs / List)                           │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ Content Area (Dynamic based on view mode)                   │
│                                                              │
│ TABS MODE:                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Document Tabs (Multiple open documents)                 │ │
│ │ [Tab 1] [Tab 2] [Tab 3] ...                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Invoice Form (Active tab content)                       │ │
│ │ - General data section                                  │ │
│ │ - Product lines section                                 │ │
│ │ - Totals section                                        │ │
│ │ - [Finalize Document] button                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ LIST MODE:                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Issued] [Received] Toggle                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Search & Filters                                        │ │
│ │ [Search box] [Complex Search Modal]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Document List                                           │ │
│ │ - Document cards with actions                           │ │
│ │ - Pagination                                            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Document Creation Flow

### 3.1 Document Creation Dropdown

**Component:** DocumentCreationDropdown.tsx (NEW)

**Reference:** JCampos-Biller/client/src/components/invoices/DocumentCreationDropdown.tsx

**Features:**
- Dropdown button with "+" icon
- Hover to open (desktop) / Click to open (mobile)
- List of document types with icons and colors
- Upload document option

**Document Types:**
- 01: Factura Electrónica (Invoice) - Green
- 04: Tiquete Electrónico (Ticket) - Blue
- 03: Nota de Crédito (Credit Note) - Red
- 02: Nota de Débito (Debit Note) - Yellow
- 08: Factura de Compra (Purchase Invoice) - Purple
- 09: Factura de Exportación (Export Invoice) - Indigo

**Icon Mapping:**
```typescript
const iconMap: Record<string, any> = {
  "01": Receipt,      // Invoice
  "04": FileText,     // Ticket
  "03": CreditCard,   // Credit Note
  "02": Minus,        // Debit Note
  "08": ShoppingCart, // Purchase
  "09": Plane,        // Export
};
```

**Action:**
- Creates new document tab
- Opens invoice form with selected document type
- Switches to "Tabs" view mode

---

### 3.2 Document Tabs System

**Component:** DocumentTabs.tsx (NEW)

**Reference:** JCampos-Biller/client/src/components/invoices/DocumentTabs.tsx

**Features:**
- Multiple open documents (tabs)
- Active tab highlighting
- Close button (X) on each tab
- Dirty indicator (•) for unsaved changes
- Tab title shows document type
- Auto-save form data to store
- Redirect to list when no tabs open

**State Management:**
```typescript
interface DocumentTab {
  id: string;           // Unique tab ID
  type: 'new' | 'edit'; // Document mode
  title: string;        // Tab title
  data: any;           // Form data
  isDirty: boolean;    // Unsaved changes
}
```

**Store Actions:**
- `addDocumentTab(tab)` - Add new tab
- `removeDocumentTab(id)` - Close tab
- `setActiveDocumentTab(id)` - Switch tab
- `updateDocumentTab(id, data)` - Update tab data

---

## 4. Invoice Form Structure

### 4.1 Invoice Form Component

**Component:** InvoiceForm.tsx (ENHANCE)

**Reference:** JCampos-Biller/client/src/components/invoices/InvoiceForm.tsx

**Current:** Simple product list with basic fields
**Target:** Complete invoice form with all sections

**Form Sections:**

#### Section 1: Document Information Card
- Document type (auto-filled from tab)
- Sale condition (Contado, Crédito, etc.)
- Currency & exchange rate
- Economic activity selection
- Receiver information (with search button)
- References button
- Payment methods checkboxes

#### Section 2: Product Details Card
- Product search (barcode + button)
- Product line cards (grid layout)
- Each line shows:
  - Description (read-only)
  - Price & Quantity
  - Unit of measure
  - Line total
  - Detail button (%) - Opens LineDetailModal
  - Remove button (X)

#### Section 3: Totals Footer
- Neto (Net)
- Descuentos (Discounts)
- Subtotal
- I.V.A. (Tax)
- Total
- Observations field
- **[Finalize Document]** button

---

### 4.2 Form State Structure

**Enhanced Form State (snake_case throughout):**
```typescript
interface InvoiceFormData {
  // Document Info
  document_type: number;
  version_id: number;
  activity_code: string;
  sale_condition_id: number;
  credit_term: string;
  notes: string;
  
  // Receiver
  receiver: {
    identification: {
      number: string;
      type: number;
      code: string;
    };
    business_name: string;
    email: string;
    residence: {
      state_id?: number;
      county_id?: number;
      district_id?: number;
      address: string;
    };
  };
  
  // Details (Product Lines)
  details: Array<{
    product_id?: number;
    description: string;
    quantity: number;
    net_price: number;
    base_amount: number;
    unit_id?: number;
    commercial_unit_measure?: string;
    customs_part?: string;
    discounts: Array<{
      discount_type_id: number;
      reason?: string;
      percentage: number;
    }>;
    taxes: Array<{
      tax_type_id: number;
      tax_rate_id?: number;
      rate: number;
      special_fields?: any;
    }>;
  }>;
  
  // Payments (filled in close modal)
  payments: Array<{
    type: number;
    amount: number;
  }>;
  
  // References
  references: Array<{
    type: number;
    number: string;
    date: string;
    code: number;
    reason: string;
  }>;
  
  // Currency
  currency_code: {
    iso_code: string;
    exchange_rate: number;
  };
  
  // Branch & Terminal (from session context)
  branch_code: string;
  terminal_code: string;
  
  // Email copies
  copy_emails?: string[];
}
```

---

## 5. Payment Flow Transformation

### 5.1 Current Payment Flow (Sidebar)

**Location:** CartSidebar component
**Behavior:**
- Click "Pay" button
- Sidebar expands payment section
- Select payment method
- Enter cash/SINPE details
- Click "Confirm Payment"

**Issues:**
- Limited space in sidebar
- No branch/terminal selection
- No copy emails
- No multiple payment types
- Not aligned with JCampos-Biller pattern

---

### 5.2 Target Payment Flow (Modal)

**Component:** DocumentCloseModal.tsx (NEW)

**Reference:** JCampos-Biller/client/src/components/invoices/DocumentCloseModal.tsx

**Trigger:** Click "Finalize Document" button in invoice form

**Modal Structure:**

```
┌─────────────────────────────────────────────────────────┐
│ Finalizar documento                                  [X] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📧 Enviar copia de correo                           │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ [email input 1]                          [🗑️]   │ │ │
│ │ │ [email input 2]                          [🗑️]   │ │ │
│ │ │ [+ Agregar copia]                               │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ℹ️ Información de emisión                           │ │
│ │ ┌──────────────────┐  ┌──────────────────┐         │ │
│ │ │ Sucursal         │  │ Terminal         │         │ │
│ │ │ [Select Branch]  │  │ [Select Terminal]│         │ │
│ │ └──────────────────┘  └──────────────────┘         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💵 Información de pago                              │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ Total a pagar: ₡10,000.00                       │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │ ┌──────────────────┐  ┌──────────────────┐         │ │
│ │ │ Efectivo         │  │ Tarjeta          │         │ │
│ │ │ [Amount input]   │  │ [Amount input]   │         │ │
│ │ └──────────────────┘  └──────────────────┘         │ │
│ │ ┌──────────────────┐  ┌──────────────────┐         │ │
│ │ │ SINPE            │  │ Otro             │         │ │
│ │ │ [Amount input]   │  │ [Amount input]   │         │ │
│ │ └──────────────────┘  └──────────────────┘         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    [Cancelar]  [💾 Guardar documento]   │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Copy emails (multiple, add/remove)
- Branch selection (dropdown)
- Terminal selection (filtered by branch)
- Payment type inputs (Efectivo, Tarjeta, SINPE, Otro)
- Total amount display
- Validation (branch + terminal required)

**Data Collected:**
```typescript
interface CloseModalData {
  copy_emails: string[];
  payments: Array<{
    type: number;
    amount: number;
  }>;
}
```

**Note:** `branch_code` and `terminal_code` are already handled in SessionSetupScreen and stored in session context, so they don't need to be in the close modal.

---

## 6. Document List View

### 6.1 Issued vs Received Toggle

**Component:** IssuedDocumentsList.tsx & ReceivedDocumentsList.tsx (NEW)

**Reference:** 
- JCampos-Biller/client/src/components/invoices/IssuedDocumentsList.tsx
- JCampos-Biller/client/src/components/invoices/ReceivedDocumentsList.tsx

**Features:**
- Toggle buttons: [Issued] [Received]
- Separate lists with different actions
- Shared search and filter functionality
- Independent pagination state

---

### 6.2 Document List Features

**Search & Filters:**
- Simple search box (by consecutive number)
- Complex search modal with:
  - Report type filter
  - Date range (start/end)
  - Document type filter (multiple selection)
  - Status filter

**Document Card Structure:**
```typescript
interface DocumentCard {
  // Header
  consecutive_number: string;
  sale_date: string;
  status_badge: 'validated' | 'rejected' | 'pending';
  status_icon: CheckCircle | XCircle | AlertCircle;
  
  // Body
  date: string;
  total: number;
  
  // Actions (Desktop)
  actions: [
    'View PDF',
    'Download',
    'Validation Info',  // If validated or rejected
    'Resend Email',     // If validated (issued only)
    'Accept/Reject'     // If validated (received only)
  ];
  
  // Selection
  checkbox: boolean;
}
```

**Bulk Actions:**
- Select all checkbox
- Selected count display
- Bulk operations (future: bulk download, bulk email)

**Pagination:**
- Current page indicator
- Total pages
- Total elements
- Page size (10 per page)
- Previous/Next buttons
- Page number buttons

---

### 6.3 Document Actions

**View PDF:**
- Opens DocumentModal with PDF viewer
- Use `pdf_url` field from sale response (no need to construct URL)
- Display PDF in iframe or new tab

**Download:**
- Opens DocumentModal with download options
- Use `pdf_url`, `xml_url`, `json_url` fields from sale response
- Formats: PDF, XML, JSON
- Direct download links (no additional API calls needed)

**Validation Info:**
- Opens DocumentModal with validation details
- Shows Hacienda response
- Shows validation status
- Shows error messages (if rejected)

**Resend Email:**
- Opens DocumentModal with email form
- Pre-filled with receiver email
- Option to add CC emails
- Sends document via email

**Accept/Reject (Received only):**
- Opens DocumentModal with accept/reject form
- Message field (required for reject)
- Sends response to Hacienda

---

## 7. Line Detail Modal (CRITICAL)

### 7.1 LineDetailModal Component

**Component:** LineDetailModal.tsx (ENHANCE)

**Reference:** JCampos-Biller/client/src/components/invoices/LineDetailModal.tsx

**Current:** Basic modal with limited fields
**Target:** Complete line detail editor with ALL JCampos-Biller functionality

**Modal Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│ Detalle de línea #1                                      [X] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [General] [Impuestos] [Descuentos] [Otros]  <-- TABS       │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ GENERAL TAB                                              ││
│ │                                                          ││
│ │ Descripción del producto *                              ││
│ │ [Text input - required]                                 ││
│ │                                                          ││
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    ││
│ │ │ Cantidad *   │ │ Precio *     │ │ Unidad *     │    ││
│ │ │ [Number]     │ │ [Number]     │ │ [Select]     │    ││
│ │ └──────────────┘ └──────────────┘ └──────────────┘    ││
│ │                                                          ││
│ │ ┌──────────────┐ ┌──────────────┐                      ││
│ │ │ Unidad Com.  │ │ Parte Aduana │                      ││
│ │ │ [Text]       │ │ [Text-12dig] │                      ││
│ │ └──────────────┘ └──────────────┘                      ││
│ │                                                          ││
│ │ Monto base (para IVACE)                                 ││
│ │ [Number input - editable if IVACE or factory tax]       ││
│ │                                                          ││
│ │ Subtotal línea: ₡10,000.00                              ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ IMPUESTOS TAB                                            ││
│ │                                                          ││
│ │ ┌────────────────────────────────────────────────────┐  ││
│ │ │ Impuesto IVA (Requerido)                           │  ││
│ │ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│  ││
│ │ │ │ Tipo IVA *   │ │ Tarifa *     │ │ Factor       ││  ││
│ │ │ │ [Select]     │ │ [Select]     │ │ [Select]     ││  ││
│ │ │ │ 01,07,08     │ │ 13%, 4%, etc │ │ (IVARBU)     ││  ││
│ │ │ └──────────────┘ └──────────────┘ └──────────────┘│  ││
│ │ │ Monto: ₡1,300.00                                   │  ││
│ │ └────────────────────────────────────────────────────┘  ││
│ │                                                          ││
│ │ Otros Impuestos                                          ││
│ │ [+ Agregar impuesto]                                     ││
│ │                                                          ││
│ │ ┌────────────────────────────────────────────────────┐  ││
│ │ │ ISC (02) - 5%                              [🗑️]    │  ││
│ │ │ Monto: ₡500.00                                     │  ││
│ │ └────────────────────────────────────────────────────┘  ││
│ │                                                          ││
│ │ ┌────────────────────────────────────────────────────┐  ││
│ │ │ ISEBA (03) - Bebidas                       [🗑️]    │  ││
│ │ │ ┌──────────────┐ ┌──────────────┐                 │  ││
│ │ │ │ Cantidad     │ │ Porcentaje   │                 │  ││
│ │ │ │ [Number]     │ │ [Number]     │                 │  ││
│ │ │ └──────────────┘ └──────────────┘                 │  ││
│ │ │ Monto: ₡200.00                                     │  ││
│ │ └────────────────────────────────────────────────────┘  ││
│ │                                                          ││
│ │ Impuesto asumido por fábrica: ₡0.00                     ││
│ │ Total impuestos: ₡2,000.00                              ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ DESCUENTOS TAB                                           ││
│ │                                                          ││
│ │ [+ Agregar descuento]                                    ││
│ │                                                          ││
│ │ ┌────────────────────────────────────────────────────┐  ││
│ │ │ Descuento Comercial (01)                   [🗑️]    │  ││
│ │ │ ┌──────────────┐ ┌──────────────┐                 │  ││
│ │ │ │ Porcentaje * │ │ Razón        │                 │  ││
│ │ │ │ [Number]     │ │ [Text]       │                 │  ││
│ │ │ └──────────────┘ └──────────────┘                 │  ││
│ │ │ Monto: ₡1,000.00                                   │  ││
│ │ └────────────────────────────────────────────────────┘  ││
│ │                                                          ││
│ │ Total descuentos: ₡1,000.00                             ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ OTROS TAB                                                ││
│ │                                                          ││
│ │ Cargo por fábrica                                        ││
│ │ [Select factory charge type]                             ││
│ │                                                          ││
│ │ Notas adicionales                                        ││
│ │ [Textarea]                                               ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Total línea: ₡11,000.00                                     │
│                                                              │
│                    [Eliminar línea]  [💾 Guardar]           │
└─────────────────────────────────────────────────────────────┘
```

---

### 7.2 Line Detail Tabs

#### Tab 1: General
**Fields:**
- `description` * (required, text)
- `quantity` * (required, number, min: 0.01)
- `net_price` * (required, number, min: 0)
- `unit_id` * (required, select from measurement units)
- `commercial_unit_measure` (optional, text)
- `customs_part` (optional, 12 digits, required for export bills)
- `base_amount` (number, editable if IVACE or factory tax)
- Subtotal display (calculated)

#### Tab 2: Impuestos (Taxes)
**IVA Tax Section (Required):**
- `tax_type_id` * (select: 01-IVA, 07-IVACE, 08-IVARBU)
- `tax_rate_id` * (select from available rates)
- `tax_factor_id` (select, only for IVARBU)
- Tax amount display (calculated)

**Other Taxes Section (Optional):**
- Add/Remove tax buttons
- Each tax shows:
  - Tax type badge with code
  - Rate or special fields (depends on tax type)
  - Calculated amount
  - Remove button

**Tax Types with Special Fields:**
- **02 (ISC):** No special fields, uses rate
- **03 (IUC):** `quantity` field
- **04 (ISEBA):** `quantity` and `percentage` fields
- **05 (ISEBEC):** `quantity` and `volume_consumption` fields
- **06 (IPT):** `quantity` field
- **12 (ISEC):** No special fields, fixed 5%
- **99 (OTHERS):** `rate` field

**Displays:**
- Factory assumed tax amount
- Total taxes amount

#### Tab 3: Descuentos (Discounts)
**Features:**
- Add/Remove discount buttons
- Each discount shows:
  - Discount type selection
  - Percentage input *
  - Reason input (optional, required for "Other")
  - Calculated amount
  - Remove button

**Discount Types:**
- 01: Descuento Comercial (Commercial)
- 02: Descuento por Volumen (Volume)
- 03: Bonificación (Bonus/Gift) ⚠️ Special tax behavior
- 04: Descuento por Pronto Pago (Early Payment)
- 99: Otro (Other) - requires reason

**Display:**
- Total discounts amount

#### Tab 4: Otros (Other)
**Fields:**
- `factory_tax_charge_id` (select from factory charges)
- Additional notes (textarea)

---

### 7.3 Line Detail Calculations

**Real-time Calculation Flow:**

1. **Base Calculation:**
   ```typescript
   subtotal = quantity * net_price
   ```

2. **Apply Discounts:**
   ```typescript
   discount_amount = subtotal * (total_discount_percentage / 100)
   subtotal_after_discount = subtotal - discount_amount
   ```

3. **Calculate Special Taxes:** (ISC, IUC, ISEBA, ISEBEC, IPT, ISEC)
   - Use tax calculation service
   - Add to base amount if `for_base_amount = true`
   - Check factory assumed conditions

4. **Calculate Other Taxes (99):**
   - Calculate on current base amount
   - Check factory assumed conditions

5. **Calculate IVA Taxes:** (01, 07, 08)
   - Use final base amount or total amount (if bonus/gift)
   - Check factory assumed conditions

6. **Calculate Line Total:**
   ```typescript
   line_total = subtotal_after_discount + total_taxes - factory_assumed_tax
   ```

**Validation Rules:**
- Description required
- Quantity > 0
- Net price >= 0
- Unit required
- At least one IVA tax required
- Only one IVA tax allowed
- Customs part required for export bills (12 digits)
- Base amount editable only if IVACE or factory tax
- Discount percentages sum <= 100%

---

## 8. Invoice Request/Response Structures

### 8.1 Invoice Request DTO

**Endpoint:** `POST /api/organizations/{organization_id}/sales`

**Complete Request Structure:**
```typescript
interface InvoiceRequest {
  // Document metadata
  document_type_id: number;
  version_id: number;
  activity_code: string;
  sale_condition_id: number;
  credit_term?: string;
  notes?: string;
  
  // Branch & Terminal (from session)
  branch_code: string;
  terminal_code: string;
  
  // Receiver
  receiver: {
    identification: {
      number: string;
      type: number;
      code: string;
    };
    nationality?: string;
    business_name: string;
    trade_name?: string;
    email?: string;
    residence?: {
      state_id?: number;
      county_id?: number;
      district_id?: number;
      address?: string;
    };
    personal_phone?: {
      country_code: string;
      number: string;
    };
    business_phone?: {
      country_code: string;
      number: string;
    };
    fax?: {
      country_code: string;
      number: string;
    };
    fiscal_record_8707?: string;
    taxpayer_id?: string;
    customer_type?: number;
    economic_activity?: string;
  };
  
  // Details (Product lines)
  details: Array<{
    line_number: number;
    product_id?: number;
    description: string;
    quantity: number;
    net_price: number;
    base_amount?: number;
    unit_id: number;
    commercial_unit_measure?: string;
    customs_part?: string;
    
    // Discounts
    discounts: Array<{
      discount_type_id: number;
      reason?: string;
      percentage: number;
      amount: number;
    }>;
    
    // Taxes
    taxes: Array<{
      tax_type_id: number;
      tax_rate_id?: number;
      tax_factor_id?: number;
      rate: number;
      amount: number;
      special_fields?: {
        quantity?: number;
        percentage?: number;
        volume_consumption?: number;
      };
    }>;
    
    // Factory charge
    factory_tax_charge_id?: number;
    
    // Line totals
    discount_amount: number;
    tax_amount: number;
    factory_assumed_tax: number;
    line_total: number;
  }>;
  
  // Payments
  payments: Array<{
    payment_type_id: number;
    amount: number;
  }>;
  
  // References
  references?: Array<{
    reference_type_id: number;
    document_number: string;
    reference_date: string;
    reference_code: number;
    reason?: string;
  }>;
  
  // Currency
  currency_code: {
    iso_code: string;
    exchange_rate: number;
  };
  
  // Email copies
  copy_emails?: string[];
  
  // Totals (calculated)
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
}
```

---

### 8.2 Invoice Response DTO

**Complete Response Structure:**
```typescript
interface InvoiceResponse {
  // Document identification
  document_id: number;
  document_key: string;
  consecutive_number: string;
  
  // Document metadata
  document_type: {
    document_type_id: number;
    code: string;
    description: string;
  };
  
  // Dates
  sale_date: string;
  created_at: string;
  updated_at: string;
  
  // Receiver
  receiver: {
    identification: {
      number: string;
      type: number;
      code: string;
    };
    business_name: string;
    email?: string;
  };
  
  // Summary
  summary: {
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    voucher_total: number;
  };
  
  // Validation status
  atv_validation: {
    validation_status: number; // 1=Validated, 2=Pending, 3=Rejected
    validation_message?: string;
    validation_date?: string;
  };
  
  // Receiver validation (for received documents)
  receiver_validation?: {
    status: number; // 1=Accepted, 2=Partial, 3=Rejected
    message?: string;
    validation_date?: string;
  };
  
  // Document files (URLs for direct download/viewing)
  document_route: string;      // S3 path prefix
  document_name: string;        // Base filename without extension
  pdf_url: string;              // Full URL to PDF file (use for viewing/downloading)
  xml_url: string;              // Full URL to XML file (use for downloading)
  json_url: string;             // Full URL to JSON file (use for downloading)
  
  // Details
  details: Array<{
    line_number: number;
    description: string;
    quantity: number;
    net_price: number;
    unit: {
      unit_id: number;
      code: string;
      description: string;
    };
    discounts: Array<{
      discount_type: {
        discount_type_id: number;
        description: string;
      };
      percentage: number;
      amount: number;
    }>;
    taxes: Array<{
      tax_type: {
        tax_type_id: number;
        code: string;
        description: string;
      };
      rate: number;
      amount: number;
    }>;
    line_total: number;
  }>;
  
  // Payments
  payments: Array<{
    payment_type: {
      payment_type_id: number;
      description: string;
    };
    amount: number;
  }>;
  
  // References
  references?: Array<{
    reference_type: {
      reference_type_id: number;
      description: string;
    };
    document_number: string;
    reference_date: string;
  }>;
}
```

---

## 9. Cross-App-BE Backend Verification

### 9.1 Required Endpoints

**IMPORTANT:** Use existing sales domain pattern: `/api/organizations/{organization_id}/sales/*`

**Frontend uses snake_case throughout - NO camelCase conversion needed!**

**Endpoints to implement/enhance:**

```
POST   /api/organizations/{organization_id}/sales                     - Create sale/invoice (ENHANCE EXISTING)
GET    /api/organizations/{organization_id}/sales                     - List sales/invoices (ENHANCE EXISTING)
GET    /api/organizations/{organization_id}/sales/{sale_id}            - Get sale/invoice details (EXISTING)
PUT    /api/organizations/{organization_id}/sales/{sale_id}            - Update sale/invoice (ADD)
DELETE /api/organizations/{organization_id}/sales/{sale_id}            - Delete sale/invoice (draft only) (ADD)
POST   /api/organizations/{organization_id}/sales/{sale_id}/validate   - Validate with Hacienda (ADD)
POST   /api/organizations/{organization_id}/sales/{sale_id}/resend     - Resend email (ADD)
POST   /api/organizations/{organization_id}/sales/{sale_id}/accept     - Accept received invoice (ADD)
POST   /api/organizations/{organization_id}/sales/{sale_id}/reject     - Reject received invoice (ADD)
```

**Note:** PDF and XML URLs are returned in the sale response object (pdf_url, xml_url fields), not as separate endpoints.

**Query Parameters for GET /api/organizations/{organization_id}/sales:**
```
?document_types={01,04,08}             - Filter by document types (comma-separated)
&issued={true|false}                   - Filter issued vs received documents (omit for all)
&search={JSON}                         - Complex search object (URL-encoded JSON)
&page={number}                         - Page number (0-indexed)
&size={number}                         - Page size (default: 10, max: 250)
```

**Search Parameter Structure (JSON object):**
```json
{
  "searchTerm": "string",              // Search by consecutive number, receiver name, etc.
  "status": "validated|pending|rejected",  // Filter by validation status
  "start_date": "ISO-8601",            // Filter by date range start
  "end_date": "ISO-8601",              // Filter by date range end
  "sort": "field,direction"            // Sort field and direction (e.g., "sale_date,desc")
}
```

**Example Request:**
```
GET /api/organizations/{org_id}/sales?document_types=01,04&issued=true&search=%7B%22status%22%3A%22validated%22%2C%22start_date%22%3A%222024-01-01%22%2C%22sort%22%3A%22sale_date%2Cdesc%22%7D&page=0&size=20
```

**Note:** 
- Only `document_types` and `issued` are separate query parameters
- All other filters (dates, status, sort, searchTerm) go inside the `search` JSON parameter
- Follow the same search pattern as other endpoints in cross-app-be
- If `issued` is not provided (neither true nor false), return all documents (both issued and received)

---

### 9.2 Required Data API Endpoints

**IMPORTANT:** 
- Use existing sales domain pattern: `/api/organizations/{organization_id}/sales/*`
- Frontend uses **snake_case** throughout - NO camelCase conversion needed
- Enhance existing POST and GET endpoints
- Add new endpoints for: update, delete, validate, resend, accept, reject
- PDF and XML URLs are returned in the sale response object (pdf_url, xml_url fields)
- **Query parameters:** Only `document_types` and `issued` are separate query params
- **Search parameter:** dates, status, sort, searchTerm go inside `search` JSON object
- If `issued` is not provided, return all documents (both issued and received)

```
GET    /api/data/document-types         - Document types
GET    /api/data/sale-conditions        - Sale conditions
GET    /api/data/payment-types          - Payment types
GET    /api/data/measurement-units      - Measurement units
GET    /api/data/tax-types              - Tax types
GET    /api/data/tax-rates              - Tax rates
GET    /api/data/tax-factors            - Tax factors (for IVARBU)
GET    /api/data/discount-types         - Discount types
GET    /api/data/factory-charges        - Factory charge types
GET    /api/data/reference-types        - Reference types
GET    /api/data/identification-types   - Identification types
```

---

### 9.3 DTO Verification Checklist

 Verify InvoiceRequest DTO matches frontend structure
 Verify InvoiceResponse DTO matches frontend structure
 Verify all snake_case fields are correct
 Verify nested objects structure
 Verify array structures
 Verify optional vs required fields
 Verify data types (number, string, boolean)
 Verify date formats (ISO 8601)
 Verify currency formats
 Verify tax calculation fields
 Verify discount calculation fields
 Verify payment structure
 Verify reference structure

---

## 10. Component Files to Create/Modify

### 10.1 New Components

```
src/pages/dashboard/
  POSInvoiceManagementPage.tsx          ⭐ NEW - Main page

src/components/invoices/
  DocumentCreationDropdown.tsx           ⭐ NEW - Create document dropdown
  DocumentTabs.tsx                       ⭐ NEW - Tab management
  InvoiceForm.tsx                        🔧 ENHANCE - Complete form
  DocumentCloseModal.tsx                 ⭐ NEW - Payment modal
  LineDetailModal.tsx                    🔧 ENHANCE - Complete line editor
  IssuedDocumentsList.tsx                ⭐ NEW - Issued documents
  ReceivedDocumentsList.tsx              ⭐ NEW - Received documents
  DocumentCard.tsx                       ⭐ NEW - Document card component
  DocumentModal.tsx                      ⭐ NEW - PDF/validation/actions modal
  ComplexSearchModal.tsx                 ⭐ NEW - Advanced search
  ProductSearch.tsx                      🔧 ENHANCE - Product search
  CustomerSearch.tsx                     🔧 ENHANCE - Customer search
  ReceiverModal.tsx                      ⭐ NEW - Receiver editor
  ReferencesModal.tsx                    ⭐ NEW - References editor

src/components/invoices/line-detail/
  GeneralTab.tsx                         ⭐ NEW - General fields
  TaxesTab.tsx                           ⭐ NEW - Tax management
  DiscountsTab.tsx                       ⭐ NEW - Discount management
  OtherTab.tsx                           ⭐ NEW - Other fields
  IvaTaxSection.tsx                      ⭐ NEW - IVA tax section
  OtherTaxSection.tsx                    ⭐ NEW - Other taxes section
```

---

### 10.2 Modified Components

```
src/pages/dashboard/
  POSIntegratedPage.tsx                  🔧 MODIFY - Add view mode toggle

src/hooks/
  useInvoices.ts                         ⭐ NEW - Invoice CRUD hooks
  useDocuments.ts                        ⭐ NEW - Document list hooks
  useDataApi.ts                          🔧 ENHANCE - Add missing endpoints

src/services/
  taxCalculationService.ts               🔧 ENHANCE - Complete calculations
  invoiceService.ts                      ⭐ NEW - Invoice API calls

src/types/
  invoice.ts                             ⭐ NEW - Invoice types
  document.ts                            ⭐ NEW - Document types
  lineDetail.ts                          ⭐ NEW - Line detail types

src/store/
  documentStore.ts                       ⭐ NEW - Document tabs state
```

---

## 11. State Management

### 11.1 Document Store (Zustand)

```typescript
interface DocumentStore {
  // Tabs
  open_documents: DocumentTab[];
  active_document_tab: string | null;
  
  // Actions
  addDocumentTab: (tab: DocumentTab) => void;
  removeDocumentTab: (id: string) => void;
  setActiveDocumentTab: (id: string) => void;
  updateDocumentTab: (id: string, data: Partial<DocumentTab>) => void;
  closeAllTabs: () => void;
  
  // View mode
  view_mode: 'tabs' | 'list';
  setViewMode: (mode: 'tabs' | 'list') => void;
  
  // List filters
  show_received: boolean;
  setShowReceived: (show: boolean) => void;
}
```

---

### 11.2 Session Context (Existing)

```typescript
interface SessionContext {
  branch_code: string;
  terminal_code: string;
  branch_name: string;
  terminal_name: string;
  // ... other session data
}
```

---

## 12. Migration Strategy

### Phase 1: Foundation (Week 1)
1. Create document store
2. Create POSInvoiceManagementPage skeleton
3. Add view mode toggle
4. Create DocumentCreationDropdown
5. Create DocumentTabs component

### Phase 2: Invoice Form (Week 2)
1. Enhance InvoiceForm with complete structure
2. Create DocumentCloseModal
3. Integrate with session context
4. Add form validation
5. Test invoice creation flow

### Phase 3: Line Detail Editor (Week 3)
1. Create LineDetailModal with tabs
2. Implement GeneralTab
3. Implement TaxesTab with all tax types
4. Implement DiscountsTab
5. Implement OtherTab
6. Integrate tax calculation service
7. Test all calculation scenarios

### Phase 4: Document List (Week 4)
1. Create IssuedDocumentsList
2. Create ReceivedDocumentsList
3. Create DocumentCard component
4. Implement search and filters
5. Implement pagination
6. Create ComplexSearchModal

### Phase 5: Document Actions (Week 5)
1. Create DocumentModal
2.data/tax-factors - Tax factors (for IVARBU) GET /api/data/discount-types - Discount types GET /api/data/factory-charges - Factory charge types GET /api/data/reference-types - Reference types GET /api/data/identification-types - Identification types


### 9.3 DTO Verification Checklist

 Verify InvoiceRequest DTO matches frontend structure
 Verify InvoiceResponse DTO matches frontend structure
 Verify all snake_case fields are correct
 Verify nested objects structure
 Verify array structures
 Verify optional vs required fields
 Verify data types (number, string, boolean)
 Verify date formats (ISO 8601)
 Verify currency formats
 Verify tax calculation fields
 Verify discount calculation fields
 Verify payment structure
 Verify reference structure

---

## 10. Component Files to Create/Modify

### 10.1 New Components

src/pages/dashboard/ POSInvoiceManagementPage.tsx ⭐ NEW - Main page

src/components/invoices/ DocumentCreationDropdown.tsx ⭐ NEW - Create document dropdown DocumentTabs.tsx ⭐ NEW - Tab management InvoiceForm.tsx 🔧 ENHANCE - Complete form DocumentCloseModal.tsx ⭐ NEW - Payment modal LineDetailModal.tsx 🔧 ENHANCE - Complete line editor IssuedDocumentsList.tsx ⭐ NEW - Issued documents ReceivedDocumentsList.tsx ⭐ NEW - Received documents DocumentCard.tsx ⭐ NEW - Document card component DocumentModal.tsx ⭐ NEW - PDF/validation/actions modal ComplexSearchModal.tsx ⭐ NEW - Advanced search ProductSearch.tsx 🔧 ENHANCE - Product search CustomerSearch.tsx 🔧 ENHANCE - Customer search ReceiverModal.tsx ⭐ NEW - Receiver editor ReferencesModal.tsx ⭐ NEW - References editor

src/components/invoices/line-detail/ GeneralTab.tsx ⭐ NEW - General fields TaxesTab.tsx ⭐ NEW - Tax management DiscountsTab.tsx ⭐ NEW - Discount management OtherTab.tsx ⭐ NEW - Other fields IvaTaxSection.tsx ⭐ NEW - IVA tax section OtherTaxSection.tsx ⭐ NEW - Other taxes section


### 10.2 Modified Components

src/pages/dashboard/ POSIntegratedPage.tsx 🔧 MODIFY - Add view mode toggle

src/hooks/ useInvoices.ts ⭐ NEW - Invoice CRUD hooks useDocuments.ts ⭐ NEW - Document list hooks useDataApi.ts 🔧 ENHANCE - Add missing endpoints

src/services/ taxCalculationService.ts 🔧 ENHANCE - Complete calculations invoiceService.ts ⭐ NEW - Invoice API calls

src/types/ invoice.ts ⭐ NEW - Invoice types document.ts ⭐ NEW - Document types lineDetail.ts ⭐ NEW - Line detail types

src/store/ documentStore.ts ⭐ NEW - Document tabs state


---

## 11. State Management

### 11.1 Document Store (Zustand)

```typescript
interface DocumentStore {
  // Tabs
  open_documents: DocumentTab[];
  active_document_tab: string | null;
  
  // Actions
  addDocumentTab: (tab: DocumentTab) => void;
  removeDocumentTab: (id: string) => void;
  setActiveDocumentTab: (id: string) => void;
  updateDocumentTab: (id: string, data: Partial<DocumentTab>) => void;
  closeAllTabs: () => void;
  
  // View mode
  view_mode: 'tabs' | 'list';
  setViewMode: (mode: 'tabs' | 'list') => void;
  
  // List filters
  show_received: boolean;
  setShowReceived: (show: boolean) => void;
}
```

---

### 11.2 Session Context (Existing)

```typescript
interface SessionContext {
  branch_code: string;
  terminal_code: string;
  branch_name: string;
  terminal_name: string;
  // ... other session data
}
```

---

## 12. Migration Strategy

### Phase 1: Foundation (Week 1)
1. Create document store
2. Create POSInvoiceManagementPage skeleton
3. Add view mode toggle
4. Create DocumentCreationDropdown
5. Create DocumentTabs component

### Phase 2: Invoice Form (Week 2)
1. Enhance InvoiceForm with complete structure
2. Create DocumentCloseModal
3. Integrate with session context
4. Add form validation
5. Test invoice creation flow

### Phase 3: Line Detail Editor (Week 3)
1. Create LineDetailModal with tabs
2. Implement GeneralTab
3. Implement TaxesTab with all tax types
4. Implement DiscountsTab
5. Implement OtherTab
6. Integrate tax calculation service
7. Test all calculation scenarios

### Phase 4: Document List (Week 4)
1. Create IssuedDocumentsList
2. Create ReceivedDocumentsList
3. Create DocumentCard component
4. Implement search and filters
5. Implement pagination
6. Create ComplexSearchModal

### Phase 5: Document Actions (Week 5)
1. Create DocumentModal
2. Implement PDF viewer
3. Implement download functionality
4. Implement validation info display
5. Implement resend email
6. Implement accept/reject (received)

### Phase 6: Backend Integration (Week 6)
1. Verify cross-app-be endpoints
2. Verify DTOs match frontend
3. Test invoice creation
4. Test invoice retrieval
5. Test document actions
6. Fix any mismatches

### Phase 7: Testing & Polish (Week 7)
1. End-to-end testing
2. Mobile responsiveness
3. Error handling
4. Loading states
5. Success messages
6. Performance optimization

---

## 13. Testing Requirements

### 13.1 Unit Tests
- Tax calculation service (all tax types)
- Discount calculation
- Line total calculation
- Form validation rules
- DTO transformations

### 13.2 Integration Tests
- Invoice creation flow
- Document tab management
- Line detail editing
- Document list filtering
- Document actions

### 13.3 E2E Tests
- Complete invoice creation (from product selection to finalization)
- View issued documents
- View received documents
- Accept/reject received document
- Resend email
- Download PDF/XML/JSON

---

## 14. Key Differences from Current Implementation

### 14.1 Current State
- Simple sale process
- Sidebar payment
- No document management
- No document types
- No line detail editor
- Basic tax calculation
- No document history

### 14.2 Target State
- Complete invoice management
- Modal-based payment
- Document list with filters
- Multiple document types
- Complete line detail editor
- Advanced tax calculations (JCampos-Biller logic)
- Full document history with actions

---

## 15. Success Criteria

### 15.1 Functional Requirements
 Create invoices with all document types
 Edit line details with complete tax/discount logic
 View issued and received documents
 Filter and search documents
 Perform document actions (PDF, download, validate, resend, accept/reject)
 Payment modal with multiple payment types
 Complete invoice request/response mapping
 Branch/terminal from session context

### 15.2 Quality Requirements
 Code follows project patterns
 Components are reusable
 State management is clean
 Performance is acceptable
 Mobile responsive
 Accessibility standards met
 Tests pass with >80% coverage

### 15.3 Business Requirements
 Tax calculations match JCampos-Biller exactly
 All special tax cases handled (bonus/gift, factory assumed, CABYS-based)
 Discount logic correct (including special types 01, 03)
 Invoice totals accurate
 Hacienda validation integration works
 Email notifications sent correctly
 Document status tracking accurate

---

## 16. Special Considerations

### 16.1 Session Context Integration

**IMPORTANT:** Branch and terminal are already handled in SessionSetupScreen:
- User selects branch and terminal on session setup
- Values stored in session context
- Available throughout the app via `useSessionContext()`
- No need to select again in DocumentCloseModal
- Use `sessionCtx.branch_code` and `sessionCtx.terminal_code` when creating invoice

**Implementation:**
```typescript
const sessionCtx = useSessionContext();

const handleFinalizeDocument = (closeData: CloseModalData) => {
  const invoiceRequest = {
    ...formData,
    branch_code: sessionCtx.branch_code,
    terminal_code: sessionCtx.terminal_code,
    copy_emails: closeData.copy_emails,
    payments: closeData.payments,
  };
  
  await createInvoice(invoiceRequest);
};
```

---

### 16.2 Snake_Case Convention

**IMPORTANT:** Frontend uses snake_case throughout - NO conversion needed!

**All form fields, API requests, and responses use snake_case:**
```typescript
interface InvoiceFormData {
  document_type: number;        // snake_case
  sale_condition_id: number;    // snake_case
  copy_emails: string[];        // snake_case
  branch_code: string;          // snake_case
  terminal_code: string;        // snake_case
}
```

**API Request (same snake_case):**
```typescript
interface InvoiceRequest {
  document_type: number;
  sale_condition_id: number;
  copy_emails: string[];
  branch_code: string;
  terminal_code: string;
}
```

**No Transformation Required:**
- Frontend forms use snake_case (not camelCase)
- API uses snake_case
- No conversion utilities needed
- Direct mapping between frontend and backend

---

### 16.3 Tax Calculation Service Integration

**Reference:** POS_PRODUCT_FORM_IMPROVEMENT_PLAN.md Section 3

**Must Include:**
- Complete JCampos-Biller calculation logic
- All tax types (01-IVA, 02-ISC, 03-IUC, 04-ISEBA, 05-ISEBEC, 06-IPT, 07-IVACE, 08-IVARBU, 12-ISEC, 99-OTHERS)
- Factory assumed tax logic (3 conditions)
- Bonus/gift discount special behavior
- Base amount calculation
- Tax processing order (special → other → IVA)
- CABYS-based calculations
- Document type special cases

**Service Location:** `src/services/taxCalculationService.ts`

**Key Functions:**
- `getLineAmounts()` - Main calculation
- `calculateIvaTaxAmount()` - IVA taxes
- `calculateTaxAmount()` - Other taxes
- `hasFactoryTax()` - Factory tax detection
- `hasDiscountsBonusOrGifts()` - Special discount detection

---

### 16.4 Mobile Responsiveness

**Desktop (>= 1024px):**
- Two-column layout (content + sidebar)
- Tabs view: Full invoice form
- List view: Document cards with all actions visible
- Hover interactions enabled

**Tablet (768px - 1023px):**
- Single column layout
- Tabs view: Full invoice form
- List view: Document cards with some actions in dropdown
- Touch interactions

**Mobile (< 768px):**
- Single column layout
- Bottom tab bar navigation
- Tabs view: Scrollable form
- List view: Compact cards with dropdown actions
- Touch-optimized buttons

---

## 17. Data Flow Diagrams

### 17.1 Invoice Creation Flow

```
User Action                    Component                   API
─────────────────────────────────────────────────────────────────
Click "Create" dropdown    → DocumentCreationDropdown
Select document type       → addDocumentTab()
                          → Switch to tabs view
                          → InvoiceForm (new tab)

Fill general data         → Form state updates
Search & select customer  → CustomerSearch
                          → ReceiverModal
                          → Update receiver data

Search & select product   → ProductSearch
                          → Add to details array
                          → Calculate line totals

Click "%" on line         → LineDetailModal
Edit taxes/discounts      → Update line data
                          → Recalculate totals
Save line                 → Update form state

Click "Finalize Document" → DocumentCloseModal
Enter payment info        → Collect payments
Enter copy emails         → Collect emails
Click "Save"              → Add branch/terminal from session
                          → POST /api/organizations/{organization_id}/sales → Backend
                          ← Sale response (with pdf_url, xml_url) ← Backend
                          → Show success message
                          → Close tab
                          → Switch to list view
17.2 Document List Flow
User Action                    Component                   API
─────────────────────────────────────────────────────────────────
Click "List" button       → Switch to list view
                          → IssuedDocumentsList

Load documents            → useQuery                → GET /api/organizations/{organization_id}/sales
                          ← Document list           ← Backend
                          → Render DocumentCards

Enter search term         → Filter documents locally
Click "Complex Search"    → ComplexSearchModal
Apply filters             → Refetch with filters    → GET /api/organizations/{organization_id}/sales?filters
                          ← Filtered documents      ← Backend

Click "View PDF"          → DocumentModal
                          → Use pdf_url from response
                          → Display PDF viewer

Click "Download"          → DocumentModal
Select format             → Download file           → Use pdf_url from response

Click "Validation Info"   → DocumentModal
                          → Fetch validation        → GET /api/organizations/{organization_id}/sales/:id
                          ← Validation details      ← Backend
                          → Display validation info

Click "Resend Email"      → DocumentModal
Enter emails              → Send email              → POST /api/organizations/{organization_id}/sales/{sale_id}/resend
                          ← Success response        ← Backend
                          → Show success message

Click "Accept" (received) → DocumentModal
Enter message             → Accept document         → POST /api/organizations/{organization_id}/sales/{sale_id}/accept
                          ← Success response        ← Backend
                          → Update document status
```

---

### 17.2 Document List Flow

```
User Action                    Component                   API
─────────────────────────────────────────────────────────────────
Click "List" button       → Switch to list view
                          → IssuedDocumentsList

Load documents            → useQuery                → GET /api/organizations/{organization_id}/sales
                          ← Document list           ← Backend
                          → Render DocumentCards

Enter search term         → Filter documents locally
Click "Complex Search"    → ComplexSearchModal
Apply filters             → Refetch with filters    → GET /api/organizations/{organization_id}/sales?filters
                          ← Filtered documents      ← Backend

Click "View PDF"          → DocumentModal
                          → Use pdf_url from response
                          → Display PDF viewer

Click "Download"          → DocumentModal
Select format             → Download file           → Use pdf_url from response

Click "Validation Info"   → DocumentModal
                          → Fetch validation        → GET /api/organizations/{organization_id}/sales/:id
                          ← Validation details      ← Backend
                          → Display validation info

Click "Resend Email"      → DocumentModal
Enter emails              → Send email              → POST /api/organizations/{organization_id}/sales/{sale_id}/resend
                          ← Success response        ← Backend
                          → Show success message

Click "Accept" (received) → DocumentModal
Enter message             → Accept document         → POST /api/organizations/{organization_id}/sales/{sale_id}/accept
                          ← Success response        ← Backend
                          → Update document status
```

---

## 18. Error Handling

### 18.1 Form Validation Errors

**Display:**
- Inline error messages below fields
- Red border on invalid fields
- Error summary at top of form (if multiple errors)

**Examples:**
- "Description is required"
- "Quantity must be greater than 0"
- "At least one IVA tax is required"
- "Total discount cannot exceed 100%"

---

### 18.2 API Errors

**Display:**
- Toast notification with error message
- Keep form data (don't clear)
- Allow user to retry

**Examples:**
- "Failed to create invoice. Please try again."
- "Network error. Check your connection."
- "Invalid data. Please check all fields."

---

### 18.3 Calculation Errors

**Display:**
- Error message in line detail modal
- Highlight problematic field
- Prevent saving until fixed

**Examples:**
- "Cannot calculate tax without CABYS code"
- "Base amount required for IVACE tax"
- "Tax factor required for IVARBU tax"

---

## 19. Performance Optimization

### 19.1 Lazy Loading
- Lazy load DocumentModal components
- Lazy load LineDetailModal
- Lazy load ComplexSearchModal
- Code splitting by route

### 19.2 Memoization
- Memoize tax calculations
- Memoize line totals
- Memoize document list filters
- Use React.memo for DocumentCard

### 19.3 Debouncing
- Debounce search input (300ms)
- Debounce calculation updates (100ms)
- Debounce form auto-save (500ms)

### 19.4 Caching
- Cache document list (5 minutes)
- Cache data API responses (10 minutes)
- Cache PDF URLs (1 hour)
- Use React Query for automatic caching

---

## 20. Accessibility

### 20.1 Keyboard Navigation
- Tab order follows visual order
- All buttons keyboard accessible
- Modal traps focus
- Escape closes modals
- Enter submits forms

### 20.2 Screen Readers
- Proper ARIA labels on all inputs
- ARIA live regions for dynamic content
- Semantic HTML (header, nav, main, section)
- Alt text for icons
- Status announcements

### 20.3 Visual Accessibility
- Color contrast ratio >= 4.5:1
- Focus indicators visible
- Error messages visible
- Loading states announced
- Success messages visible

---

## 21. Documentation Requirements

### 21.1 Code Documentation
- JSDoc comments on all components
- Type definitions for all interfaces
- Inline comments for complex logic
- README for invoice module

### 21.2 User Documentation
- How to create an invoice
- How to edit line details
- How to view documents
- How to accept/reject received documents
- Tax calculation explanations

---

## 22. References

### 22.1 JCampos-Biller Implementation
- **Path:** `E:\dev\JCampos-Biller\client\src`
- **Key Files:**
  - `pages/Invoices.tsx` - Main page structure
  - `components/invoices/InvoiceForm.tsx` - Complete form
  - `components/invoices/LineDetailModal.tsx` - Line editor
  - `components/invoices/DocumentCloseModal.tsx` - Payment modal
  - `components/invoices/IssuedDocumentsList.tsx` - Document list
  - `components/invoices/DocumentTabs.tsx` - Tab management
  - `services/taxCalculationService.ts` - Tax calculations

### 22.2 Current POS Implementation
- **Path:** `E:\dev\BeautyMarket\templates\pos-system\src`
- **Key Files:**
  - `pages/dashboard/POSIntegratedPage.tsx` - Current page
  - `components/pos/CartSidebar.tsx` - Current cart
  - `hooks/useCartFlow.ts` - Current flow
  - `services/taxCalculationService.ts` - Basic calculations

### 22.3 Cross-App-BE Backend
- **Path:** `E:\dev\cross-app-be`
- **Verify:**
  - Invoice endpoints exist
  - DTOs match frontend structures
  - All fields use snake_case
  - Tax calculation logic matches
  - Document validation works

### 22.4 Related Plans
- **POS_PRODUCT_FORM_IMPROVEMENT_PLAN.md** - Tax calculation details, section organization patterns, SectionWrapper component

---

## 23. Version History

**Version 1.0** - Initial plan
- Complete invoice management system mapping
- Document creation with multiple types
- Line detail editor with all JCampos-Biller functionality
- Document list with filters and actions
- Payment modal structure
- Complete request/response DTOs
- Session context integration (branch/terminal)
- Snake_case convention enforcement
- Tax calculation service integration
- Mobile responsiveness considerations

---

## 24. Next Steps

1. **Review this plan** with the team
2. **Verify cross-app-be** endpoints and DTOs
3. **Create tickets** for each phase
4. **Set up development environment** with all projects
5. **Begin Phase 1** implementation
6. **Regular sync meetings** to track progress
7. **Code reviews** for each component
8. **Testing** after each phase
9. **User acceptance testing** before production
10. **Deploy** to production

---

**END OF PLAN**