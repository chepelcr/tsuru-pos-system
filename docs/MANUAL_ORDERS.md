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
| Cola offline (`db.sales`) | Sí | Sí — ver §6 |
| Se puede facturar después | n/a | Sí, una vez entregado — ver §7 |
| Cuenta para la declaración de IVA | Sí | **No** (`manual_orders_excluded`) |

## 4. Dónde aparece — el modo fiscal de la organización

El discriminador es **la organización registrada** (`registered-organization`): la identidad
fiscal con cédula, régimen y actividades económicas. Sin ella no hay cédula con la que firmar ni
código de actividad que poner en una línea, así que un documento electrónico no es que no se
pueda *enviar* — no se puede *construir*.

```
  ¿registered-organization? ──no──▶  modo "orders-only"   (solo pedidos)
           │sí
           ▼
  ¿credenciales + certificado? ──no──▶ modo "electronic", canTransmit false
           │sí
           ▼
                                       modo "electronic", canTransmit true
```

`useFiscalMode(orgId)` resuelve eso. **El pedido manual está disponible en los dos modos:**

| Modo | Tipos creables |
|---|---|
| `orders-only` | Solo `PM`, sujeto a `commercial/create/orders` |
| `electronic` | Los seis tipos de Hacienda (cada uno sujeto a `documents/<permSub>`) **y** `PM` |

Que una organización registrada también tenga el pedido manual es deliberado: **un pedido no
siempre se factura**. Se toma la orden, se decide qué se despacha, y solo cuando el pedido se
entrega —si corresponde— se emite el comprobante. Ese último paso es §7.

El modo solo decide si los tipos **electrónicos** están disponibles. Las credenciales de ATV son
un paso posterior y **no** cambian el modo: una organización con identidad fiscal pero sin
certificado no es otro tipo de negocio, es un contribuyente a medio configurar. Conserva los tipos
electrónicos; lo que todavía no puede es *transmitirlos* (`canTransmit`).

El modo falla **cerrado**: mientras es desconocido el menú queda vacío en lugar de mostrar
brevemente el conjunto equivocado. Sin conexión se resuelve solo, porque
`registered-organization` está persistido (ver [`OFFLINE.md`](./OFFLINE.md)); si aun así no hay
nada, se recurre al último modo conocido (`pos-fiscal-mode:{orgId}`, un valor que no filtra nada).

Puntos de entrada:

1. **Menú "+"** de la barra lateral y de la barra superior: `useCreatableDocTypes()` incluye
   siempre `PM`, junto a los tipos electrónicos cuando el modo lo permite.
2. **Página de Pedidos** — botón "Nuevo pedido", que abre una pestaña `PM` y navega al editor.
3. **Tarjeta de acciones rápidas** del panel — "Crear pedido", junto a factura y tiquete cuando
   están disponibles.

Y en sentido contrario: si una pestaña de documento electrónico sobrevive a un cambio de modo (las
pestañas se persisten), `DocumentEditor` la bloquea con un aviso y un enlace a la información
fiscal, en vez de dejar que el cajero llene un carrito y choque con un críptico "código de
actividad requerido" en el checkout.

### RBAC

El pedido manual se controla por **`commercial/create/orders`**, no por el módulo `documents`: es
un pedido, no un documento (CLAUDE.md §5.1). No hace falta sembrar nada nuevo — ese par ya existe
en el catálogo. El modo fiscal decide **qué conjunto** se ofrece; RBAC filtra dentro de él.

`useCanOpenCreateMenu()` existe por esto: el gate del botón "+" era solo
`documents/create/emitted`, lo que habría escondido el menú justo a la organización cuya única
entrada creable es el pedido manual.

## 5. Archivos

```
src/types/invoice.ts               MANUAL_ORDER_DOC_TYPE, EditorDocTypeCode,
                                   EDITOR_DOCUMENT_TYPES, isManualOrderDocType (+ .test.ts)
src/types/order.ts                 ManualOrderFields, ManualOrderPayload, MANUAL_ORDER_SOURCE
src/hooks/useFiscalMode.ts         El modo fiscal (el gate)
src/hooks/useCartFlow.ts           Rama de envío hacia la API de pedidos
src/hooks/useRbac.ts               useCreatableDocTypes, useCanOpenCreateMenu
src/components/pos/checkout/CheckoutDrawer.tsx            Modo pedido manual
src/components/pos/checkout/sections/ManualOrderSection.tsx  Datos de entrega
src/components/pos/checkout/Receipt.tsx                   Comprobante del pedido
src/components/documents/DocumentEditor.tsx                Bloqueo de pestañas electrónicas
src/lib/orderToInvoice.ts                                 Pedido → pestaña de documento (+ .test.ts)
src/components/orders/InvoiceOrderModal.tsx               "Facturar pedido"
src/components/dashboard/QuickDocActionsCard.tsx           Acción rápida "Crear pedido"
src/pages/dashboard/OrdersPage.tsx                        Botón "Nuevo pedido"
src/locales/{es,en}/orders.json                           Claves `manualOrder.*`
src/locales/{es,en}/documents.json                        `docTypes.PM`
src/index.css                                             `--doc-pm` / `.text-doc-pm`
```

## 6. Funciona sin conexión

El pedido manual usa la misma bandeja de salida que una venta. Cada registro de `db.sales` nombra
su `target` (`"sales"` | `"orders"`) y `pendingSalesSync` elige el cliente HTTP a partir de eso —
antes la cola reenviaba todo contra `salesApi`, que es la razón por la que el pedido manual no
podía encolarse.

El flujo es idéntico al de una venta: se persiste **antes** del POST con una `Idempotency-Key`
estable (`localId`), se intenta enviar de inmediato, y un fallo reintentable deja el pedido en
cola para el próximo sync. El comprobante en pantalla lo dice (`manualOrder.receipt.queued`).

Los productos y los clientes que el pedido necesita también están disponibles sin conexión — ver
[`OFFLINE.md`](./OFFLINE.md).

## 7. Facturar un pedido entregado

Un pedido no es un documento fiscal y no siempre termina en uno. Cuando sí, la página del pedido
tiene **"Facturar pedido"**.

Condiciones para que aparezca:

- modo `electronic` (sin identidad fiscal no hay comprobante posible),
- `order_status === 'delivered'` — se factura lo que se entregó, no lo que se pidió,
- el pedido no está facturado ya (`order.invoice`),
- el rol puede crear el documento (`documents/create/fe`).

Qué hace: abre una pestaña nueva del editor con el carrito reconstruido a partir del pedido y el
cliente seleccionado, y **nada más**. No emite. El usuario revisa impuestos, receptor y pago en el
mismo checkout que cualquier otra venta, porque ahí es donde viven las decisiones fiscales.

**Las líneas se enlazan por `product_id`**, no por descripción. La línea del pedido es plana —no
tiene estructura de impuestos ni descuentos— y una factura electrónica los necesita. Una línea que
no se puede enlazar se **reporta**, no se inventa: fabricar un `product_id` mandaría al BE algo que
no existe, y fabricar un CABYS pondría una tarifa equivocada en un documento fiscal. El modal dice
"3 de 5 líneas" antes de continuar, y el usuario agrega el resto a mano.

Los productos se leen del espejo offline (`readCachedProductsByIds`), que la precarga de inicio de
sesión ya llenó — así la reconstrucción también funciona sin conexión.

### Enlace de vuelta — **pendiente en el BE**

Hoy el vínculo es el número de pedido en las `notes` del documento. Falta cerrarlo de verdad:

```
POST /api/organizations/{org}/orders/{document_number}/invoice
     { sale_id, document_type, consecutive_number, document_key, issued_on }
```

El BE guarda eso en `orders.invoice` y lo devuelve en el `Order` (tipo `OrderInvoiceLink`). Con eso:

- el badge "Facturado · {consecutivo}" aparece en el pedido,
- el botón desaparece, evitando la doble facturación,
- el reporte de IVA puede dejar de excluir el pedido, porque ya está representado por su
  comprobante.

Mientras no exista, **nada impide facturar dos veces el mismo pedido** — el FE solo puede ocultar
el botón cuando el BE le dice que ya está facturado.

## 8. Restricción conocida: se necesita sesión de POS

El editor es el POS: `POSIntegratedPage` muestra `SessionSetupScreen` si no hay sucursal y terminal
en `sessionContext`, y el checkout exige una asignación activa. Un pedido manual hereda ambas
condiciones — es el precio de reutilizar la pantalla, y a cambio el pedido queda atribuido a su
sucursal, terminal y cajero, y el inventario local se descuenta igual que en una venta.

## 9. Contrato backend (`cross-app-be`, dominio orders)

Base: `VITE_ORDERS_API_URL`. Helper: `ordersStoreOrgPath(orgId, endpoint)`.

### 9.1 `POST /api/organizations/{organization_id}/orders`

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
6. **Idempotencia — obligatoria.** El FE manda `Idempotency-Key` con el `localId` de la bandeja de
   salida, y **reusa el mismo valor en cada reintento**. Un pedido capturado sin conexión se
   reenvía cuando vuelve la señal, y sin deduplicación por ese header el reintento crea un
   pedido duplicado. Guardar la clave con el pedido y devolver el registro existente en un
   reintento.
7. **Autorización.** Requiere `commercial:orders:create`. El BE **debe** rechazar el `POST` si la
   organización sí tiene facturación electrónica activa, o aceptarlo explícitamente: el gate del FE
   es de producto, no de seguridad.

### 9.2 Cambios en el modelo

| Campo | Tipo | Notas |
|---|---|---|
| `orders.source` | `varchar(16)` default `'import'` | `'manual'` para los creados aquí |
| `orders.document_type` | `varchar(8)` | `'PM'` en los manuales |
| `orders.delivery_location_name` | `varchar` nullable | Punto libre, sin GLN registrado |
| `orders.created_by` | `uuid` | Usuario que capturó el pedido |
| `orders.assignment_id` / `branch_number` / `terminal_number` | nullable | Atribución de POS |
| `order_lines.cabys` | `varchar(13)` nullable | Se conserva para poder facturarlo después |

### 9.3 Ya cubierto: convertir un pedido en factura

El botón ya existe (§7) y reconstruye el carrito desde el pedido. Lo que falta del lado del BE es
el **enlace de vuelta**: el endpoint `POST /orders/{document_number}/invoice` y el campo
`orders.invoice`. Sin eso el pedido no sabe que fue facturado y puede facturarse dos veces.

Para que la reconstrucción funcione, el BE **debe devolver `product_id` en cada `OrderLine`** — se
lo mandamos al crear el pedido (§9.1), y es la única forma de recuperar el producto completo con su
CABYS, impuestos y descuentos.

## 10. Pendientes

- [ ] `cross-app-be`: `POST /orders` con `source: "manual"` (§9.1) y migración (§9.2).
- [ ] Exponer `source` en el `Order` y filtrar por él en el listado de Pedidos.
- [ ] Deduplicación por `Idempotency-Key` en el BE (§9.1, punto 6) — sin eso, un pedido
      capturado sin conexión puede duplicarse al reintentar.
- [ ] `POST /orders/{document_number}/invoice` + campo `orders.invoice` (§7, §9.3) — **sin esto un
      pedido se puede facturar dos veces.**
- [ ] Devolver `product_id` (y `cabys`) en cada `OrderLine` (§9.3).
