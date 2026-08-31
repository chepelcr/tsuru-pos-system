import { describe, expect, it } from "vitest";
import {
  buildInvoiceTabFromOrder,
  isOrderInvoiced,
  orderProductIds,
} from "./orderToInvoice";
import type { Order, OrderLine } from "@/types/order";
import type { Product } from "@/types";

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

const product = { product_id: "p1", name: "Café molido", price: 3500, image_url: null, status: 1 } as Product;

describe("building an invoice from an order", () => {
  it("rebuilds the cart from catalog products", () => {
    const draft = buildInvoiceTabFromOrder(order(), "01", new Map([["p1", product]]));

    expect(draft.matchedLines).toBe(1);
    expect(draft.unmatchedLines).toHaveLength(0);
    expect(draft.tab.doc_type).toBe("01");
    expect(draft.tab.cart_items?.p1).toMatchObject({ qty: 2 });
    expect(draft.tab.cart_items?.p1.product).toBe(product);
  });

  it("reports lines it cannot match instead of faking a product", () => {
    const withUnknown = order({
      lines: [line({ product_id: "p1" }), line({ line_number: 2, product_id: "gone" })],
    });

    const draft = buildInvoiceTabFromOrder(withUnknown, "01", new Map([["p1", product]]));

    expect(draft.matchedLines).toBe(1);
    expect(draft.unmatchedLines).toHaveLength(1);
    expect(Object.keys(draft.tab.cart_items ?? {})).toEqual(["p1"]);
  });

  it("skips lines with no product_id at all", () => {
    const draft = buildInvoiceTabFromOrder(
      order({ lines: [line({})] }),
      "01",
      new Map([["p1", product]]),
    );

    expect(draft.matchedLines).toBe(0);
    expect(draft.unmatchedLines).toHaveLength(1);
  });

  it("folds repeated products into one cart line", () => {
    const repeated = order({
      lines: [
        line({ product_id: "p1", quantity_ordered: 2 }),
        line({ line_number: 2, product_id: "p1", quantity_ordered: 3 }),
      ],
    });

    const draft = buildInvoiceTabFromOrder(repeated, "01", new Map([["p1", product]]));

    expect(draft.tab.cart_items?.p1.qty).toBe(5);
    expect(draft.matchedLines).toBe(2);
  });

  it("carries the order number into the document notes", () => {
    const draft = buildInvoiceTabFromOrder(order(), "01", new Map([["p1", product]]));
    expect(draft.tab.data?.notes).toContain("PM-000007");
  });

  it("selects the catalog client only when the order carries one", () => {
    expect(buildInvoiceTabFromOrder(order(), "01", new Map()).tab.selected_client).toBeNull();

    const withClient = buildInvoiceTabFromOrder(
      order({ client_id: "c1" }),
      "01",
      new Map(),
    );
    expect(withClient.tab.selected_client).toMatchObject({
      client_id: "c1",
      business_name: "Pulpería La Esquina",
    });
  });

  it("collects the product ids to look up", () => {
    expect(orderProductIds(order())).toEqual(["p1"]);
    expect(orderProductIds(order({ lines: [line({})] }))).toEqual([]);
  });

  it("knows when an order has already been billed", () => {
    expect(isOrderInvoiced(order())).toBe(false);
    expect(isOrderInvoiced(order({ invoice: { sale_id: "s1" } }))).toBe(true);
    expect(isOrderInvoiced(order({ invoice: { consecutive_number: "001" } }))).toBe(true);
    expect(isOrderInvoiced(order({ invoice: null }))).toBe(false);
  });
});
