# Reporte de IVA — regulación, módulo FE y contrato BE

> **Qué es esto.** El módulo `Reportes → Declaración de IVA` (`/dashboard/reports/iva`) y el
> contrato del backend que lo alimenta. Este repositorio es solo el frontend: la agregación vive
> en `sales-api` y aquí se especifica para que se implemente allá.

---

## 1. Marco regulatorio (Costa Rica, vigente 2026)

### 1.1 Qué cambió: ATV → TRIBU-CR, D-104 → D-150

| | Antes (ATV) | Ahora (TRIBU-CR) |
|---|---|---|
| Plataforma | ATV | **TRIBU-CR** (OVI), desde el **6 de octubre de 2025** |
| Formulario IVA régimen general | `D-104` / `D-104-2` | **`D-150`** (a.k.a. "formulario 150") |
| Modelo de declaración | por **actividad económica** | por **tarifa de impuesto** |
| Llenado | manual | **precargado** desde los comprobantes electrónicos v4.4 |

La resolución **MH-DGT-RES-0033-2025** ("Formularios y medio para la presentación de las
declaraciones del Impuesto al Valor Agregado", *La Gaceta* del 2 de setiembre de 2025, vigente
desde el 6 de octubre de 2025) estableció los formularios y dejó TRIBU-CR como **único** medio:
una declaración presentada por otra vía se tiene legalmente por **no presentada**.

**El cambio que hace construible este reporte** es el paso de *actividad económica* a *tarifa*.
Cada línea de un comprobante v4.4 ya carga su `TaxRateCode` (Nota 8.1) — el mismo enum que vive en
`src/lib/enums/hacienda.ts` — así que los renglones de la declaración salen directamente de los
documentos que el POS emite, sin necesidad de mapear actividades.

### 1.2 Familia de formularios

| Formulario | Régimen | Periodicidad |
|---|---|---|
| **D-150** | General + especial de bienes usados **modalidad a)** | Mensual |
| D-151 | Especial agropecuario | Cuatrimestral |
| D-152 | Especial agropecuario | Anual |
| D-157 | Especial de bienes usados **modalidades b) y c)** | Según modalidad |
| *(D-105)* | *Régimen de Tributación Simplificada — ISR + IVA en una sola declaración* | *Trimestral* |

El POS implementa hoy el **D-150**. Los demás códigos existen en
`src/lib/enums/ivaDeclaration.ts` (`IvaDeclarationForm`) para que el BE pueda devolver el que
corresponda sin cambio de contrato en el FE.

> Los contribuyentes del **régimen simplificado** no emiten comprobantes electrónicos y liquidan
> el IVA dentro del D-105. Para el POS son el mismo caso que las organizaciones sin credenciales
> de Hacienda: ver [`MANUAL_ORDERS.md`](./MANUAL_ORDERS.md).

### 1.3 Plazo, pago y sanción

- **Presentación y pago: dentro de los primeros 15 días naturales del mes siguiente** al período
  fiscal (art. 27 Ley 6826 / art. 33 RLIVA). `IVA_FILING_DAY = 15` en el enum.
- El pago se hace por **débito en tiempo real** desde TRIBU-CR.
- Presentar tarde activa el art. 79 CNPT (multa de medio salario base) más intereses de mora.

### 1.4 Tarifas

| Tarifa | `TaxRateCode` | Aplicación |
|---|---|---|
| 13 % | `GENERAL_13` (`"08"`) | General |
| 4 % | `REDUCED_4` (`"04"`) | Servicios de salud privada, pasajes aéreos |
| 2 % | `REDUCED_2` (`"03"`) | Medicamentos, educación privada |
| 1 % | `REDUCED_1` (`"02"`) | Canasta básica tributaria |
| 0,5 % | `REDUCED_HALF` (`"09"`) | Agropecuarios orgánicos certificados |
| 0 % con crédito | `EXEMPT_FULL_CREDIT` (`"01"`) | Art. 32 RLIVA |
| Exento | `EXEMPT` (`"10"`) | Ley 9635 art. 8 |
| No sujeto | `NOT_SUBJECT` (`"11"`) | Fuera del ámbito; **sin** derecho a crédito |

La tarifa de cada línea la determina su **código CABYS**. Un CABYS mal asignado manda el ingreso al
renglón equivocado de la declaración — por eso el reporte emite la advertencia `missing_cabys`.

### 1.5 Secciones del D-150

| Sección | Contenido | Autollenado por Hacienda |
|---|---|---|
| **I** | Ventas del período por tarifa (mercancías / servicios), exentas, no sujetas, exportaciones | Desde 2025 |
| **II** | Compras y créditos por tarifa, según destino (gravado / exento / mixto) | **Desde enero 2026** |
| **III** | Proporcionalidad (prorrata) | **Desde diciembre 2026** |
| **IV** | Determinación: débito − crédito | Calculada |
| **V** | Liquidación: saldos anteriores, retenciones, compensaciones, intereses | Calculada |
| **VI** | Resultado final y comprobante | Calculada |

El formulario es **personalizado**: las secciones de regímenes que la organización no tiene ni
siquiera aparecen.

### 1.6 Proporcionalidad (prorrata)

Cuando la organización realiza operaciones con y sin derecho a crédito, el IVA soportado de uso
mixto solo es deducible en la proporción de las operaciones con derecho a crédito (arts. 24-30
RLIVA):

- Durante el año se aplica una **prorrata provisional** (la del año anterior; 100 % para un
  contribuyente nuevo).
- En **diciembre** se determina la **prorrata definitiva** y se ajusta la diferencia — a favor o a
  cargo. `IVA_ANNUAL_ADJUSTMENT_MONTH = 12`.

### 1.7 Retenciones por tarjetas — importante para un POS

Los adquirentes (procesadores de tarjeta) actúan como **agentes de retención** y retienen **hasta
un 6 %** sobre el importe neto de ventas que acreditan al comercio (art. 15 bis Ley 6826). Esa
retención es un **pago a cuenta** del IVA del período. En una organización con ventas mayormente
con tarjeta suele ser la diferencia entre "a pagar" y "saldo a favor", por eso tiene su propio
renglón (`settlement.card_withholdings`) y no se mezcla con `other_withholdings`.

### 1.8 IVA diferido (novedad v4.4)

La condición de venta **`10`** (`SaleConditionCode.CREDIT_90_VAT_ART_27`) difiere el IVA hasta 90
días: el impuesto se declara cuando se cobra, documentado con un REP. El reporte lo separa en
`sales.deferred_tax_total` (pendiente) y `sales.deferred_tax_collected` (cobrado en el período).

### 1.9 Qué NO hace este módulo

- **No presenta la declaración.** TRIBU-CR es el único medio legal y precarga el borrador con lo
  que Hacienda ya aceptó.
- **No sustituye la contabilidad.** Es una vista de conciliación: los mismos números, cortados
  igual que el formulario, para contrastar el borrador y explicar cualquier diferencia.

### 1.10 Fuentes

- Resolución **MH-DGT-RES-0033-2025** — *Formularios y medio para la presentación de las
  declaraciones del IVA* — https://www.hacienda.go.cr/docs/ACTUALIZACION_ANEXOS_IVA_RES_MH-DGT-RES-0033-2025_VersionFinal.pdf
  *(el sitio de Hacienda bloqueó la descarga automatizada al redactar este documento; el contenido
  citado proviene de los resúmenes profesionales de abajo — verificar contra el PDF oficial antes
  de implementar el BE).*
- Ministerio de Hacienda — TRIBU-CR: https://www.hacienda.go.cr/TRIBU-CR.html
- Ley del Impuesto al Valor Agregado (Ley 6826, reformada por Ley 9635):
  https://pgrweb.go.cr/scij/Busqueda/Normativa/Normas/nrm_texto_completo.aspx?nValor1=1&nValor2=32526
- Deloitte — *Administración Tributaria publica nuevos formularios para declarar IVA*:
  https://www.deloitte.com/latam/es/services/tax/perspectives/cr-03sep25-administracion-publica-nuevos-formularios-declarar-iva.html
- Facturele — *La nueva declaración del IVA 4.4, formulario D-150*:
  https://www.facturele.com/2025/09/18/declaracion-del-iva-formulario-d-150/
- PwC — *Declaración de retenciones por operaciones con tarjetas de crédito y débito*:
  https://www.pwc.com/ia/es/publicaciones/Noticias-Tax-Legal/Tax-and-legal-2025/declaracion-de-retenciones-por-operaciones-con-tarjetas-de-credito-y-debito.pdf

---

## 2. Módulo frontend

### 2.1 Archivos

```
src/lib/enums/ivaDeclaration.ts     Formularios, secciones, IVA_RATE_BUCKETS, plazos
src/types/ivaReport.ts              DTOs del reporte (snake_case, espejo del BE)
src/hooks/useIvaReport.ts           Queries + helpers de período/plazo (+ .test.ts)
src/hooks/useHaciendaEnabled.ts     ¿La organización emite comprobantes electrónicos?
src/lib/ivaReportCsv.ts             Exportación CSV sección por sección
src/components/reports/             IvaPeriodPicker, IvaSummaryCards, IvaSalesSection,
                                    IvaPurchasesSection, IvaProportionalitySection,
                                    IvaSettlementSection, IvaWarnings, IvaReportSkeleton
src/pages/dashboard/IvaReportPage.tsx
src/locales/{es,en}/reports.json    Namespace `reports`, claves `iva.*`
```

### 2.2 Ruta y navegación

- Ruta: `ROUTES.DASHBOARD_REPORTS_IVA` = `/dashboard/reports/iva`, declarada **antes** de
  `/dashboard/reports` en `Routes.tsx` y en `getActiveNav`.
- La barra lateral pasó de un ítem suelto "Reportes" a una **sección `reports`** con dos ítems:
  `reporte` (`reports/general`) e `ivaReport` (`reports/iva`) — el espejo 1:1 del catálogo RBAC
  que exige CLAUDE.md §5.1.
- El union `NavId`, que estaba duplicado en cuatro archivos de `components/layout/`, ahora vive en
  `src/components/layout/navIds.ts`.

### 2.3 RBAC — **pendiente en `tsuru-platform-api`**

El módulo `reports` gana un submódulo. En `src/seeds/rbac-seed.ts`:

| Dónde | Qué agregar |
|---|---|
| `defaultSubmodules` | `iva` bajo el módulo `reports` |
| `submoduleActionMatrix` | `reports/iva` → `read`, `export` |
| `rolePermissionMatrix` | `read` + `export` para gerente/propietario; **no** para cajero |

Luego `pnpm run db:reseed-rbac` (reseed destructivo del catálogo).

Hasta que eso exista, `usePermissions` falla-abierto y el ítem se ve; la ruta, en cambio, es
estricta (`PermissionBoundary` falla-cerrado), así que **el submódulo debe sembrarse antes de
publicar**.

### 2.4 Estados que la página resuelve sola

| Situación | Qué se muestra |
|---|---|
| Organización sin facturación electrónica | `EmptyState` con enlace a información fiscal o a credenciales |
| `404` del endpoint | "Sin movimientos en el período" (no es un error) |
| Error de red | `EmptyState` con reintento |
| Período abierto (`is_final: false`) | Aviso con documentos pendientes y rechazados |
| Siempre | Aviso de que la presentación legal ocurre en TRIBU-CR |

---

## 3. Contrato backend (`sales-api`)

Base: `VITE_SALES_API_URL`. Path helper: `salesTaxReportPath(orgId, suffix)` en `src/lib/api.ts`.

### 3.1 `GET /api/organizations/{organization_id}/tax-reports/iva`

| Query param | Tipo | Notas |
|---|---|---|
| `period` | `YYYY-MM` | Requerido. Para D-151 acepta `YYYY-Qn`; para D-152, `YYYY` |
| `form_code` | string | Opcional. Por defecto el régimen de la organización |

**200** → `IvaReport` (ver §3.3). **404** → la organización no tuvo movimientos en el período; el
FE lo trata como vacío, no como error. **403** → sin `reports:iva:read`.

### 3.2 `GET /api/organizations/{organization_id}/tax-reports/iva/periods`

**200** → `IvaReportPeriod[]`, más reciente primero:

```json
[{ "period": "2026-07", "form_code": "D-150", "is_final": true,
   "total_payable": 412350.00, "due_date": "2026-08-15" }]
```

### 3.3 Respuesta

```jsonc
{
  "organization_id": "…",
  "period": "2026-07",
  "period_start": "2026-07-01",
  "period_end": "2026-07-31",
  "form_code": "D-150",
  "currency_code": "CRC",
  "generated_on": "2026-08-03T14:02:11Z",
  "is_final": true,
  "pending_documents": 0,
  "rejected_documents": 0,

  "sales": {
    "rows": [{
      "rate_code": "08",            // TaxRateCode
      "rate_percentage": 13,
      "merchandise_base": 1200000.00,
      "service_base": 300000.00,
      "taxable_base": 1500000.00,
      "tax_amount": 195000.00,
      "document_count": 412
    }],
    "exempt_base": 0, "non_taxable_base": 0, "export_base": 0,
    "taxable_base_total": 1500000.00,
    "tax_debit_total": 195000.00,
    "deferred_tax_total": 0, "deferred_tax_collected": 0,
    "credit_note_total": 0, "debit_note_total": 0
  },

  "purchases": {
    "rows": [{
      "rate_code": "08", "rate_percentage": 13,
      "taxable_base": 500000.00, "tax_supported": 65000.00,
      "full_credit_tax": 52000.00, "non_creditable_tax": 3000.00, "mixed_tax": 10000.00,
      "document_count": 87
    }],
    "taxable_base_total": 500000.00,
    "tax_supported_total": 65000.00,
    "full_credit_total": 52000.00,
    "mixed_credit_total": 8000.00,      // mixed_tax YA multiplicado por la prorrata
    "non_creditable_total": 3000.00,
    "capital_goods_credit": 0,
    "tax_credit_total": 60000.00,
    "unaccepted_document_count": 2
  },

  "proportionality": {
    "applies": true,
    "provisional_percentage": 80,
    "definitive_percentage": null,      // solo en el período de diciembre
    "is_annual_adjustment": false,
    "adjustment_amount": 0,
    "credit_bearing_revenue": 1500000.00,
    "total_revenue": 1875000.00
  },

  "determination": {
    "tax_debit": 195000.00, "tax_credit": 60000.00,
    "proportionality_adjustment": 0,
    "net_tax": 135000.00, "favorable_balance": 0
  },

  "settlement": {
    "previous_favorable_balance": 0,
    "card_withholdings": 42000.00,
    "other_withholdings": 0, "advance_payments": 0, "compensations": 0,
    "interest": 0, "penalties": 0,
    "total_payable": 93000.00,
    "carry_forward_balance": 0,
    "due_date": "2026-08-15"
  },

  "warnings": [{ "code": "unaccepted_purchases", "document_count": 2 }]
}
```

`warnings[].code` ∈ `pending_hacienda_validation` · `rejected_documents` ·
`unaccepted_purchases` · `missing_cabys` · `manual_orders_excluded` ·
`provisional_proportionality`. Cada código tiene su copia en `reports.json`; agregar uno nuevo
exige agregarlo también a `IVA_WARNING_CODES` y a ambos idiomas.

### 3.4 Reglas de agregación

1. **Universo.** Solo documentos **aceptados por Hacienda**
   (`atv_validation.validation_status = 1`) con `sale_date` dentro del período.
   Los rechazados y los pendientes **no** suman: se reportan en `rejected_documents` /
   `pending_documents` y `is_final = false` mientras existan pendientes.
2. **Emitidos vs. recibidos.** `is_received = false` → sección I. `is_received = true` → sección
   II. Una compra solo acredita si la organización **aceptó** el comprobante; las no aceptadas van
   a `unaccepted_document_count`.
3. **Agrupación.** Por `LineTax.rate_code` a nivel de **línea**, no de documento: un mismo
   documento puede aportar a varios renglones.
4. **Mercancías vs. servicios.** Desde `DocumentSummary.taxed_merchandise` /
   `taxed_services` (la división CABYS que ya trae el v4.4).
5. **NC / ND.** La nota de crédito **resta** y la de débito **suma** en el renglón de la tarifa de
   sus líneas; los totales `credit_note_total` / `debit_note_total` se exponen aparte solo para
   auditoría — **no** volver a restarlos.
6. **Tarifas transitorias** (`05`/`06`/`07`) se consolidan en su tarifa destino: no tienen renglón
   propio y el FE no las conoce.
7. **Prorrata.** `mixed_credit_total = Σ mixed_tax × provisional_percentage / 100`.
   `tax_credit_total = full_credit_total + mixed_credit_total + capital_goods_credit`.
   En diciembre se resuelve `definitive_percentage` y `adjustment_amount`.
8. **Liquidación.**
   `total_payable = max(0, net_tax + proportionality_adjustment − previous_favorable_balance
   − card_withholdings − other_withholdings − advance_payments − compensations
   + interest + penalties)`; el remanente negativo va a `carry_forward_balance`.
   Un saldo a favor se arrastra automáticamente **solo por 3 períodos**.
9. **Vencimiento.** `due_date` = día 15 del mes siguiente. Si cae inhábil, Hacienda corre al hábil
   siguiente: el BE es la autoridad sobre esa fecha, el FE la muestra tal cual.
10. **Moneda.** La declaración se presenta en **CRC**. Los documentos en otra moneda se convierten
    al tipo de cambio del documento (`summary_colon` cuando exista).
11. **Pedidos manuales quedan fuera.** No son comprobantes electrónicos; si la organización tiene
    alguno en el período, emitir `manual_orders_excluded`.

### 3.5 Rendimiento

Un período puede tener decenas de miles de líneas: agregar en SQL
(`GROUP BY rate_code`), nunca en memoria. El resultado de un período **cerrado** es inmutable —
vale la pena materializarlo (`iva_report_snapshots`) e invalidarlo solo cuando llegue una
validación tardía. El FE cachea 60 s (`staleTime`).

### 3.6 Retenciones por tarjetas

`card_withholdings` no sale de los comprobantes: la retiene el adquirente. Fuentes posibles, en
orden de preferencia: (a) la constancia de retenciones de TRIBU-CR, (b) captura manual por período
(`POST /tax-reports/iva/{period}/withholdings`), (c) 0 con la advertencia correspondiente. **La
implementación inicial puede devolver 0** — el renglón ya existe en el FE.

---

## 4. Pendientes

- [ ] `sales-api`: endpoints §3.1 y §3.2.
- [ ] `tsuru-platform-api`: submódulo RBAC `reports/iva` + `db:reseed-rbac` (§2.3).
- [ ] Verificar los nombres de sección y renglones contra el PDF oficial de la resolución (§1.10).
- [ ] Captura de retenciones por tarjetas (§3.6).
- [ ] Formularios D-151 / D-152 / D-157 cuando haya organizaciones en esos regímenes.
