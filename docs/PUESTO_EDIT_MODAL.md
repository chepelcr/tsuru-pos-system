# Puesto Edit Modal

## Trigger
"Editar" button on each branch row in `SessionConfig.tsx` → "Puestos y asignaciones" tab.

## UI
Slide-in modal (overlay + centered card, max-width 480px) with:
- Title: "Editar puesto" + branch name
- Form fields:
  - **Nombre** (text input, required)
  - **Ubicación** (text input, e.g. "Gradas sur")
  - **Cajero** (select from org members, required)
  - **Cocinero** (select from org members, optional — "Sin cocinero" option)
  - **Rol del cajero** (select: Cajero / Supervisor)
- Footer: Cancel + Guardar cambios buttons

## State
```typescript
const [editingBranch, setEditingBranch] = useState<string | null>(null);
```
Open: `setEditingBranch(branch.branch_id)`
Close: `setEditingBranch(null)`

## API

### PATCH assignment (update existing)
```
PATCH /api/users/:userId/organization/:orgId/assignments/:assignmentId
Body: { user_id, role }
```

### PATCH branch metadata
```
PATCH crossAppOrgPath(org.id, `/branches/${branchId}`)
Body: { name, location }
```

## Implementation sketch
```tsx
{editingBranch && (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Card style={{ width: 480, padding: 24 }} className="fade-up">
      <CardTitle>Editar puesto</CardTitle>
      {/* form fields */}
      <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
        <Button variant="outline" onClick={() => setEditingBranch(null)}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave}>Guardar cambios</Button>
      </div>
    </Card>
  </div>
)}
```

## Notes
- Close on overlay click and Escape key
- Show loading spinner on Guardar while mutation is pending
- Invalidate `["branches", org.id]` query on success
