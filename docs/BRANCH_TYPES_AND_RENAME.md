# Branch-Type Personalization + Heritage Rename — BE/FE mapping

> **Context.** This POS was originally built for a soda (snack bar) selling at the Puntarenas
> stadium, so the codebase carries stadium-specific concepts ("Partido", "Stand vs Restaurante",
> "gradas/caja"). We are **not removing** the functionality — we are **generalizing** the naming so
> the product fits any business, and making **branch types configurable per organization** instead of
> a hardcoded two-value enum.
>
> The **frontend copy/labels have already been generalized** (see §3). The **data-model / enum-value
> renames and the configurable branch-type catalog require backend work** — this doc is the contract
> for that BE change so FE and BE stay in sync.

---

## 1. Branch types — make them personalizable (BE work)

### Today (hardcoded)
- FE: `src/types/branch.ts` → `export type BranchType = "stand" | "restaurant";`
- Used in: `components/puestos/BranchForm.tsx`, `BranchCard.tsx`, `BranchAdvancedFiltersModal.tsx`,
  `sections/BranchGeneralSection.tsx`, and the session flow (`SessionConfig.tsx`,
  `session/StationAssignments.tsx`, `session/InventoryTable.tsx`) which filters branches by `type`.
- Stored on the branch as `type: "stand" | "restaurant"` (cross-app-be `branches` table).
- Session creation maps session kind → branch type: event session → `stand`, regular → `restaurant`.

### Target (per-org configurable catalog)
Replace the burned enum with an **org-scoped Branch Type catalog**:

**New table** `branch_types` (cross-app-be):
| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `organization_id` | uuid FK | org-scoped |
| `code` | string | stable slug, unique per org (e.g. `kiosk`, `venue`) |
| `name` | string | display label (user-editable) |
| `icon` | string (nullable) | optional icon key from the FE `<Icon>` set |
| `color` | string (nullable) | optional CSS-var token name (e.g. `primary`, `info`) — NOT a hex |
| `is_active` | bool | soft-disable |
| `sort_order` | int | gallery/list order |
| `is_default` | bool (optional) | the type preselected in the branch form |

**Branch model change:** `branches.type` (enum) → `branches.branch_type_id` (FK → `branch_types.id`).
Keep a denormalized `branch_type_code`/`branch_type_name` on the branch response for convenient FE
rendering, or expand the relation in the branch DTO.

**Endpoints** (org-scoped, cross-app-be, `/api/organizations/{orgId}/branch-types`):
- `GET    /branch-types` — list (FE populates the form select + filters from this)
- `POST   /branch-types`
- `PUT    /branch-types/{id}`
- `DELETE /branch-types/{id}` (or `is_active=false`)

**Migration / seed:** for every existing org, seed two default rows preserving current behavior, and
backfill `branches.branch_type_id`:
- `stand` → `{ code: "kiosk", name: "Puesto" }` (was "Stand")
- `restaurant` → `{ code: "venue", name: "Local" }` (was "Restaurante")

**Session ↔ branch-type coupling (today):** `SessionConfig` hardcodes event→`stand`,
regular→`restaurant`. After personalization this filter should be **driven by data**, not the enum —
e.g. a session type carries an allowed `branch_type_code[]`, or the filter is removed and the user
picks any active branch. Decide during BE design; flag here so FE can update the session flow.

### Frontend follow-up (after the endpoint exists)
- Add `useBranchTypes(orgId)` hook (cross-app-be) + a `BranchType` shape `{ id, code, name, icon?, color? }`.
- `BranchForm`/`BranchGeneralSection`/`BranchCard`/`BranchAdvancedFiltersModal`: render the type
  selector + labels + color/icon from the fetched catalog instead of the literal `["stand","restaurant"]`.
- Optionally add a small "Branch types" manager UI (under Organization settings or Puestos) for CRUD.
- Remove the hardcoded `BranchType = "stand" | "restaurant"` union once all consumers read the catalog.

---

## 2. Session type & context value renames (BE work)

The session "type" and "context" carry stadium semantics. UI copy is already generalized; the
**stored values** should be renamed for a generic vocabulary:

| Concept | Current stored value | Proposed generic value | Where |
|---|---|---|---|
| Session kind (UI union) | `"partido"` / `"regular"` | `"event"` / `"standard"` | FE `SessionConfig`/`SessionTypeSelector`/`SessionPreview` (internal only) |
| Session `type` (API) | `"match"` / `"shift"` | `"event"` / `"shift"` (or `"standard"`) | cross-app-be sessions |
| Session `context` (API) | `"gradas"` / `"caja"` | `"floor"` / `"register"` (generic) | cross-app-be sessions |
| Session default name | `` `vs ${rival}` `` | keep as free-text name (drop "vs" default) | FE `SessionConfig` |

These are **API contract changes** — coordinate FE + BE together (or accept both old+new values during
a transition). Until then, FE keeps emitting the current values; only the **display copy** changed.

---

## 3. Heritage copy already generalized on the frontend (no BE impact)

Pure i18n value changes in `src/contexts/LanguageContext.tsx` (keys unchanged, both es+en):

| Key | Before (es) | After (es) |
|---|---|---|
| `session.match` | Partido | Evento |
| `session.matchDesc` | Ventas en estadio | Operación por evento |
| `session.regularDesc` | Operación restaurante | Operación regular |
| `session.matchTime` | Hora del partido | Hora del evento |
| `session.tabMatch` | Datos del partido | Datos del evento |
| `session.subtitle` | …nuevo **partido**… | …nueva **sesión**… |
| `dash.sessionSales` / `mobile.sessionSales` | Ventas del partido | Ventas de la sesión |
| `puestos.stand` | Stand | Puesto _(placeholder until §1 catalog)_ |
| `puestos.restaurant` | Restaurante | Local _(placeholder until §1 catalog)_ |

> Note: the i18n **keys** still read `match*` / `stand` / `restaurant` for now to avoid a wide rename;
> they can be renamed to `event*` / catalog-driven labels in a later cleanup once §1/§2 land.

---

## 4. Suggested rollout order
1. BE: add `branch_types` table + endpoints + seed/backfill (§1). **Non-breaking** (keep old enum
   readable during transition).
2. FE: `useBranchTypes` + swap the hardcoded selector/labels to the catalog; add the manager UI.
3. BE+FE together: rename session `type`/`context` values (§2) behind a transition window.
4. FE cleanup: rename the `match*`/`stand`/`restaurant` i18n **keys** and the internal
   `"partido"|"regular"` union to `event`/`standard`.
