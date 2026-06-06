# CSV Export — Productos vendidos

## Trigger
"CSV" button in `src/pages/dashboard/ReportePage.tsx` products table header.

## Implementation (browser-side, no dependencies)

```typescript
function exportCSV(products: ReportProduct[], sessionName: string) {
  const headers = ["Rank", "Producto", "Categoría", "Unidades", "Precio unitario", "Ingreso", "%"];
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);

  const rows = products.map((p, i) => [
    `#${i + 1}`,
    p.name,
    p.category ?? "",
    String(p.qty),
    String(p.price),
    String(p.revenue),
    `${totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : "0"}%`,
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];
  const safeName = sessionName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  a.href = url;
  a.download = `productos-${safeName}-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

## Fields
| Column | Source |
|--------|--------|
| Rank | Index + 1 |
| Producto | `p.name` |
| Categoría | `p.category` |
| Unidades | `p.qty` |
| Precio unitario | `p.price` |
| Ingreso | `p.revenue` |
| % | `p.revenue / totalRevenue` |

## Notes
- BOM prefix (`﻿`) ensures correct encoding in Microsoft Excel
- Cells with commas or quotes are properly escaped
