# 🍗 Pollos Porteños App — Wireframes

Todos los wireframes son **React JSX interactivos**. Se pueden abrir directamente en Claude.ai
(arrastrando el archivo) o montando en un proyecto con Vite/CRA.

---

## 📁 Estructura

```
wireframes/
├── flutter/                        # Pantallas de la app Flutter (cajero + gerente)
│   ├── pos-cajero.jsx              # POS del cajero — JCA-163
│   ├── inventario-cierre.jsx       # Apertura inventario + Cierre caja — JCA-170, JCA-183
│   └── mini-dashboard-gerente.jsx  # Mini Dashboard del gerente — JCA-209, JCA-210, JCA-211
│
└── react/                          # Pantallas del React Dashboard (web)
    ├── pos-cajero-web.jsx          # POS web cajero (PWA fallback) — JCA-206
    ├── dashboard-gerente.jsx       # Dashboard tiempo real + Cierres + Historial — JCA-174
    ├── react-pages.jsx             # Gestión productos + Reporte partido — JCA-161, JCA-189
    └── configuracion-sesion.jsx    # Configurar sesión (partido/turno) + Asignaciones — JCA-181
```

---

## 🎨 Paleta de colores

| Token           | HEX       | Uso                              |
|-----------------|-----------|----------------------------------|
| `primary`       | `#E8620A` | Botones principales, headers     |
| `primaryDark`   | `#C4500A` | Hover, pressed states            |
| `secondary`     | `#1A1A1A` | Fondos, navbars                  |
| `surface`       | `#1C1C1C` | Cards, panels                    |
| `success`       | `#2ECC71` | Cierre cuadrado ✅               |
| `warning`       | `#F1C40F` | Stock bajo, diferencias ⚠        |
| `error`         | `#E74C3C` | Errores, agotado 🔴              |

---

## 📱 Wireframes Flutter

Simulan pantallas de celular (390×844px) dentro de un frame de teléfono.
Funcionan en el navegador como React components.

### `pos-cajero.jsx`
- Grilla de productos por categoría
- Carrito con controles +/−
- Flujo Efectivo (cálculo de vuelto automático)
- Flujo SINPE (número destino)
- Flujo Tarjeta (instrucción datafono)
- Pantalla de confirmación con `asignacionId`

### `inventario-cierre.jsx`
**Dos teléfonos en pantalla:**
- **Izquierda:** Apertura de inventario (ingresar unidades por producto antes del partido)
- **Derecha:** Cierre de caja en 4 pasos — Resumen → Efectivo → SINPE/Tarjeta → Confirmar

### `mini-dashboard-gerente.jsx`
**4 vistas navegables:**
1. **Resumen** → total global LIVE, cards por puesto con sync status, acciones
2. **Selector de puesto** → elegir dónde vender (genera `asignacionId` del gerente)
3. **POS Gerente** → misma UI que el cajero (referencia a `pos-cajero.jsx`)
4. **Cierres** → lista de cierres pendientes con Aprobar / Rechazar

---

## 🖥️ Wireframes React

### `pos-cajero-web.jsx`
POS web mobile-first (PWA fallback para iOS o dispositivos sin Flutter).
Funcionalmente idéntico al Flutter — misma UX, misma lógica de `asignacionId`.

### `dashboard-gerente.jsx`
Dashboard completo del gerente (desktop-first):
- Tab **📊 Tiempo Real** → KPIs globales, cards por puesto, ranking productos, desglose pagos
- Tab **🔒 Cierres** → reconciliación esperado vs declarado, Aprobar/Rechazar
- Tab **📁 Historial** → partidos anteriores con estado de cierre

### `react-pages.jsx`
Dos páginas navegables via tab:
- **🛒 Productos** → tabla con edición inline de precios, toggle activo/inactivo, modal nuevo producto
- **📋 Reporte** → reporte completo del partido con KPIs, desglose por puesto y global

### `configuracion-sesion.jsx`
Flujo en 4 pasos para el gerente antes de cada sesión:
1. **Sesión** → tipo `partido` (estadio) o `turno` (restaurante) con sus datos
2. **Puestos** → seleccionar cuáles estarán activos
3. **Asignaciones** → por cada puesto: asignar vendedor + contexto (`gradas`/`mesa`/`caja`)
4. **Confirmar** → resumen + activar sesión → crea `asignaciones` en DynamoDB

---

## 🗄️ Modelo de datos resumido

```
sucursales → puestos → asignaciones → ventas
                           ↑               ↓
                        sesiones       cierres
                    (partido|turno)

asignaciones {
  id, userId, puestoId, sesionId,
  contexto: "gradas" | "mesa" | "caja"
}

ventas { id, asignacionId, items[], total, metodoPago, timestamp }
cierres { id, asignacionId, efectivoDecl, sinpeDecl, cardDecl, diferencia, estado }
```

---

*Generado: Abril 2026 | Pollos Porteños × Puntarenas FC 🦈🍗*

---

## 📊 Wireframes Reportería Analítica (Epic 5.5 · JCA-213 al JCA-220)

### `react/reporteria-analitica.jsx`
Dashboard de reportería completo para el gerente en desktop:

**Filtros globales** (persisten en todas las vistas):
- Período: presets (Hoy / Semana / Mes / Temporada) + rango de fechas personalizado
- Sucursal: Todas / Estadio / Restaurante
- Tipo de sesión: Todos / Partido / Turno
- Contexto: Todos / Gradas / Mesa / Caja
- Vendedor: dropdown con todos los usuarios activos
- Chips removibles de filtros activos + botón "Limpiar"

**4 vistas navegables:**
- **🏆 Por Producto** → tabla ordenable + drill-down por fila (contexto, sucursal, método de pago)
- **📅 Por Sesión** → gráfica de tendencia + tabla con estado de cierres, click → reporte completo
- **👤 Por Vendedor** → ranking con ticket promedio, método favorito, sesiones (solo gerente)
- **📍 Por Contexto** → comparativa Estadio vs Restaurante, desglose Gradas / Mesa / Caja

**Exportar:** botones Excel y PDF en el navbar, respetan filtros activos

### `flutter/reporteria-analitica-movil.jsx`
Versión móvil compacta — accesible desde el Mini Dashboard del gerente en Flutter o la PWA React.

**Filtros compactos:**
- Presets de período en fila de botones
- Dropdowns de Sucursal y Tipo en segunda fila

**4 tabs en bottom navigation:**
- **📊 Resumen** → KPIs globales, gráfica de barras, top 3 productos, desglose por contexto
- **🏆 Productos** → lista con barra de progreso, tap → drill-down (contexto, método de pago)
- **📅 Sesiones** → cards por sesión con estado de cierre
- **📍 Contexto** → comparativa sucursales y contextos con barras

---

*Actualizado: Abril 2026 — Wireframes completos incluyendo Reportería Analítica*
