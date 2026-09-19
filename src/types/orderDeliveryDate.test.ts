import { describe, expect, it } from 'vitest';
import {
  canEditDeliveryDate,
  DELIVERY_DATE_EDITABLE_STATUSES,
  ORDER_STATUSES,
} from '@/types/order';
import type { Order, OrderStatus } from '@/types/order';

/**
 * When the UI offers to reschedule a delivery.
 *
 * This mirrors store-be's `DELIVERY_DATE_EDITABLE_STATUSES` and its billed check.
 * The server enforces them and answers 400 otherwise — this exists so the action
 * is not offered where it cannot succeed, which is a different job from
 * authorising it.
 *
 * The pairing is what needs guarding: if the two lists drift, either the button
 * appears and fails, or it hides an edit that would have worked.
 */
const order = (over: Partial<Pick<Order, 'order_status' | 'invoice'>> = {}) => ({
  order_status: 'pending' as OrderStatus,
  invoice: null,
  ...over,
});

describe('canEditDeliveryDate', () => {
  it.each([...DELIVERY_DATE_EDITABLE_STATUSES])(
    'offers the edit while an order is %s',
    (status) => {
      expect(canEditDeliveryDate(order({ order_status: status }))).toBe(true);
    },
  );

  it.each<OrderStatus>(['shipped', 'delivered', 'cancelled', 'quote'])(
    'hides it once an order is %s',
    (status) => {
      // Shipped: the date has been acted on and the customer told. Delivered and
      // cancelled are history. A quote is not a placed order yet.
      expect(canEditDeliveryDate(order({ order_status: status }))).toBe(false);
    },
  );

  it('hides it for a billed order whatever the status', () => {
    // The delivery date is on the fiscal document by then.
    expect(
      canEditDeliveryDate(order({ invoice: { sale_id: 'sale-1' } })),
    ).toBe(false);
  });

  it('classifies every status exactly once', () => {
    // The mistake made earlier today was a list of statuses that did not exist.
    const editable = new Set<string>(DELIVERY_DATE_EDITABLE_STATUSES);
    for (const status of ORDER_STATUSES) {
      const offered = canEditDeliveryDate(order({ order_status: status }));
      expect(offered).toBe(editable.has(status));
    }
    // And every editable status is a real one.
    for (const status of DELIVERY_DATE_EDITABLE_STATUSES) {
      expect(ORDER_STATUSES).toContain(status);
    }
  });
});
