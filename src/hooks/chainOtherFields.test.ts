import { describe, expect, it } from 'vitest';
import { chainOtherFields, orderOtherFields } from './useCartFlow';
import type { ChainClientInfo, OrderReference } from '@/types/order';

/**
 * The OtroTexto codes are a WIRE CONTRACT with the retail chain, not internal
 * naming. Walmart matches on the code string, so a rename here means it silently
 * cannot find the field on a document it already accepted — the failure surfaces
 * in their reconciliation, not in ours.
 *
 * These were once `ordenCompra` / `departamento` / `puntoEntrega` / `gln`, names
 * we invented; the chain reads exactly the three below.
 */
describe('chainOtherFields', () => {
  const full: ChainClientInfo = {
    supplier_code: '887766',
    gln: '7441234500001',
    purchase_order_number: 'PO-98765',
    department_id: 'dept-uuid',
    department_code: '0234',
    store_id: 'store-uuid',
    store_code: 'T-12',
    store_name: 'Escazú',
  };

  it('emits exactly the three codes Walmart reads', () => {
    expect(chainOtherFields(full)).toEqual([
      { code: 'WMNumeroVendedor', other_text: '887766' },
      { code: 'WMEnviarGLN', other_text: '7441234500001' },
      { code: 'WMNumeroOrden', other_text: 'PO-98765' },
    ]);
  });

  it('does not send department_code or store_code', () => {
    // The delivery point is identified by its GLN; a second identifier for the
    // same thing is redundant on a fiscal document (owner decision 2026-09-18).
    const codes = chainOtherFields(full).map((entry) => entry.code);
    expect(codes).not.toContain('departamento');
    expect(codes).not.toContain('puntoEntrega');
    expect(codes).not.toContain('ordenCompra');
    expect(codes).not.toContain('gln');
  });

  it('omits empty values rather than sending blank entries', () => {
    expect(chainOtherFields({ purchase_order_number: 'PO-1' })).toEqual([
      { code: 'WMNumeroOrden', other_text: 'PO-1' },
    ]);
    expect(chainOtherFields({ supplier_code: '   ' })).toEqual([]);
    expect(chainOtherFields({})).toEqual([]);
    expect(chainOtherFields(undefined)).toEqual([]);
  });

  it('trims whatever the form captured', () => {
    expect(chainOtherFields({ purchase_order_number: '  PO-2  ' })).toEqual([
      { code: 'WMNumeroOrden', other_text: 'PO-2' },
    ]);
  });
});

describe("the three GLNs on an order are not interchangeable", () => {
  /**
   * An order carries three, and only one belongs in `WMEnviarGLN`:
   *
   *   client.gln                  the CUSTOMER — the chain as a legal entity
   *   organization.gln            US, the supplier
   *   delivery_location.gln       the DELIVERY POINT — the store shipped to
   *
   * `WMEnviarGLN` is the ship-to, so it is the third. Sending the customer's
   * would identify the chain's head office as the delivery address, which is
   * both wrong and plausible enough to survive review — the value is a
   * well-formed GLN either way.
   */
  it("emits the delivery point's GLN, not the customer's", () => {
    const fields = chainOtherFields({
      gln: "7441234500017",              // delivery point
      supplier_code: "778899",
      purchase_order_number: "4500123456",
    });
    const shipTo = fields.find((f) => f.code === "WMEnviarGLN");
    expect(shipTo?.other_text).toBe("7441234500017");
  });

  it("carries no GLN at all when no delivery point is chosen", () => {
    // Better absent than filled from the customer: a missing field is a
    // rejection that names itself, a wrong one is a delivery to the wrong place.
    const fields = chainOtherFields({ supplier_code: "778899" });
    expect(fields.some((f) => f.code === "WMEnviarGLN")).toBe(false);
  });
});

/**
 * Our own codes, for the same fact under a name we control.
 *
 * `WMNumeroOrden` is Walmart's and is emitted only for a chain client. It used
 * to be the ONLY place an order number reached a document, and every order
 * produced one — so an ordinary pedido carried a Walmart field. These are the
 * internal equivalents, and `TsuruNumeroPedido` is what sales-be's
 * document-validator reads to know which order an accepted document billed.
 */
describe('orderOtherFields', () => {
  const ref: OrderReference = { document_number: 'PM-000123', source: 'manual' };

  it('emits the order number and its source under our codes', () => {
    expect(orderOtherFields(ref)).toEqual([
      { code: 'TsuruNumeroPedido', other_text: 'PM-000123' },
      { code: 'TsuruOrigenPedido', other_text: 'manual' },
    ]);
  });

  it('emits nothing for a sale that bills no order', () => {
    // A walk-in sale rung up at the till. Most documents are this.
    expect(orderOtherFields(undefined)).toEqual([]);
    expect(orderOtherFields({})).toEqual([]);
  });

  it('omits an empty value rather than sending a blank OtroTexto', () => {
    expect(orderOtherFields({ document_number: 'PM-000123', source: '   ' })).toEqual([
      { code: 'TsuruNumeroPedido', other_text: 'PM-000123' },
    ]);
  });

  it('trims, because the code is matched but the text is read', () => {
    expect(orderOtherFields({ document_number: '  PM-000123  ' })[0].other_text)
      .toBe('PM-000123');
  });

  it('uses only the chain number when Walmart fields are present', () => {
    // A chain order emits one reference and keeps its origin.
    const chain = chainOtherFields({ purchase_order_number: '4500123456' });
    const ours = orderOtherFields({ document_number: '4500123456', source: 'import' }, { purchase_order_number: '4500123456' });
    const codes = [...chain, ...ours].map((f) => f.code);
    expect(codes).toContain('WMNumeroOrden');
    expect(codes).not.toContain('TsuruNumeroPedido');
    expect(codes).toContain('TsuruOrigenPedido');
  });
});
