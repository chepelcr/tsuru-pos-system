# FormLabel Component Usage Guide

## Overview
The `FormLabel` component provides consistent label styling across all forms in the POS system.

## Component Location
```
src/components/ui/FormLabel.tsx
```

## Features
- ✅ Consistent uppercase styling with display font
- ✅ Built-in required field indicator (red asterisk)
- ✅ Proper spacing (6px margin bottom)
- ✅ Support for custom styles
- ✅ Accessibility support with `htmlFor` prop

## Basic Usage

### Simple Label
```tsx
import { FormLabel } from "@/components/ui";

<FormLabel>Nombre</FormLabel>
<input className="pp-input" />
```

### Required Field
```tsx
<FormLabel required>Correo electrónico</FormLabel>
<input type="email" className="pp-input" />
```

### With htmlFor (for accessibility)
```tsx
<FormLabel htmlFor="email-input" required>Correo electrónico</FormLabel>
<input id="email-input" type="email" className="pp-input" />
```

### Custom Styling
```tsx
<FormLabel style={{ fontSize: 11, color: "hsl(var(--primary))" }}>
  Precio estimado
</FormLabel>
```

## Migration from Old Labels

### Before (old pattern):
```tsx
<label className="pp-label">
  Nombre <span style={{ color: "hsl(var(--destructive))" }}>*</span>
</label>
```

or

```tsx
<label className="t-label" style={{ display: "block", marginBottom: 6 }}>
  Nombre <span style={{ color: "hsl(var(--destructive))" }}>*</span>
</label>
```

### After (new pattern):
```tsx
<FormLabel required>Nombre</FormLabel>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | required | Label text content |
| `required` | `boolean` | `false` | Shows red asterisk for required fields |
| `htmlFor` | `string` | `undefined` | Associates label with input element |
| `style` | `React.CSSProperties` | `{}` | Additional inline styles (merged with defaults) |

## Examples in Context

### Client Form Section
```tsx
<div>
  <FormLabel required>Correo electrónico</FormLabel>
  <input
    type="email"
    className="pp-input"
    value={form.email}
    onChange={(e) => setForm({ ...form, email: e.target.value })}
    placeholder="correo@ejemplo.com"
  />
</div>
```

### Product Form Section
```tsx
<div>
  <FormLabel required>Nombre del producto</FormLabel>
  <input
    className="pp-input"
    value={form.name}
    onChange={(e) => onChange({ name: e.target.value })}
    placeholder="Ej: Shampoo Hidratante"
  />
</div>
```

### Two-Column Layout
```tsx
<div style={{ display: "flex", gap: 10 }}>
  <div style={{ flex: "0 0 calc(50% - 5px)" }}>
    <FormLabel required>Tipo de identificación</FormLabel>
    <select className="pp-input">
      <option>Cédula Física</option>
    </select>
  </div>
  
  <div style={{ flex: "0 0 calc(50% - 5px)" }}>
    <FormLabel required>Número</FormLabel>
    <input className="pp-input" placeholder="0-0000-0000" />
  </div>
</div>
```

## Updated Components

The following components have been updated to use `FormLabel`:

### Client Sections
- ✅ `IdentitySection.tsx`
- ✅ `ContactSection.tsx`
- ✅ `AddressSection.tsx`

### Shared Components
- ✅ `LocationSelect.tsx`

### Product Sections (to be migrated)
- ⏳ `GeneralInfoSection.tsx`
- ⏳ `CommercialValueSection.tsx`
- ⏳ `InventorySection.tsx`
- ⏳ `PackagingSection.tsx`
- ⏳ `CodesSection.tsx`
- ⏳ `DiscountsSection.tsx`
- ⏳ `FiscalInformationSection.tsx`
- ⏳ `IvaTaxSection.tsx`
- ⏳ `OtherTaxSection.tsx`

## Benefits

1. **Consistency**: All labels look the same across the application
2. **Maintainability**: Change styling in one place
3. **Cleaner Code**: Less repetitive markup
4. **Type Safety**: TypeScript props ensure correct usage
5. **Accessibility**: Built-in support for `htmlFor` attribute
6. **DRY Principle**: Don't repeat the same label styling everywhere

## Notes

- The component automatically applies the `t-label` class
- The `display: "block"` and `marginBottom: 6` styles are applied by default
- Custom styles passed via the `style` prop are merged with defaults
- The required asterisk is automatically styled with destructive color
