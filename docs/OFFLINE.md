# Modo sin conexión (PWA)

> **Qué es esto.** Cómo la aplicación sigue funcionando sin red: qué se guarda,
> dónde, cuándo se llena y qué NO funciona. Léelo antes de agregar una pantalla
> que el cajero deba poder abrir sin señal.

---

## 1. El problema

El POS se usa en ferias, bodegas y locales con conexión intermitente. Antes de
este trabajo el modo sin conexión cubría **una sola cosa**: la cola de ventas en
IndexedDB. Todo lo demás —la grilla de productos, el buscador de clientes, los
catálogos de Hacienda que llenan cada `<select>` del detalle de línea— vivía en
memoria y desaparecía al recargar. Un cajero que perdía la señal se quedaba con
una pantalla vacía y una venta a medias.

## 2. Las cuatro capas

| Capa | Dónde | Qué guarda | Vida |
|---|---|---|---|
| **1. Shell** | Cache Storage (service worker) | HTML, JS y CSS de arranque, fuentes | Por build |
| **2. Catálogos de referencia** | localStorage (React Query persister) | Catálogos de Hacienda, contexto de cuenta | 7 días (`CATALOG_GC_TIME`) |
| **3. Catálogo de la organización** | IndexedDB (`db.products` / `categories` / `clients`) | Productos, categorías, clientes de la org | Hasta el próximo sync |
| **4. Bandeja de salida** | IndexedDB (`db.sales`) | Ventas y pedidos capturados sin conexión | Hasta que se envían |

Ninguna capa cachea respuestas de API en el service worker: están autenticadas,
y las capas 2-4 ya resuelven la lectura y la escritura con reglas que la app
entiende. Un 200 rancio servido por el worker sería peor que una falla limpia.

### 2.1 Shell — el service worker

`scripts/sw-template.js` + `scripts/generate-sw.mjs`, ejecutado por
`pnpm run build`. El generador lee `dist/.vite/manifest.json` y estampa los
nombres reales (con hash) de los archivos en `dist/sw.js`, junto con un
`BUILD_ID` que además nombra el cache: un build nuevo estrena cache y el
anterior se borra en `activate`.

Reglas, en orden:

1. **API** → sin cache, nunca.
2. **Navegaciones** → red primero, con el shell precacheado como respaldo. Red
   primero para que un despliegue se vea de inmediato; el respaldo es lo que
   permite abrir la app sin conexión.
3. **`/assets/*`** (con hash) → cache primero. El nombre contiene el hash del
   contenido, así que un acierto nunca puede estar rancio.
4. **Fuentes de Google** → *stale-while-revalidate*, para que la tipografía
   cargue sin red.

Se precachea el **grafo de imports estáticos** de cada entry (lo mismo que
`index.html` hace `modulepreload`). Las páginas de ruta son imports dinámicos y
NO se precachean: bajar la app entera en la primera visita para alguien que solo
usa el POS no vale la pena. Una página visitada queda en el runtime cache y
desde entonces abre sin conexión.

En dev, `public/sw.js` es un no-op deliberado — precachear URLs de módulos sin
hash solo pelearía con HMR.

> No se usó `vite-plugin-pwa`/workbox a propósito: la app necesita cuatro reglas
> y el stack está fijado (CLAUDE.md §11).

### 2.2 Catálogos de referencia — React Query + localStorage

`src/lib/queryClient.ts` deshidrata a localStorage solo las claves cuyo prefijo
está en `CATALOG_QUERY_KEY_PREFIXES` (catálogos de Hacienda: impuestos, tarifas,
identificaciones, unidades, condiciones de venta, medios de pago…) más
`PERSISTED_ACCOUNT_QUERY_KEY_PREFIXES` (organizaciones del usuario, información
fiscal, tema, permisos RBAC).

**Nunca se persiste `org-configurations`**: lleva el certificado `.p12`, su PIN y
la contraseña de ATV. Escribirlo a localStorage sería una regresión de
seguridad. Si agregás un prefijo nuevo, preguntate primero qué contiene.

`neighborhoods` también queda fuera: es el único nivel del cascade de ubicación
con miles de filas por país, y el persister escribe todo el cache como **una**
cadena de localStorage — desbordar la cuota rompería la persistencia entera, no
solo esa clave.

### 2.3 Catálogo de la organización — IndexedDB

`src/services/offlineCatalog.ts` mantiene espejos de productos, categorías y
clientes en `db`. Dos caminos de escritura:

- **Oportunista**: cada respuesta exitosa de `useProducts` / `useCategories` /
  `useClients` / `useClientSearch` refresca el espejo. El uso normal lo mantiene
  tibio sin pedir nada extra.
- **Explícito**: `syncOfflineCatalog(orgId)` recorre todas las páginas y borra
  lo que el servidor ya no devuelve (un producto desactivado en otro dispositivo
  no debe quedar en la grilla de este).

La lectura devuelve **el mismo sobre** que la API (`{ data, pagination }`), así
que los hooks no distinguen: solo caen al espejo cuando `isOfflineError(error)`
es verdadero — falla de red, timeout, 429 o 5xx. Un 403 o un 404 **no** cae al
cache: ahí el servidor está respondiendo, y servir una copia local escondería un
permiso revocado o un recurso borrado detrás de datos que el usuario ya no debe
ver (`src/lib/offline.ts`).

Búsqueda sin conexión: `searchName` guarda el nombre en minúsculas y sin
acentos, así que "cafe" encuentra "Café" igual que el `ILIKE` del servidor.
Los filtros compuestos del BE (`status:1,(client_name:ana,…)`) se interpretan con
`plainSearchTerm` / `plainStatusFilter` — un match degradado es mejor que una
lista vacía.

### 2.4 Bandeja de salida — ventas y pedidos

`db.sales` es la bandeja de salida. Cada registro nombra su `target`
(`"sales"` o `"orders"`) y `pendingSalesSync` elige el cliente HTTP a partir de
eso. Un registro sin `target` viene de antes del esquema v3 y es una venta.

Se persiste **antes** de intentar el POST, con una `Idempotency-Key` estable
(`localId`) que se reusa en cada reintento. Un fallo reintentable deja el
registro en `pending`; uno permanente (4xx que no sea 408/429) lo marca
`failed` para revisión en vez de reintentar para siempre.

## 3. La precarga al iniciar sesión

`src/services/offlineBootstrap.ts`, montado por `useOfflineBootstrap()` en
`DashboardLayout`.

Trae de una vez, **mientras hay conexión**: todos los catálogos de Hacienda que
la app usa, los montos por tipo de impuesto especial (03/04/05/06), las
organizaciones del usuario y el catálogo completo de la organización.

Tres precondiciones antes de arrancar:

1. Usuario y organización resueltos.
2. `documentVersionId` resuelto. Varios catálogos están versionados y el cliente
   inyecta ese id; precargar antes cachearía la respuesta equivocada bajo la
   clave que los hooks leen.
3. Conexión. Sin ella espera al evento `online`.

Corre **una vez por organización por día** (`OFFLINE_BOOTSTRAP_TTL`, igual que
`CATALOG_STALE_TIME`) mediante una marca en localStorage. Un paso que falla no
aborta los demás —cobertura parcial es mejor que ninguna— pero la marca solo se
escribe si **todos** pasaron, así que la próxima sesión reintenta.

Mientras corre, `useSync()` reporta `"preparing"` y el `SyncPill` lo muestra.
Una venta en cola tiene prioridad sobre ese estado: lo pendiente es del usuario,
la descarga es nuestra.

> **Clave por clave.** Cada paso usa exactamente la clave de su hook
> (`['taxes', { iso_code }]`, `['customerTypes', undefined]`, …). Una clave que
> no calce calienta una entrada que nadie lee — y no falla ruidosamente. Si
> cambiás los parámetros de un `useAll*`, actualizá `buildBootstrapSteps`.

## 4. Qué funciona y qué no

**Funciona sin conexión** (después de una sesión con red):

- Abrir la app y navegar a páginas ya visitadas.
- Grilla de productos, categorías, buscador de clientes, lista de clientes.
- Todo el detalle de línea: impuestos, tarifas, descuentos, unidades, CABYS ya
  cargado en el producto.
- Capturar una venta o un pedido manual completo; queda en cola y se envía solo.

**No funciona sin conexión:**

- Iniciar sesión (Cognito necesita red).
- Búsqueda CABYS (`useCabysSearch`) — es una búsqueda del servidor, sin espejo.
- Niveles bajos del cascade de ubicación no visitados (`neighborhoods`).
- Tipo de cambio del día, reporte de IVA, documentos electrónicos: todos
  dependen del servidor por definición.
- La validación ante Hacienda de una venta encolada: ocurre cuando se envía.

## 5. Pendientes

- [ ] Cachear la imagen de producto (`image_url`) para que la grilla no muestre
      huecos sin conexión — hoy solo se cachea si el navegador ya la pidió.
- [ ] Una pantalla de "datos sin conexión" que muestre frescura por espejo y
      permita forzar `refresh()` del bootstrap.
- [ ] Reintento con backoff en la bandeja de salida (hoy reintenta al volver la
      conexión y al montar).
