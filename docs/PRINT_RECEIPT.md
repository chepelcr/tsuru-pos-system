# Ticket de 80 mm — impresión de pedidos y facturas

> **Estado.** Implementado (TSR-127). Este documento reemplaza la especificación
> anterior, que describía un botón en `src/pages/pos/POSPage.tsx` — un archivo que
> ya no existe — y una solución de `window.print()` en el navegador.

## 1. Decisión: el ticket se genera en el backend

El ticket **no** se maqueta en el navegador. Es un **formato de documento** del
pedido, igual que su PDF y su Excel, y se renderiza en `store-be`:

```
Jinja (ticket.html) → wkhtmltopdf (72 mm) → S3 → attachments.ticket_url
```

Se descartó imprimir desde el navegador con `@media print`. Habría significado
**dos maquetadores distintos** para el mismo comprobante: el del servidor —que ya
produce la orden de compra y el reporte de cross-docking— y uno nuevo en CSS. En
cuanto uno de los dos cambiara, una reimpresión dejaría de coincidir con el
original, y no habría forma de adjuntar el ticket a un correo ni de recuperarlo
después.

Con el ticket en el backend:

- una reimpresión es **idéntica** al original (el mismo PDF, no un render nuevo),
- se puede enviar por correo o volver a abrir semanas después,
- se ve igual en cualquier dispositivo, sin depender del navegador ni del sistema.

## 2. Dónde vive

| Pieza | Archivo |
|---|---|
| Plantilla | `be/store-be/app/templates/ticket.html` |
| Servicio | `be/store-be/app/services/ticket_service.py` |
| Endpoint | `POST /api/organizations/{org}/orders/{document_number}/ticket` |
| Columna | `crossdocking_orders.ticket_url` (migración `ac9d0e1f2a3b`) |
| Hook FE | `src/hooks/useOrderTicket.ts` |
| Botón | `OrderDetailPage` → "Ticket 80 mm" |

## 3. Formato

72 mm de ancho útil sobre rollo de 80 mm (el resto lo consumen los márgenes de la
impresora). **Sin alto de página**: el rollo es continuo, así que el ticket mide
lo que necesita; fijar un alto rellenaría de papel en blanco los tickets cortos.

Se usa una configuración de wkhtmltopdf propia, no `pdf_service.generate_pdf`:
esa produce Carta, vertical, con encabezado y "# [page]" al pie — todo incorrecto
en un recibo.

## 4. Qué imprime

- Identidad de la organización (logo, nombre, cédula) y sucursal
- **Encabezado que dice qué es el papel**: `PEDIDO`, `PROFORMA`,
  `ORDEN DE TRABAJO` u `ORDEN DE COMPRA`
- Número, fecha, cajero, terminal, cliente
- Líneas con cantidad, precio unitario, descuento y total
- Subtotal · descuentos · servicio · impuestos · **TOTAL**
- Medios de pago y **vuelto** (sólo cuando el pago excede el total)
- Bloque de entrega: fecha, departamento, punto de entrega
- Verticales: mesa (restaurante), activo y kilometraje (taller)
- **Representación impresa de Hacienda**: consecutivo, clave y QR — sólo cuando
  el pedido ya fue facturado

### La proforma se identifica como tal

Un `quote` imprime `PROFORMA` y, debajo, **"No es un comprobante fiscal"**. Un
papel que parece un recibo invita a que lo traten como uno; decirlo explícitamente
es la diferencia entre una cotización y un comprobante.

## 5. Se regenera a propósito

El endpoint vuelve a renderizar cada vez, en lugar de devolver el PDF guardado.
Un ticket reimpreso **después** de facturar el pedido debe mostrar el consecutivo,
la clave y el QR que antes no existían.

Se genera **bajo demanda**, no al crear el pedido: la mayoría nunca se imprimen, y
renderizar un PDF por pedido gastaría tiempo de Lambda en papel que nadie pide.

## 6. Límite conocido: comandas por estación

Las estaciones de cocina (`kitchen_stations`, `product_stations`) ya existen y el
modelo permite dividir un pedido por estación. Falta el render por estación —
usará esta misma plantilla con las líneas filtradas.

`printer_target` es el **nombre de un destino de impresión**, no un driver: un
navegador no puede hablarle directamente a una impresora térmica. Cualquier cosa
más allá de eso (ESC/POS vía un agente local) está fuera de alcance.
