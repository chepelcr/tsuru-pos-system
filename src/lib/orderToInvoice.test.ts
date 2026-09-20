import { describe, expect, it } from "vitest";
import {
  cartItemsFromOrder,
  checkoutClientFromOrder,
  checkoutDataFromOrder,
  isOrderInvoiced,
} from "./orderToInvoice";
import type { Order, OrderLine } from "@/types/order";

function line(overrides: Partial<OrderLine>): OrderLine {
  return {
    line_number: 1,
    internal_code: "",
    code: "",
    client_article_code: "",
    description: "Café molido",
    units_per_box: 1,
    quantity_ordered: 2,
    units_ordered: 2,
    unit_price: 3500,
    discount: 0,
    line_total: 7000,
    tax: 0,
    quantity_dispatched: 0,
    dispatch_rejection_reason: null,
    quantity_received: 0,
    article_code: "",
    ...overrides,
  };
}

function order(overrides: Partial<Order> = {}): Order {
  return {
    order_id: 1,
    company_id: "org-1",
    document_number: "PM-000007",
    document_type: "PM",
    order_type: "",
    creation_date: "",
    delivery_date: "",
    order_status: "delivered",
    client: { name: "Pulpería La Esquina", gln: "" },
    supplier: { name: "", gln: "" },
    delivery_location: { code: "", name: "", gln: "" },
    event: "",
    department: null,
    comment: "",
    line_count: 1,
    total_quantities: 2,
    subtotal: 7000,
    discounts: 0,
    net_total: 7000,
    taxes: 0,
    grand_total: 7000,
    bgm011: null,
    attachments: {},
    lines: [line({ product_id: "p1" })],
    order_totals: {
      total_lines: 1,
      total_quantity_ordered: 2,
      total_units_ordered: 2,
      total_quantity_dispatched: 0,
      total_quantity_received: 0,
      subtotal: 7000,
      net_total: 7000,
      grand_total: 7000,
    },
    ...overrides,
  } as Order;
}

describe("cartItemsFromOrder", () => {
  it("bills the ORDER's own lines, with no catalog lookup", () => {
    // The order carries everything a document needs. Rebuilding from the
    // catalog would re-price a delivered sale at today's terms, and would drop
    // any line whose product was missing from the offline cache — which is how
    // a checkout opened showing a total of zero.
    const items = cartItemsFromOrder(
      order({
        lines: [
          line({
            product_id: "p1",
            cabys: "2301101000000",
            net_price: 3000,
            quantity_ordered: 4,
          }),
        ],
      })
    );

    expect(Object.keys(items)).toEqual(["p1"]);
    expect(items.p1.qty).toBe(4);
    expect(items.p1.product.price).toBe(3000);
    expect(items.p1.lineDetail?.cabys).toBe("2301101000000");
  });

  it("keeps a line with no product id instead of dropping it", () => {
    // A hand-captured line need not be a catalog product at all, and it still
    // has to be billable.
    const items = cartItemsFromOrder(
      order({ lines: [line({ product_id: undefined, line_number: 3 })] })
    );
    expect(Object.keys(items)).toEqual(["line-3"]);
    expect(items["line-3"].qty).toBe(2);
  });

  it("falls back to unit_price when the line has no net price", () => {
    const items = cartItemsFromOrder(
      order({ lines: [line({ product_id: "p1", net_price: null })] })
    );
    expect(items.p1.product.price).toBe(3500);
  });

  it("folds repeated products but keeps the FIRST line's fiscal detail", () => {
    // Merging two different tax structures would misdeclare; adding two
    // quantities is safe.
    const items = cartItemsFromOrder(
      order({
        lines: [
          line({ product_id: "p1", cabys: "1111111111111", quantity_ordered: 2 }),
          line({ line_number: 2, product_id: "p1", cabys: "9999999999999", quantity_ordered: 3 }),
        ],
      })
    );
    expect(items.p1.qty).toBe(5);
    expect(items.p1.lineDetail?.cabys).toBe("1111111111111");
  });

  it("skips lines with no quantity", () => {
    const items = cartItemsFromOrder(
      order({ lines: [line({ product_id: "p1", quantity_ordered: 0, units_ordered: 0 })] })
    );
    expect(items).toEqual({});
  });

  it("translates the stored tax shape into the one the cart engines read", () => {
    // The BE stores the canonical product shape; the cart reads the document
    // shape. A missed translation here means the line is taxed at no rate.
    const items = cartItemsFromOrder(
      order({
        lines: [
          line({
            product_id: "p1",
            taxes: [
              { tax_type_id: "01", tax_rate: { percentage: 13, code: "08" } },
            ],
            discounts: [{ discount_type_id: "07", amount: 250 }],
          }),
        ],
      })
    );

    expect(items.p1.lineDetail?.taxes).toEqual([
      {
        code: "01",
        rate: 13,
        rate_code: "08",
        other_tax_type: undefined,
        special_fields: undefined,
      },
    ]);
    expect(items.p1.lineDetail?.discounts).toEqual([
      {
        discount_type: "07",
        percentage: undefined,
        amount: 250,
        reason: undefined,
      },
    ]);
  });
});

describe("checkoutClientFromOrder", () => {
  it("carries the identification, which is what keys the chain card", () => {
    const client = checkoutClientFromOrder(
      order({
        client_id: "c-1",
        client: {
          name: "Walmart",
          gln: "",
          identification: { code: "02", number: "3-102-007223" },
        },
      })
    );
    expect(client?.client_id).toBe("c-1");
    expect(client?.identification?.number).toBe("3-102-007223");
  });

  it("is null when the order names no client at all", () => {
    expect(
      checkoutClientFromOrder(order({ client_id: null, client: { name: "", gln: "" } }))
    ).toBeNull();
  });
});

describe("checkoutDataFromOrder", () => {
  it("seeds the note and the machine-readable order reference", () => {
    const data = checkoutDataFromOrder(
      order({ document_number: "PM-000123", source: "manual" }),
    );
    expect(data.notes).toBe("Pedido #PM-000123");
    // What the document-validator reads to link the order once Hacienda rules.
    expect(data.order_ref).toEqual({
      document_number: "PM-000123",
      source: "manual",
    });
  });

  it("gives an ordinary customer's pedido NO chain block", () => {
    // The regression this exists for. `purchase_order_number` used to be set
    // from `document_number` unconditionally, and the "does it carry anything?"
    // test then always passed — so every order produced a chain block, and a
    // plain pedido for a walk-in customer shipped Walmart's `WMNumeroOrden` on
    // its signed XML.
    const data = checkoutDataFromOrder(order({ document_number: "PM-000123" }));
    expect(data.chain_info).toBeUndefined();
  });

  it("keeps the purchase-order number for a real chain order", () => {
    // An order imported from a chain's spreadsheet. Its client has no cédula —
    // the file has no such column — so the registry cannot match it; the GLN on
    // the delivery point is what identifies it as a chain order.
    const data = checkoutDataFromOrder(
      order({
        document_number: "4500123456",
        delivery_location: { code: "S-1", name: "CD Coyol", gln: "7441234567890" },
      }),
    );
    expect(data.chain_info?.purchase_order_number).toBe("4500123456");
    expect(data.chain_info?.gln).toBe("7441234567890");
  });

  it("does not treat a free-text delivery label as a chain", () => {
    // A manual pedido can name a delivery point the client never registered.
    // That is not a chain, and must not produce WM* fields.
    const data = checkoutDataFromOrder(
      order({ delivery_location: { code: "", name: "Casa de doña Ana", gln: "" } }),
    );
    expect(data.chain_info).toBeUndefined();
  });

  it("reuses the order's currency rather than re-quoting at today's rate", () => {
    const data = checkoutDataFromOrder(
      order({ currency_code: "USD", exchange_rate: 512.5 })
    );
    expect(data.currency).toEqual({ currency_code: "USD", exchange_rate: 512.5 });
  });

  it("omits the currency when the order was priced in the base one", () => {
    expect(checkoutDataFromOrder(order()).currency).toBeUndefined();
  });

  it("carries the vendor number the backend resolved from the department", () => {
    // `WMNumeroVendedor` comes from this. It used to be absent here entirely:
    // the mapping read the department's CODE and not its `supplier_code`, so the
    // value only appeared once the departments list had loaded and the
    // code→id back-fill had written it — and on a document composed before that
    // landed, the chain got an invoice missing a field it requires.
    const data = checkoutDataFromOrder(
      order({ department: { department_code: "0042", name: "Textiles", supplier_code: "778899" } }),
    );
    expect(data.chain_info?.supplier_code).toBe("778899");
    expect(data.chain_info?.department_code).toBe("0042");
  });

  it("tolerates the plain-string department the Excel import writes", () => {
    const data = checkoutDataFromOrder(order({ department: "0042" }));
    expect(data.chain_info?.department_code).toBe("0042");
    // No structured row, so no vendor number to read — the back-fill resolves it.
    expect(data.chain_info?.supplier_code).toBeUndefined();
  });
});

describe("isOrderInvoiced", () => {
  it("is true once a sale is linked", () => {
    expect(isOrderInvoiced(order({ document_id: "s-1" }))).toBe(true);
    expect(
      isOrderInvoiced(
        order({ document_info: { consecutive_number: "00100001010000000001" } })
      )
    ).toBe(true);
  });

  it("is false again once Hacienda rejects the document", () => {
    // Nothing was legally billed, so a corrected document has to be issuable.
    // The link stays on the order — it records which document was refused.
    expect(
      isOrderInvoiced(
        order({ document_id: "s-1", document_info: { status: 3 } }),
      ),
    ).toBe(false);
  });

  it("stays true while the document is still in flight", () => {
    // The whole point of claiming at emission: the second factura is blocked
    // before Hacienda has answered, not after.
    expect(
      isOrderInvoiced(
        order({ document_id: "s-1", document_info: { status: 0 } }),
      ),
    ).toBe(true);
  });

  it("is false for an order that has not been billed", () => {
    expect(isOrderInvoiced(order())).toBe(false);
    expect(isOrderInvoiced(order({ document_id: null }))).toBe(false);
    // Issued, but Hacienda has not ruled yet: the link is written on the
    // verdict, so the order is still billable until then.
    expect(isOrderInvoiced(order({ document_info: null }))).toBe(false);
  });
});

describe("the order line carries the whole document line", () => {
  it("passes the fields an invoice cannot derive from anything else", () => {
    // Each of these was previously lost between the pedido and the factura, and
    // had to be guessed back from the catalog — which may have moved since the
    // customer agreed to the order.
    const items = cartItemsFromOrder(
      order({
        lines: [
          line({
            product_id: "p1",
            unit_measure: "kg",
            commercial_unit_measure: "Saco de 25",
            customs_part: "1006.30.00",
            base_amount: 5000,
            iva_collected_factory: "01",
          }),
        ],
      })
    );

    const detail = items.p1.lineDetail;
    // Hacienda requires UnidadMedida on every line; without this the invoice
    // falls back to "Unid", which misdeclares anything sold by weight.
    expect(detail?.unit_measure).toBe("kg");
    expect(detail?.commercial_unit_measure).toBe("Saco de 25");
    expect(detail?.customs_part).toBe("1006.30.00");
    // The two editable-base fields travel together: the base is only legal
    // BECAUSE the line is factory-collected.
    expect(detail?.base_amount).toBe(5000);
    expect(detail?.iva_collected_factory).toBe("01");
  });

  it("prefers the LINE's own codes over the product's", () => {
    // A chain assigns its own buyer article code, and the catalog product's
    // array holds only whatever the most recent import wrote — so two customers
    // ordering the same product overwrite each other there.
    const items = cartItemsFromOrder(
      order({
        lines: [
          line({
            product_id: "p1",
            internal_code: "STALE-INT",
            client_article_code: "STALE-WM",
            codes: [
              { code_type_id: "04", number: "INT-1" },
              { code_type_id: "02", number: "WM-777" },
            ],
          }),
        ],
      })
    );

    expect(items.p1.lineDetail?.codes).toEqual([
      { code_type: "04", number: "INT-1" },
      { code_type: "02", number: "WM-777" },
    ]);
  });

  it("falls back to the flattened codes for a row written before the column existed", () => {
    const items = cartItemsFromOrder(
      order({
        lines: [
          line({
            product_id: "p1",
            internal_code: "INT-1",
            code: "MFR-9",
            client_article_code: "WM-777",
            codes: null,
          }),
        ],
      })
    );

    expect(items.p1.product.codes).toEqual([
      { code_type_id: "04", number: "INT-1" },
      { code_type_id: "03", number: "MFR-9" },
      { code_type_id: "02", number: "WM-777" },
    ]);
  });
});

describe("cartItemsFromOrder — the fiscal structure an order carries", () => {
  it("derives the rate code when the order line inherited a null one", () => {
    // The reported failure: an imported line copies the product's taxes, and
    // the product's `tax_rate.code` is routinely null, so billing the pedido
    // died on `tax.rate_code is required when tax.code='01'`.
    const items = cartItemsFromOrder(
      order({
        lines: [
          line({
            product_id: "p1",
            taxes: [{ tax_type_id: "01", tax_rate: { percentage: 13, code: undefined } }],
          }),
        ],
      })
    );
    expect(items.p1.lineDetail?.taxes?.[0].rate_code).toBe("08");
  });

  it("carries the IVARBU factor onto the invoice line", () => {
    const items = cartItemsFromOrder(
      order({
        lines: [
          line({
            product_id: "p1",
            taxes: [
              {
                tax_type_id: "08",
                tax_rate: { percentage: 13, code: "08" },
                tax_factor: { id: "01", factor: 0.058 },
              },
            ],
          }),
        ],
      })
    );
    expect(items.p1.lineDetail?.taxes?.[0].factor).toBe(0.058);
  });

  it("flattens the nested per-unit amount so an excise still prices", () => {
    const items = cartItemsFromOrder(
      order({
        lines: [
          line({
            product_id: "p1",
            taxes: [
              {
                tax_type_id: "04",
                special_fields: {
                  quantity: 0.355,
                  percentage: 4.5,
                  tax_amount: { id: "14", amount: 3.66 },
                },
              },
            ],
          }),
        ],
      })
    );
    expect(items.p1.lineDetail?.taxes?.[0].special_fields).toMatchObject({
      tax_amount_id: 14,
      tax_unit_amount: 3.66,
    });
  });

  it("drops a tax row with no type instead of declaring it IVA", () => {
    const items = cartItemsFromOrder(
      order({
        lines: [
          line({
            product_id: "p1",
            taxes: [{ tax_rate: { percentage: 13, code: "08" } }],
          }),
        ],
      })
    );
    expect(items.p1.lineDetail?.taxes).toBeUndefined();
  });

  it("drops a discount with no nature instead of calling it commercial", () => {
    // 01/03 make the ISSUER absorb the line's IVA; 07 does not. Guessing
    // between them changes who Hacienda is told paid the tax.
    const items = cartItemsFromOrder(
      order({
        lines: [line({ product_id: "p1", discounts: [{ amount: 250 }] })],
      })
    );
    expect(items.p1.lineDetail?.discounts).toBeUndefined();
  });

  it("keeps a discount that does carry its nature, reason included", () => {
    const items = cartItemsFromOrder(
      order({
        lines: [
          line({
            product_id: "p1",
            discounts: [{ discount_type_id: "99", amount: 250, reason: "Acuerdo comercial" }],
          }),
        ],
      })
    );
    expect(items.p1.lineDetail?.discounts).toEqual([
      { discount_type: "99", amount: 250, reason: "Acuerdo comercial" },
    ]);
  });
});
