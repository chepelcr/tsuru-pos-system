import { describe, expect, it } from "vitest";
import { __testing } from "./ClientDrawerForm";
import type { SaleReceiver } from "@/types/receiver";
import type { ClientSearchResult } from "@/hooks/useClientSearch";
import { CustomerType } from "@/lib/enums";

const { isReceiverTouched, receiverToForm, formToReceiver, buildForm } = __testing;

const walmart: ClientSearchResult = {
  client_id: "c-1",
  client_name: "Walmart",
  business_name: "WAL MART DE COSTA RICA S.A.",
  client_gln: "7441234567890",
  identification: { code: "02", number: "3102007223" },
  email: "cxp@walmart.cr",
  residence: {
    state_id: 1,
    county_id: 3,
    district_id: 5,
    neighborhood_id: 7,
    address: "Zona Franca, Bodega 4",
  },
};

describe("isReceiverTouched", () => {
  it("a receiver carrying only a DEFAULT id type is not touched", () => {
    // The regression. The id-type <select> writes `{ code: "01", number: "" }`
    // as soon as it renders, and that used to count as the user having entered
    // a receiver — which discarded the selected client and left the drawer with
    // an empty id, an empty address and no GLN.
    expect(isReceiverTouched({ identification: { code: "01", number: "" } })).toBe(false);
  });

  it("is not touched by empty shells", () => {
    expect(isReceiverTouched(undefined)).toBe(false);
    expect(isReceiverTouched({})).toBe(false);
    expect(isReceiverTouched({ name: "   ", email: "" })).toBe(false);
    expect(isReceiverTouched({ residence: { address: "" } })).toBe(false);
    expect(isReceiverTouched({ phone: { number: "" } })).toBe(false);
  });

  it("is touched by anything that actually identifies somebody", () => {
    expect(isReceiverTouched({ name: "Pulpería La Esquina" })).toBe(true);
    expect(isReceiverTouched({ identification: { code: "01", number: "116640506" } })).toBe(true);
    expect(isReceiverTouched({ residence: { address: "200m sur" } })).toBe(true);
    expect(isReceiverTouched({ residence: { state_id: 1 } })).toBe(true);
    expect(isReceiverTouched({ phone: { number: "88887777" } })).toBe(true);
    expect(isReceiverTouched({ email: "a@b.cr" })).toBe(true);
  });
});

describe("receiverToForm", () => {
  it("fills an untouched receiver from the selected client", () => {
    const form = receiverToForm({ identification: { code: "01", number: "" } }, walmart, []);

    expect(form.identification?.number).toBe("3102007223");
    expect(form.identification?.code).toBe("02");
    expect(form.business_name).toBe("WAL MART DE COSTA RICA S.A.");
    expect(form.residence?.address).toBe("Zona Franca, Bodega 4");
    expect(form.client_gln).toBe("7441234567890");
    // Code 02 is a cédula jurídica, so the customer type has to follow it or
    // the id-type filter hides the very code the client has.
    expect(form.customer_type).toBe(CustomerType.EMPRESA);
  });

  it("keeps the trade name distinct from the legal name", () => {
    // `client_name` is the form's "Nombre comercial / Fantasía". It used to be
    // seeded from the receiver's `name`, so the razón social appeared in both
    // boxes and the real trade name was unreachable.
    const receiver: SaleReceiver = {
      name: "WAL MART DE COSTA RICA S.A.",
      trade_name: "Walmart",
      identification: { code: "02", number: "3102007223" },
    };
    const form = receiverToForm(receiver, walmart, []);

    expect(form.business_name).toBe("WAL MART DE COSTA RICA S.A.");
    expect(form.client_name).toBe("Walmart");
  });

  it("a touched receiver wins over the client", () => {
    const form = receiverToForm(
      { name: "Otro cliente", identification: { code: "01", number: "116640506" } },
      walmart,
      [],
    );
    expect(form.business_name).toBe("Otro cliente");
    expect(form.identification?.number).toBe("116640506");
  });
});

describe("formToReceiver", () => {
  it("persists the trade name the user typed", () => {
    // It used to echo back `carryOver.trade_name`, so the input was read-only
    // in practice: whatever was typed there was dropped on save.
    const form = buildForm(null);
    const receiver = formToReceiver(
      { ...form, business_name: "SUPERMERCADOS UNIDOS S.A.", client_name: "Auto Mercado" },
      [],
      { trade_name: "stale" },
    );
    expect(receiver.name).toBe("SUPERMERCADOS UNIDOS S.A.");
    expect(receiver.trade_name).toBe("Auto Mercado");
  });

  it("round-trips a client through the form without losing anything", () => {
    const form = receiverToForm({}, walmart, []);
    const receiver = formToReceiver(form, [], {});

    expect(receiver.identification?.number).toBe("3102007223");
    expect(receiver.identification?.code).toBe("02");
    expect(receiver.residence?.address).toBe("Zona Franca, Bodega 4");
    expect(receiver.residence?.state_id).toBe(1);
    expect(receiver.email).toBe("cxp@walmart.cr");
  });
});

describe("buildForm", () => {
  it("infers the customer type from the identification code", () => {
    // A client auto-created from an order import has no `customer_type` on
    // record. Defaulting to persona física made the id-type filter exclude the
    // cédula jurídica it actually has, and the section then cleared the id.
    expect(
      buildForm({ identification: { code: "02", number: "3102007223" } } as never).customer_type,
    ).toBe(CustomerType.EMPRESA);
    expect(
      buildForm({ identification: { code: "01", number: "116640506" } } as never).customer_type,
    ).toBe(CustomerType.PERSONA_FISICA);
  });

  it("prefers the customer type on record when there is one", () => {
    expect(
      buildForm({
        customer_type: CustomerType.EMPRESA,
        identification: { code: "01", number: "116640506" },
      } as never).customer_type,
    ).toBe(CustomerType.EMPRESA);
  });
});
