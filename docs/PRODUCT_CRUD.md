# Product CRUD — Create & Edit

## Trigger
- "Nuevo producto" button in `ProductsPage.tsx` header → opens drawer in create mode
- Edit icon button on product card/row → opens drawer in edit mode pre-filled

## UI: Slide-in Drawer (right side, 420px wide)
```
[ Overlay (click to close) ] [ Drawer slides in from right ]
```

Drawer contents:
- Header: "Nuevo producto" / "Editar producto" + close button
- Form fields (vertical stack)
- Footer: Cancel + Guardar

### Form fields
| Field | Type | Required |
|-------|------|----------|
| Nombre | text | ✅ |
| Descripción | textarea | |
| Precio (₡) | number | ✅ |
| Categoría | select (from org categories) | |
| Emoji | text (single char picker) | |
| SKU | text | |
| Rastrear inventario | toggle | |
| Stock mínimo (lowStockThreshold) | number (shown if trackInventory) | |

## State
```typescript
const [drawerProduct, setDrawerProduct] = useState<Product | null | "new">(null);
// null = closed, "new" = create mode, Product = edit mode
```

## API calls

### Create
```
POST ordersOrgPath(org.id, "/products")
Body: { name, description, price, categoryId, emoji, sku, trackInventory, lowStockThreshold }
```

### Update
```
PATCH ordersOrgPath(org.id, `/products/${product.id}`)
Body: (same fields, only changed ones)
```

## Implementation sketch
```tsx
{drawerProduct !== null && (
  <>
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200 }}
         onClick={() => setDrawerProduct(null)} />
    <div className="slide-right" style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 420, background: "hsl(var(--card))", zIndex: 201, display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <CardTitle>{drawerProduct === "new" ? "Nuevo producto" : "Editar producto"}</CardTitle>
        <Button variant="ghost" size="xs" icon="close" onClick={() => setDrawerProduct(null)} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {/* form fields */}
      </div>
      <div style={{ padding: "16px 24px", borderTop: "1px solid hsl(var(--border))", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="outline" onClick={() => setDrawerProduct(null)}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave}>Guardar</Button>
      </div>
    </div>
  </>
)}
```

## Notes
- The `.slide-right` animation is defined in `index.css` as `slideRight`
- Invalidate `["products", org.id]` on success
- Categories should be fetched from `ordersOrgPath(org.id, "/categories")`
- Emoji field: simple text input limited to 2 chars, or a small emoji picker grid
