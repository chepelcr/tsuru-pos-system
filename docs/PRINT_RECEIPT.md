# Print Receipt

## Trigger
"Imprimir" button on the CartSheet "done" step (`src/pages/pos/POSPage.tsx`).

## Implementation

Call `window.print()` after injecting a receipt-formatted `<div id="receipt">` into the DOM.

### Receipt content
- Organization logo / name
- Order number (generated at sale time)
- Date and time
- Puesto name + cashier name
- Item list: name · quantity · unit price · line total
- Subtotal
- Payment method
- Amount paid (if cash)
- Change returned (if cash)
- Total in bold
- Footer: "Gracias por su visita — Pollos Porteños"

### Print stylesheet (`@media print`)
```css
@media print {
  body > *:not(#receipt) { display: none !important; }
  #receipt {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    width: 80mm;
    padding: 8px;
    color: #000;
    background: #fff;
  }
  #receipt .divider { border-top: 1px dashed #000; margin: 6px 0; }
  #receipt .total { font-size: 18px; font-weight: bold; }
}
```

### Steps
1. Build receipt HTML string from sale data (order number, items, total, method, change)
2. Insert into `<div id="receipt" style="display:none">` appended to `document.body`
3. Call `window.print()`
4. Remove the `#receipt` div after `window.afterprint` fires (or a 2s timeout)

### Data source
`handleConfirmPayment` already builds the complete sale payload — pass it to a `printReceipt(sale)` utility function.
