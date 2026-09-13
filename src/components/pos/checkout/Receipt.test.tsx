/**
 * Which ending the checkout shows.
 *
 * Three outcomes look similar and mean different things, and only one of them
 * is distinguishable from the RESULT alone:
 *
 *   * a walk-in sale        → "Nueva venta"   (start the next one)
 *   * a manual order (`PM`) → "Nuevo pedido"  (`result.status === 'order'`)
 *   * a pedido being BILLED → "Cerrar"        (nothing in the result says so)
 *
 * Billing a pedido emits an ordinary `confirmed` sale, so without the caller
 * saying which order it settled, the receipt would end on "Nueva venta" —
 * inviting the cashier to start a sale they did not come here to make.
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { Receipt } from "./Receipt";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { SaleSubmissionResult } from "@/hooks/useCartFlow";

const confirmed = (over: Record<string, unknown> = {}): SaleSubmissionResult =>
  ({
    status: "confirmed",
    sale: { sale_id: "s1", consecutive_number: "00100001010000000238", ...over },
  }) as SaleSubmissionResult;

// `LanguageProvider` falls back to `navigator.language`, which is en-US under
// jsdom. Pinning it keeps these assertions about WHICH copy is chosen rather
// than about the test environment's locale.
beforeEach(() => localStorage.setItem("language", "es"));

function show(props: Partial<React.ComponentProps<typeof Receipt>> = {}) {
  return render(
    <LanguageProvider>
      <Receipt result={confirmed()} cartTotal={1000} itemCount={2} onClose={() => {}} {...props} />
    </LanguageProvider>,
  );
}

describe("a pedido that was billed", () => {
  it("says the order was billed, not that a sale completed", () => {
    show({ billedOrderNumber: "2900679388" });
    expect(screen.getByText("Pedido facturado")).toBeTruthy();
  });

  it("offers Cerrar rather than starting another sale", () => {
    show({ billedOrderNumber: "2900679388" });
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Nueva venta" })).toBeNull();
  });

  it("names the pedido it settled, alongside the document's consecutive", () => {
    show({ billedOrderNumber: "2900679388" });
    expect(screen.getByText(/2900679388/)).toBeTruthy();
    expect(screen.getByText(/00100001010000000238/)).toBeTruthy();
  });
});

describe("an ordinary sale is unchanged", () => {
  it("completes as a sale and offers the next one", () => {
    show();
    expect(screen.getByRole("button", { name: "Nueva venta" })).toBeTruthy();
    expect(screen.queryByText("Pedido facturado")).toBeNull();
  });
});

describe("order mode needs the document to actually exist", () => {
  it("a QUEUED attempt is not 'billed', even for an order", () => {
    // The document has not been issued yet — the outbox will replay it. Saying
    // "Pedido facturado" here would claim something that has not happened.
    show({
      billedOrderNumber: "2900679388",
      result: { status: "queued", localId: "abc", target: "sales" } as SaleSubmissionResult,
    });
    expect(screen.queryByText("Pedido facturado")).toBeNull();
  });
});
