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
  it("seeds the note and the chain's purchase-order number", () => {
    const data = checkoutDataFromOrder(order({ document_number: "4500123456" }));
    expect(data.notes).toBe("Pedido #4500123456");
    expect(data.chain_info?.purchase_order_number).toBe("4500123456");
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
});

describe("isOrderInvoiced", () => {
  it("is true once a sale is linked", () => {
    expect(isOrderInvoiced(order({ invoice: { sale_id: "s-1" } }))).toBe(true);
    expect(
      isOrderInvoiced(order({ invoice: { consecutive_number: "00100001010000000001" } }))
    ).toBe(true);
  });

  it("is false for an order that has not been billed", () => {
    expect(isOrderInvoiced(order())).toBe(false);
    expect(isOrderInvoiced(order({ invoice: null }))).toBe(false);
  });
});
