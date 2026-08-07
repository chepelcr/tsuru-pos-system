import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Drawer } from "./Drawer";

describe("Drawer", () => {
  it("portals outside a transformed, scrollable page and locks body scroll", () => {
    const { container } = render(
      <div style={{ transform: "translateY(0)", overflow: "auto", height: 100 }}>
        <Drawer open onClose={() => undefined} closeLabel="Close" title="Product">
          Drawer content
        </Drawer>
      </div>,
    );

    const dialog = screen.getByRole("dialog", { name: "Product" });
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("dismisses only the topmost nested drawer with Escape", () => {
    const outerClose = vi.fn();
    const innerClose = vi.fn();
    render(
      <>
        <Drawer open onClose={outerClose} closeLabel="Close outer" title="Outer">
          Outer
        </Drawer>
        <Drawer open onClose={innerClose} closeLabel="Close inner" title="Inner">
          Inner
        </Drawer>
      </>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(innerClose).toHaveBeenCalledTimes(1);
    expect(outerClose).not.toHaveBeenCalled();
  });

  it("keeps a non-dismissible drawer open", () => {
    const onClose = vi.fn();
    render(
      <Drawer open dismissible={false} onClose={onClose} closeLabel="Close" title="Processing">
        Working
      </Drawer>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });
});
