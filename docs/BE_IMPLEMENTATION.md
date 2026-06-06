# POS Invoice Management — Backend Implementation Guide

> **Status:** Scaffolding phase. All four services need to be built via `/be-builder` (shared-layer mode).  
> **Frontend depends on:** `VITE_SALES_API_URL`, `VITE_VALIDATION_API_URL`, `VITE_XML_API_URL`, `VITE_NOTIFY_API_URL`

---

## Architecture Overview

The backend is split into **4 cooperating shared-layer Lambda services**, all sharing a single Python common layer (models, DTOs, repositories) and the same Postgres database.

```
┌─────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐   ┌───────────────────┐
│   sales-api      │   │  validation-api      │   │  xml-generation-api  │   │  notification-api │
│ CRUD for sales   │   │  Receiver validation │   │  XML + Hacienda ATV  │   │  Email resend     │
│ /sales/*         │   │  /invoice-validation │   │  /xml/*              │   │  /notifications/* │
└─────────┬────────┘   └────────┬────────────┘   └──────────┬──────────┘   └─────────┬─────────┘
          │                     │                            │                         │
          └─────────────────────┴────────────────────────────┴─────────────────────────┘
                                         │
                              Shared Python Layer
                         (models / services / repos / dtos)
                                         │
                              PostgreSQL (shared DB)
```

### Base URLs (configure in each service's `.env` / SSM)

| Service | Suggested URL | FE env var |
|---|---|---|
| `sales-api` | `https://sales-api.jcampos.dev` | `VITE_SALES_API_URL` |
| `validation-api` | `https://validation-api.jcampos.dev` | `VITE_VALIDATION_API_URL` |
| `xml-generation-api` | `https://xml-api.jcampos.dev` | `VITE_XML_API_URL` |
| `notification-api` | `https://notify-api.jcampos.dev` | `VITE_NOTIFY_API_URL` |

---

## Scaffolding (use `/be-builder` skill)

Run `/be-builder` for each service with:
- **Pattern:** shared-layer
- **Scope key:** `organization_id`
- **Stack:** FastAPI + Mangum + SQLAlchemy + Pydantic
- **Auth:** Bearer JWT (API Gateway authorizer) + `x-user-id` header

Service names: `sales-api`, `validation-api`, `xml-generation-api`, `notification-api`

---

## Database Schema

### Tables to create (single Alembic migration)

#### `sales`
```sql
CREATE TABLE sales (
    sale_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   VARCHAR(255) NOT NULL,
    assignment_id     VARCHAR(255),
    branch_id         UUID NOT NULL REFERENCES branches(branch_id) ON DELETE RESTRICT,
    terminal_id       UUID NOT NULL REFERENCES terminals(terminal_id) ON DELETE RESTRICT,
    branch_code       INTEGER NOT NULL,
    terminal_code     INTEGER NOT NULL,
    client_id         UUID REFERENCES clients(client_id) ON DELETE SET NULL,
    document_type     INTEGER NOT NULL DEFAULT 4,  -- 1=FE, 2=ND, 3=NC, 4=TE, 8=FC, 9=FE-Exp
    version_id        INTEGER NOT NULL DEFAULT 1,
    activity_code     VARCHAR(20) NOT NULL,
    sale_condition_id INTEGER NOT NULL DEFAULT 1,
    credit_term       VARCHAR(10) NOT NULL DEFAULT '0',
    notes             TEXT,
    copy_emails       JSONB,
    currency_iso_code VARCHAR(10) NOT NULL DEFAULT 'CRC',
    currency_exchange_rate NUMERIC(18,5) NOT NULL DEFAULT 1,
    subtotal          NUMERIC(18,5) NOT NULL,
    discount_amount   NUMERIC(18,5) NOT NULL DEFAULT 0,
    tax_amount        NUMERIC(18,5) NOT NULL DEFAULT 0,
    total_amount      NUMERIC(18,5) NOT NULL,
    -- Hacienda output fields (nullable until xml-generation-api is wired)
    consecutive_number VARCHAR(50),
    document_key       VARCHAR(255),
    document_route     TEXT,
    document_name      VARCHAR(255),
    pdf_url            TEXT,
    xml_url            TEXT,
    json_url           TEXT,
    -- ATV validation (Hacienda response)
    atv_validation_status   INTEGER,  -- 1=Validated, 2=Pending, 3=Rejected
    atv_validation_message  TEXT,
    atv_validation_date     TIMESTAMPTZ,
    -- Receiver validation (buyer's response for received docs)
    receiver_validation_status  INTEGER,  -- 1=Accepted, 2=PartialAccept, 3=Rejected
    receiver_validation_message TEXT,
    receiver_validation_date    TIMESTAMPTZ,
    is_received       BOOLEAN NOT NULL DEFAULT FALSE,
    sale_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by        VARCHAR(255) NOT NULL,
    status            INTEGER NOT NULL DEFAULT 1,  -- 1=Active, 0=Deleted
    created_on        TIMESTAMPTZ DEFAULT NOW(),
    updated_on        TIMESTAMPTZ,
    deleted_on        TIMESTAMPTZ
);
CREATE INDEX idx_sales_org ON sales(organization_id);
CREATE INDEX idx_sales_org_date ON sales(organization_id, sale_date);
CREATE INDEX idx_sales_org_type ON sales(organization_id, document_type);
CREATE INDEX idx_sales_org_received ON sales(organization_id, is_received);
CREATE INDEX idx_sales_consecutive ON sales(consecutive_number);
```

#### `sale_receivers` (1:1 with sales)
```sql
CREATE TABLE sale_receivers (
    receiver_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id           UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
    id_number         VARCHAR(50),
    id_type           INTEGER,
    id_code           VARCHAR(10),
    nationality       VARCHAR(10),
    business_name     VARCHAR(255),
    trade_name        VARCHAR(255),
    email             VARCHAR(255),
    state_id          INTEGER,
    county_id         INTEGER,
    district_id       INTEGER,
    address           TEXT,
    personal_phone_country_code VARCHAR(5),
    personal_phone_number       VARCHAR(20),
    business_phone_country_code VARCHAR(5),
    business_phone_number       VARCHAR(20),
    fax_country_code  VARCHAR(5),
    fax_number        VARCHAR(20),
    fiscal_record_8707 VARCHAR(50),
    taxpayer_id       VARCHAR(50),
    customer_type     INTEGER,
    economic_activity VARCHAR(20)
);
```

#### `sale_lines`
```sql
CREATE TABLE sale_lines (
    line_id               BIGSERIAL PRIMARY KEY,
    sale_id               UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
    line_number           INTEGER NOT NULL,
    product_id            VARCHAR(255),
    description           VARCHAR(500) NOT NULL,
    quantity              NUMERIC(18,5) NOT NULL,
    net_price             NUMERIC(18,5) NOT NULL,
    base_amount           NUMERIC(18,5),
    unit_id               INTEGER,
    commercial_unit_measure VARCHAR(20),
    customs_part          VARCHAR(12),
    factory_tax_charge_id INTEGER,
    cabys                 VARCHAR(20),
    discount_amount       NUMERIC(18,5) NOT NULL DEFAULT 0,
    tax_amount            NUMERIC(18,5) NOT NULL DEFAULT 0,
    factory_assumed_tax   NUMERIC(18,5) NOT NULL DEFAULT 0,
    line_total            NUMERIC(18,5) NOT NULL,
    created_on            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sale_lines_sale ON sale_lines(sale_id);
```

#### `sale_line_taxes`
```sql
CREATE TABLE sale_line_taxes (
    tax_id          BIGSERIAL PRIMARY KEY,
    line_id         BIGINT NOT NULL REFERENCES sale_lines(line_id) ON DELETE CASCADE,
    tax_type_id     INTEGER NOT NULL,
    other_tax_type  VARCHAR(50),
    tax_rate_id     INTEGER,
    tax_factor_id   INTEGER,
    rate            NUMERIC(10,5),
    amount          NUMERIC(18,5) NOT NULL DEFAULT 0,
    special_fields  JSONB,  -- {quantity, percentage, volume_consumption}
    exemption       JSONB
);
```

#### `sale_line_discounts`
```sql
CREATE TABLE sale_line_discounts (
    discount_id      BIGSERIAL PRIMARY KEY,
    line_id          BIGINT NOT NULL REFERENCES sale_lines(line_id) ON DELETE CASCADE,
    discount_type_id INTEGER NOT NULL,
    percentage       NUMERIC(8,5) NOT NULL,
    amount           NUMERIC(18,5) NOT NULL DEFAULT 0,
    reason           VARCHAR(255)
);
```

#### `sale_payments`
```sql
CREATE TABLE sale_payments (
    payment_id      BIGSERIAL PRIMARY KEY,
    sale_id         UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
    payment_type_id INTEGER NOT NULL,
    amount          NUMERIC(18,5) NOT NULL
);
```

#### `sale_references`
```sql
CREATE TABLE sale_references (
    reference_id      BIGSERIAL PRIMARY KEY,
    sale_id           UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
    reference_type_id INTEGER NOT NULL,
    other_type        VARCHAR(50),
    document_number   VARCHAR(100) NOT NULL,
    reference_date    DATE NOT NULL,
    reference_code    INTEGER NOT NULL,
    other_code        VARCHAR(50),
    reason            VARCHAR(255)
);
```

---

## API Reference

### `sales-api` — `/api/organizations/{organization_id}/sales`

| Method | Path | Request DTO | Response DTO | Notes |
|---|---|---|---|---|
| `POST` | `/` | `CreateSaleDTO` | `SaleResponse` | Persist nested structure; Hacienda fields null |
| `GET` | `/` | (query params) | `SaleListResponse` | See filters below |
| `GET` | `/{sale_id}` | — | `SaleResponse` | Full nested detail |
| `PUT` | `/{sale_id}` | `UpdateSaleDTO` | `SaleResponse` | Draft only (atv_validation_status IS NULL) |
| `DELETE` | `/{sale_id}` | — | 204 | Soft delete; draft only |

**GET query parameters:**
```
document_types  = "01,04,03"        comma-separated document type codes
issued          = true|false         omit to return all
search          = URL-encoded JSON   {searchTerm, status, start_date, end_date, sort}
page            = 0                  0-indexed
size            = 20                 default 20, max 250
```

### `validation-api` — `/api/organizations/{organization_id}/sales/{sale_id}/invoice-validation`

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| `GET` | `/` | — | `InvoiceValidationDTO` | Read ATV + receiver validation status |
| `POST` | `/` | `ValidationActionDTO` | `InvoiceValidationDTO` | One endpoint for accept/partial-accept/reject |

**`ValidationActionDTO`:**
```json
{
  "action": "accept" | "partial-accept" | "reject",
  "message": "string (required when action=reject)"
}
```

**`InvoiceValidationDTO`:**
```json
{
  "atv_validation": {
    "validation_status": 1,
    "validation_message": null,
    "validation_date": null
  },
  "receiver_validation": {
    "status": 1,
    "message": null,
    "validation_date": null
  }
}
```

### `xml-generation-api` — `/api/organizations/{organization_id}/sales/{sale_id}/xml`

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| `POST` | `/generate` | — | `SaleResponse` | **Stub:** sets `atv_validation_status=2 (Pending)` |
| `POST` | `/upload` | `UploadXmlDTO` | `SaleResponse` | Upload pre-signed received-doc XML |
| `GET` | `/files` | — | `XmlFilesDTO` | Returns `{pdf_url, xml_url, json_url}` |

### `notification-api` — `/api/organizations/{organization_id}/sales/{sale_id}/notifications`

| Method | Path | Request | Response | Notes |
|---|---|---|---|---|
| `POST` | `/resend` | `ResendNotificationDTO` | 204 | **Stub:** logs intent |

**`ResendNotificationDTO`:**
```json
{
  "copy_emails": ["email@example.com"],
  "message": "optional message"
}
```

---

## Complete DTO Shapes

### `CreateSaleDTO` (request)
```json
{
  "assignment_id": "uuid",
  "branch_code": 1,
  "terminal_code": 1,
  "client_id": "uuid | null",
  "document_type": 4,
  "version_id": 1,
  "activity_code": "722000",
  "sale_condition_id": 1,
  "credit_term": "0",
  "notes": null,
  "copy_emails": ["email@example.com"],
  "currency_code": { "iso_code": "CRC", "exchange_rate": 1 },
  "receiver": {
    "id_number": "123456789",
    "id_type": 1,
    "id_code": "01",
    "nationality": "CR",
    "business_name": "Cliente SA",
    "trade_name": null,
    "email": "cliente@example.com",
    "state_id": 1,
    "county_id": 1,
    "district_id": 1,
    "address": "Dirección",
    "personal_phone": { "country_code": "506", "number": "88887777" },
    "business_phone": null,
    "fax": null,
    "fiscal_record_8707": null,
    "taxpayer_id": null,
    "customer_type": 1,
    "economic_activity": null
  },
  "details": [
    {
      "line_number": 1,
      "product_id": "prod-uuid",
      "description": "Producto A",
      "quantity": 2.0,
      "net_price": 1000.0,
      "base_amount": null,
      "unit_id": 1,
      "commercial_unit_measure": null,
      "customs_part": null,
      "factory_tax_charge_id": null,
      "cabys": "1234567890123",
      "taxes": [
        {
          "tax_type_id": 1,
          "other_tax_type": null,
          "tax_rate_id": 1,
          "tax_factor_id": null,
          "rate": 13.0,
          "special_fields": null,
          "exemption": null
        }
      ],
      "discounts": [
        {
          "discount_type_id": 1,
          "percentage": 10.0,
          "reason": null
        }
      ]
    }
  ],
  "payments": [
    { "payment_type_id": 1, "amount": 2260.0 }
  ],
  "references": [],
  "subtotal": 2000.0,
  "discount_amount": 200.0,
  "tax_amount": 234.0,
  "total_amount": 2034.0
}
```

### `SaleResponse` (full detail response)
```json
{
  "sale_id": "uuid",
  "organization_id": "uuid",
  "document_type": 4,
  "sale_date": "2024-01-01T10:00:00Z",
  "consecutive_number": null,
  "document_key": null,
  "is_received": false,
  "currency_code": { "iso_code": "CRC", "exchange_rate": 1 },
  "summary": {
    "subtotal": 2000.0,
    "discount_amount": 200.0,
    "tax_amount": 234.0,
    "voucher_total": 2034.0
  },
  "atv_validation": null,
  "receiver_validation": null,
  "pdf_url": null,
  "xml_url": null,
  "json_url": null,
  "receiver": { "business_name": "Cliente SA", "email": "cliente@example.com" },
  "details": [...],
  "payments": [{ "payment_type_id": 1, "amount": 2034.0 }],
  "references": [],
  "created_at": "2024-01-01T10:00:00Z",
  "created_by": "user-id"
}
```

---

## Deployment Order

1. Run `/be-builder` to scaffold all 4 services with shared layer
2. Add the 7 tables to the shared Alembic migration
3. Deploy shared layer to Lambda Layer Store
4. Deploy each service as a Lambda behind API Gateway
5. Register custom domains (`sales-api.jcampos.dev`, etc.) via Route53 + ACM
6. Set `VITE_SALES_API_URL` etc. in pos-system `.env.production`
7. Set up CodePipeline via `/codepipeline-setup` skill

---

## Event Flow (v1 stub → v2 real)

```
v1 (stub):
FE → POST /sales → SaleResponse (pdf_url=null)
FE → POST /xml/generate → sets atv_validation_status=2

v2 (real Hacienda):
POST /sales → publishes sale.created to SQS
xml-generation-api consumes → signs XML → submits to ATV → polls
ATV responds → xml-generation-api writes pdf_url/xml_url/consecutive_number/atv_validation_status
xml-generation-api publishes sale.validated to SNS
notification-api consumes → sends SES email with PDF
```

---

## Notes

- All fields use **snake_case** throughout — no camelCase in the API layer.
- The shared layer owns **all SQLAlchemy models** — individual services import from it. No model duplication.
- The FE's `taxCalculationService.ts` is the canonical math; the BE trusts the FE's computed `subtotal`, `discount_amount`, `tax_amount`, `total_amount` fields as informational (stored as-is, not recalculated).
- Hacienda `pdf_url`/`xml_url`/`json_url` fields remain `null` until `xml-generation-api` is fully implemented — the FE renders "Pendiente" affordances when these are null.
