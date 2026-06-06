# Data API DTOs - Snake Case Architecture

## Overview

This directory contains TypeScript DTOs (Data Transfer Objects) for the Data Services API. All DTOs use **snake_case** field naming to match the API responses directly, eliminating transformation overhead.

## Base Type Hierarchy

The DTO architecture uses a 4-level inheritance hierarchy:

```
SimpleBase (id, created_on, updated_on)
├── GlobalCatalogBase (+ description, status, deleted_on)
├── CatalogBase (+ description, country_code, status, deleted_on)
    ├── CodedCatalogBase (+ code)
        └── HaciendaBase (+ document_version_id)
```

### Base Types

#### SimpleBase
Basic entity with timestamps.
```typescript
interface SimpleBase {
  id: number;
  created_on: string;
  updated_on: string;
}
```

**Services**: locations, notification-codes

#### GlobalCatalogBase
Global catalogs (not country-specific).
```typescript
interface GlobalCatalogBase extends SimpleBase {
  description: string;
  status: number;
  deleted_on: string | null;
}
```

**Services**: customer-types, product-types, tax-rate-codes

#### CatalogBase
Country-specific catalogs.
```typescript
interface CatalogBase extends SimpleBase {
  description: string;
  country_code: string;
  status: number;
  deleted_on: string | null;
}
```

**Services**: document-versions, national-taxpayer-companies, tax-amounts, tax-factors

#### CodedCatalogBase
Country-specific catalogs with code field.
```typescript
interface CodedCatalogBase extends CatalogBase {
  code: string;
}
```

**Services**: discount-types, documents, economic-activities, identifications, national-taxpayer-special-fields, pharmaceutical-forms, regimes

#### HaciendaBase
Hacienda-specific catalogs with document version.
```typescript
interface HaciendaBase extends CodedCatalogBase {
  document_version_id: number;
}
```

**Services**: codes, exemptions, exemptions-issuing-institutions, factory-tax-charges, measurement-units, other-charges, payments, reference-codes, references, sale-conditions, tax-conditions, taxes, transactions

## Usage Examples

### Using DTOs with snake_case

```typescript
import { CodeResponse, CustomerTypeResponse } from '@/services/data-api';

// API response uses snake_case directly
const code: CodeResponse = {
  id: 1,
  code: '01',
  description: 'Tax Code',
  country_code: 'CR',
  status: 1,
  document_version_id: 43,
  created_on: '2024-01-01T00:00:00Z',
  updated_on: '2024-01-01T00:00:00Z',
  deleted_on: null
};

// Access fields with snake_case
console.log(code.country_code);  // 'CR'
console.log(code.document_version_id);  // 43
```

### Using with React Query Hooks

```typescript
import { useAllCodes } from '@/hooks/useDataApi';

function CodesComponent() {
  const { data: codes } = useAllCodes({
    iso_code: 'CR',
    document_version_id: 43
  });

  return (
    <div>
      {codes?.map(code => (
        <div key={code.id}>
          {code.description} - {code.country_code}
        </div>
      ))}
    </div>
  );
}
```

## Custom ID Field Mappings

Some services have custom ID fields in addition to the base `id`:

| Service | Custom ID Field | Type |
|---------|----------------|------|
| document-versions | version_id | number |
| discount-types | discount_type_id | number |
| economic-activities | activity_id | number |

## Migration from camelCase

### Before (camelCase)
```typescript
// Old - camelCase fields
const code = {
  id: 1,
  countryCode: 'CR',
  documentVersionId: 43,
  createdOn: '2024-01-01'
};

console.log(code.countryCode);
```

### After (snake_case)
```typescript
// New - snake_case fields
const code: CodeResponse = {
  id: 1,
  country_code: 'CR',
  document_version_id: 43,
  created_on: '2024-01-01'
};

console.log(code.country_code);
```

## Service Classification

### SimpleBase Services (2)
- **locations**: Countries, states, counties, districts, neighborhoods
- **notification-codes**: Notification codes

### GlobalCatalogBase Services (3)
- **customer-types**: Customer type catalogs
- **product-types**: Product type catalogs
- **tax-rate-codes**: Tax rate code catalogs

### CatalogBase Services (4)
- **document-versions**: Document version catalogs
- **national-taxpayer-companies**: National taxpayer company catalogs
- **tax-amounts**: Tax amount catalogs
- **tax-factors**: Tax factor catalogs

### CodedCatalogBase Services (7)
- **discount-types**: Discount type catalogs
- **documents**: Document type catalogs
- **economic-activities**: Economic activity catalogs
- **identifications**: Identification type catalogs
- **national-taxpayer-special-fields**: Special field catalogs
- **pharmaceutical-forms**: Pharmaceutical form catalogs
- **regimes**: Regime catalogs

### HaciendaBase Services (14)
- **codes**: Tax codes
- **exemptions**: Tax exemptions
- **exemptions-issuing-institutions**: Exemption issuing institutions
- **factory-tax-charges**: Factory tax charges
- **measurement-units**: Measurement units
- **other-charges**: Other charges
- **payments**: Payment methods
- **reference-codes**: Reference codes
- **references**: References
- **sale-conditions**: Sale conditions
- **tax-conditions**: Tax conditions
- **taxes**: Taxes
- **transactions**: Transactions

## Benefits

1. **Zero Transformation Overhead**: API responses used directly without field name conversion
2. **Type Safety**: TypeScript ensures correct field access at compile time
3. **Consistency**: snake_case used throughout Python backend → API → TypeScript frontend
4. **Maintainability**: Base type hierarchy reduces duplication
5. **Scalability**: Easy to add new services by extending appropriate base type

## Related Documentation

- [Data API Quick Reference](../../../DATA_API_QUICK_REFERENCE.md)
- [Data API Integration Guide](../../../DATA_API_INTEGRATION_COMPLETE.md)
