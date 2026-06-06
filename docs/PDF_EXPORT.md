# PDF Export — Reporte de Partido

## Trigger
"Descargar PDF" button in `src/pages/dashboard/ReportePage.tsx` header.

## Approach: html2canvas + jsPDF

```bash
npm install html2canvas jspdf
```

### Implementation
```typescript
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

async function downloadPDF(sessionName: string) {
  const reportEl = document.getElementById("report-content");
  if (!reportEl) return;

  const canvas = await html2canvas(reportEl, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = (canvas.height * pageWidth) / canvas.width;
  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);

  const date = new Date().toISOString().split("T")[0];
  const safeName = sessionName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  pdf.save(`reporte-${safeName}-${date}.pdf`);
}
```

### Steps
1. Wrap the report body in `<div id="report-content">` (exclude the action buttons row)
2. Button onClick calls `downloadPDF(session.name)`
3. Show a spinner while generating (html2canvas is async)

### Filename pattern
`reporte-{session-name-slugified}-{YYYY-MM-DD}.pdf`

### Notes
- Use `scale: 2` for retina-quality output
- Exclude header buttons from capture by adding `data-html2canvas-ignore` attribute
- If the report spans multiple pages, iterate `pdf.addPage()` and slice the canvas
