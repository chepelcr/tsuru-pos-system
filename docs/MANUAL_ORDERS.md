# Pedidos manuales — módulo FE y contrato BE

> **Qué es esto.** Cómo una organización **sin facturación electrónica** registra pedidos en el
> POS, y qué tiene que implementar `cross-app-be` (orders) para recibirlos. Este repositorio es
> solo el frontend.

---

## 1. Problema

El módulo de Pedidos existía en modo lectura + importación de Excel: pedidos B2B que llegan de un
marketplace, nunca creados a mano. Y todo el flujo de captura del POS terminaba en un comprobante
electrónico de Hacienda.

Eso deja fuera a un conjunto legítimo de organizaciones:

- **Régimen de Tributación Simplificada** — no emiten comprobantes electrónicos (liquidan IVA e
  ISR en el D-105 trimestral).
- Organizaciones **en onboarding**, con información fiscal pero todavía sin certificado ni
  credenciales de ATV/TRIBU-CR.
- Operaciones **internas o B2B** que se registran para control y se facturan después (o nunca).

Necesitan registrar lo que venden. No necesitan —ni pueden— emitir una FE.

## 2. Decisión: un tipo de documento más, no un formulario aparte

El pedido manual es un **tipo de documento del editor**, `PM`, abierto en la misma pantalla del POS
que una FE o un TE.

La alternativa era un formulario dedicado en la página de Pedidos. Se descartó: el editor de
documentos **ya modela exactamente las estructuras que un pedido necesita** —líneas con CABYS,
impuestos y descuentos en cascada; selección de cliente; medios de pago; moneda y tipo de cambio—
y todo eso habría que reconstruirlo, peor, en un formulario nuevo. Reutilizando el editor, la
organización sin facturación electrónica obtiene el POS completo (búsqueda de productos, carrito,
drawer de detalle de línea, pestañas múltiples, borradores persistidos) y el mapeo a la estructura
del pedido es una sola rama en el envío.

**`PM` no es un código de Hacienda.** Son dos letras precisamente para que no pueda colisionar con
ningún código numérico, presente o futuro. La distinción está en los tipos:

```ts
type DocTypeCode       = '01' | '02' | '03' | '04' | '08' | '09';  // Hacienda
type EditorDocTypeCode = DocTypeCode | 'PM';                       // lo que el editor puede abrir
```

`DocTypeCode` sigue siendo lo que llega a un payload de Hacienda; `EditorDocTypeCode` es lo que
viaja por el estado del editor (pestaña, carrito, checkout). `isManualOrderDocType()` es el guard.

## 3. Qué cambia según el tipo

| | Documento Hacienda | Pedido manual (`PM`) |
|---|---|---|
| Destino | `POST /sales` (sales-api) | `POST /orders` (orders-api) |
| Firma, XML, envío a ATV | Sí | **No** |
| Código de actividad económica | Requerido | No aplica |
| Receptor | Requerido salvo TE | Cliente requerido (no fiscal) |
| Referencias (NC/ND) | Según tipo | No aplica |
| Correos de copia | Sí | No (no hay servicio de notificación) |
| Pago completo para confirmar | Requerido | **No** — un pedido se paga después |
| Sección extra | — | Entrega: fecha, punto, evento, comentario |
| Cola offline (`db.sales`) | Sí | **No** — ver §6 |
| Cuenta para la declaración de IVA | Sí | **No** (`manual_orders_excluded`) |

## 4. Dónde aparece

El pedido manual se ofrece **solo** cuando la organización **no** tiene facturación electrónica:

```ts
useHaciendaEnabled(orgId).enabled === false
```

`useHaciendaEnabled` exige las **dos** piezas: un registro `registered-organization` (identidad
fiscal) y una `configurations` activa con usuario y certificado. Falla **cerrado** mientras carga,
para que la opción nunca parpadee en el menú de una organización registrada.

Puntos de entrada:

1. **Menú "+"** de la barra lateral y de la barra superior. `useCreatableDocTypes()` agrega la
   entrada `PM` a los tipos de Hacienda que el rol puede crear.
2. **Página de Pedidos** — botón "Nuevo pedido", que abre una pestaña `PM` y navega al editor.

### RBAC

El pedido manual se controla por **`commercial/create/orders`**, no por el módulo `documents`: es
un pedido, no un documento (CLAUDE.md §5.1). No hace falta sembrar nada nuevo — ese par ya existe
en el catálogo.

`useCanOpenCreateMenu()` existe por esto: el gate del botón "+" era solo
`documents/create/emitted`, lo que habría escondido el menú justo a la organización cuya única
entrada creable es el pedido manual.

## 5. Archivos

```
src/types/invoice.ts               MANUAL_ORDER_DOC_TYPE, EditorDocTypeCode,
                                   EDITOR_DOCUMENT_TYPES, isManualOrderDocType (+ .test.ts)
src/types/order.ts                 ManualOrderFields, ManualOrderPayload, MANUAL_ORDER_SOURCE
src/hooks/useHaciendaEnabled.ts    El gate
src/hooks/useCartFlow.ts           Rama de envío hacia la API de pedidos
src/hooks/useRbac.ts               useCreatableDocTypes, useCanOpenCreateMenu
src/components/pos/checkout/CheckoutDrawer.tsx            Modo pedido manual
src/components/pos/checkout/sections/ManualOrderSection.tsx  Datos de entrega
src/components/pos/checkout/Receipt.tsx                   Comprobante del pedido
src/pages/dashboard/OrdersPage.tsx                        Botón "Nuevo pedido"
src/locales/{es,en}/orders.json                           Claves `manualOrder.*`
src/locales/{es,en}/documents.json                        `docTypes.PM`
src/index.css                                             `--doc-pm` / `.text-doc-pm`
```

## 6. Sin cola offline — a propósito

Las ventas se persisten primero en IndexedDB (`db.sales`) y se reintentan. Esa cola **siempre**
reenvía contra `salesApi` (`src/services/pendingSalesSync.ts`), así que meter un pedido ahí lo
reintentaría contra el gateway equivocado. El pedido manual se envía directo; si falla, el error
sube al drawer de checkout y el usuario reintenta con el carrito intacto.

Darle resiliencia offline al pedido manual exige generalizar la cola a "URL + cliente", no solo
"URL". Queda fuera de alcance y anotado en §9.

## 7. Restricción conocida: se necesita sesión de POS

El editor es el POS: `POSIntegratedPage` muestra `SessionSetupScreen` si no hay sucursal y terminal
en `sessionContext`, y el checkout exige una asignación activa. Un pedido manual hereda ambas
condiciones — es el precio de reutilizar la pantalla, y a cambio el pedido queda atribuido a su
sucursal, terminal y cajero, y el inventario local se descuenta igual que en una venta.

## 8. Contrato backend (`cross-app-be`, dominio orders)

Base: `VITE_ORDERS_API_URL`. Helper: `ordersStoreOrgPath(orgId, endpoint)`.

### 8.1 `POST /api/organizations/{organization_id}/orders`

Cuerpo (`ManualOrderPayload`):

```jsonc
{
  "source": "manual",            // discriminador — el import de Excel no lo manda
  "document_type": "PM",         // tipo interno del editor, nunca un código de Hacienda
  "client_id": "uuid | null",    // cliente del catálogo, si se seleccionó uno
  "client": { "name": "Pulpería La Esquina", "gln": "", "internal_code": "3101234567" },
  "delivery_date": "2026-09-12",
  "delivery_location": { "name": "Bodega central", "code": "BC-01" },
  "event": "Feria de setiembre",
  "comment": "Entregar antes de mediodía",
  "currency_code": "CRC",
  "exchange_rate": 1,
  "assignment_id": "uuid",
  "branch_number": 1,
  "terminal_number": 2,
  "payments": [{ "type": "01", "amount": 25000 }],   // códigos Hacienda; puede venir vacío
  "lines": [{
    "line_number": 1,
    "product_id": "uuid",
    "description": "Café molido 500 g",
    "quantity": 10,
    "unit_price": 3500.00,       // unitario SIN impuesto
    "discount": 3500.00,         // monto absoluto de la línea
    "tax": 4095.00,              // monto absoluto de la línea
    "line_total": 35595.00,
    "cabys": "0161010150000"
  }],
  "totals": {
    "total_lines": 1, "total_quantity_ordered": 10,
    "subtotal": 35000.00, "discounts": 3500.00, "taxes": 4095.00, "grand_total": 35595.00
  }
}
```

**201** → un `Order` completo, la misma forma que devuelve el listado. El FE lo usa tal cual para
el comprobante en pantalla (`document_number`).

Reglas para el BE:

1. **Los totales del cuerpo son una pista.** Recalcular en el servidor, igual que hace `sales-api`
   con `summary`. Reutilizar `app/services/line_calculation_service.py`: las líneas ya traen CABYS,
   descuento e impuesto en la misma semántica que una línea de venta.
2. **`document_number`.** El pedido manual no tiene consecutivo de Hacienda; asignar un número de
   la secuencia de pedidos de la organización, con prefijo propio (p. ej. `PM-000123`) para que sea
   distinguible de un pedido importado.
3. **Estado inicial** `pending` (código 1) — el mismo modelo de estados del resto de pedidos.
4. **`source` se persiste** y se expone en el `Order`, para poder filtrar manuales vs. importados y
   para que el reporte de IVA los excluya (`manual_orders_excluded`).
5. **`order_type`** debe quedar distinto de `'73'`: un pedido manual nunca entra al flujo de
   cross-docking.
6. **Idempotencia.** El FE no manda `Idempotency-Key` todavía; aceptar el header si aparece.
7. **Autorización.** Requiere `commercial:orders:create`. El BE **debe** rechazar el `POST` si la
   organización sí tiene facturación electrónica activa, o aceptarlo explícitamente: el gate del FE
   es de producto, no de seguridad.

### 8.2 Cambios en el modelo

| Campo | Tipo | Notas |
|---|---|---|
| `orders.source` | `varchar(16)` default `'import'` | `'manual'` para los creados aquí |
| `orders.document_type` | `varchar(8)` | `'PM'` en los manuales |
| `orders.delivery_location_name` | `varchar` nullable | Punto libre, sin GLN registrado |
| `orders.created_by` | `uuid` | Usuario que capturó el pedido |
| `orders.assignment_id` / `branch_number` / `terminal_number` | nullable | Atribución de POS |
| `order_lines.cabys` | `varchar(13)` nullable | Se conserva para poder facturarlo después |

### 8.3 Después: convertir un pedido en factura

Cuando la organización complete su registro ante Hacienda, sus pedidos manuales deberían poder
convertirse en FE. Ya están las piezas: cada línea guarda CABYS, cantidad, precio neto, descuentos
e impuestos — exactamente lo que necesita `POST /sales`. Falta el endpoint
(`POST /orders/{document_number}/invoice`) y el botón. Fuera de alcance por ahora, pero el modelo
de datos no lo bloquea: por eso se persiste el CABYS en un documento que hoy no es fiscal.

## 9. Pendientes

- [ ] `cross-app-be`: `POST /orders` con `source: "manual"` (§8.1) y migración (§8.2).
- [ ] Exponer `source` en el `Order` y filtrar por él en el listado de Pedidos.
- [ ] Generalizar la cola offline a "URL + cliente" para dar resiliencia al pedido manual (§6).
- [ ] Conversión pedido → factura electrónica (§8.3).
