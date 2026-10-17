import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Box } from "lucide-react";
import { SectionWrapper } from "@/components/common/SectionWrapper";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useAccordionSections } from "@/hooks/useAccordionSections";
import { Drawer } from "./Drawer";

function Cards() {
  const { expanded, setExpanded, toggle } = useAccordionSections({ general: true, codes: false, inventory: true });
  return <>
    <button onClick={() => setExpanded((prev) => ({ ...prev, codes: true }))}>Load saved sections</button>
    {(["general", "codes", "inventory"] as const).map((key) => (
      <SectionWrapper key={key} title={key} icon={Box} isExpanded={expanded[key]} onToggle={() => toggle(key)}>
        <input aria-label={`${key} field`} />
      </SectionWrapper>
    ))}
    <SectionWrapper title="Fixed section" icon={Box}>Always visible</SectionWrapper>
    <SectionWrapper title="Locked section" icon={Box} isExpanded={false} onToggle={() => {}} disabled>Locked</SectionWrapper>
  </>;
}

function Example({ open = true, title = "Products" }: { open?: boolean; title?: string }) {
  return <LanguageProvider>
    <Drawer open={open} title={title} closeLabel={`Close ${title}`} onClose={() => {}}><Cards /></Drawer>
  </LanguageProvider>;
}

function prepare(title = "Products") {
  const dialog = screen.getByRole("dialog", { name: title });
  const codes = within(dialog).getByRole("button", { name: "codes" });
  const body = codes.parentElement!.parentElement!;
  const scrollTo = vi.fn();
  Object.defineProperty(body, "scrollTo", { value: scrollTo });
  body.scrollTop = 420;
  body.style.scrollPaddingTop = "12px";
  vi.spyOn(body, "getBoundingClientRect").mockReturnValue({ top: 100 } as DOMRect);
  vi.spyOn(codes.parentElement!, "getBoundingClientRect").mockReturnValue({ top: -120 } as DOMRect);
  return { body, codes, scrollTo, dialog };
}

function deferred() {
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => { finish = resolve; });
  return { finished, finish };
}

async function frame() {
  await act(async () => { await vi.advanceTimersByTimeAsync(20); });
}

const originalGetAnimations = Object.getOwnPropertyDescriptor(Element.prototype, "getAnimations");
const getAnimations = vi.fn((): { finished: Promise<void> }[] => []);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.setItem("language", "en");
  getAnimations.mockReset().mockReturnValue([]);
  Object.defineProperty(Element.prototype, "getAnimations", { configurable: true, value: getAnimations });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalGetAnimations) Object.defineProperty(Element.prototype, "getAnimations", originalGetAnimations);
  else Reflect.deleteProperty(Element.prototype, "getAnimations");
});

describe("drawer accordion scrolling", () => {
  it("waits for collapsing siblings and uses the card's final position inside the drawer", async () => {
    render(<Example />);
    const { codes, scrollTo, body } = prepare();
    const collapsing = deferred();
    const opening = deferred();
    const generalContent = within(body).getByRole("button", { name: "general" }).getAttribute("aria-controls")!;
    const codesContent = codes.getAttribute("aria-controls")!;
    const cardBounds = vi.spyOn(codes.parentElement!, "getBoundingClientRect")
      .mockReturnValue({ top: 650 } as DOMRect);
    getAnimations.mockImplementation(function (this: Element) {
      return this.id === generalContent ? [collapsing] : this.id === codesContent ? [opening] : [];
    });

    fireEvent.click(codes.querySelector("span")!);
    expect(codes.getAttribute("aria-expanded")).toBe("true");
    expect(within(body).getByRole("button", { name: "general" }).getAttribute("aria-expanded")).toBe("false");
    await frame();
    expect(scrollTo).not.toHaveBeenCalled();
    await act(async () => { opening.finish(); });
    expect(scrollTo).not.toHaveBeenCalled();
    cardBounds.mockReturnValue({ top: -120 } as DOMRect);
    await act(async () => { collapsing.finish(); });
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith({ top: 188, behavior: "smooth" });
  });

  it("does not scroll on hydration, data-driven expansion, fixed cards, or disabled cards", async () => {
    render(<Example />);
    const { scrollTo } = prepare();
    await frame();
    fireEvent.click(screen.getByRole("button", { name: "Load saved sections" }));
    await frame();
    fireEvent.click(screen.getByRole("button", { name: "Fixed section" }));
    fireEvent.click(screen.getByRole("button", { name: /Locked section/ }));
    await frame();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does not scroll when closing an expanded card", async () => {
    render(<Example />);
    const { scrollTo } = prepare();
    fireEvent.click(screen.getByRole("button", { name: "general" }));
    await frame();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("only follows the latest selection during rapid toggles", async () => {
    render(<Example />);
    const { codes, scrollTo, body } = prepare();
    const pending = deferred();
    getAnimations.mockReturnValue([pending]);
    fireEvent.click(codes);
    await frame();
    const inventory = within(body).getByRole("button", { name: "inventory" });
    vi.spyOn(inventory.parentElement!, "getBoundingClientRect").mockReturnValue({ top: 200 } as DOMRect);
    fireEvent.click(inventory);
    await frame();
    await act(async () => { pending.finish(); });
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith({ top: 508, behavior: "smooth" });
  });

  it("cancels a pending scroll when the selected card is closed", async () => {
    render(<Example />);
    const { codes, scrollTo } = prepare();
    const pending = deferred();
    getAnimations.mockReturnValue([pending]);
    fireEvent.click(codes);
    await frame();
    fireEvent.click(codes);
    await act(async () => { pending.finish(); });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it.each(["wheel", "touchstart", "pointerdown", "keydown"])("lets user %s input cancel a pending scroll", async (type) => {
    render(<Example />);
    const { codes, scrollTo, body } = prepare();
    const pending = deferred();
    getAnimations.mockReturnValue([pending]);
    fireEvent.click(codes);
    await frame();
    fireEvent(body, new Event(type, { bubbles: true }));
    await act(async () => { pending.finish(); });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("cancels scrolling as soon as the drawer closes, including its exit animation", async () => {
    const { rerender } = render(<Example />);
    const { codes, scrollTo } = prepare();
    const pending = deferred();
    getAnimations.mockReturnValue([pending]);
    fireEvent.click(codes);
    await frame();
    rerender(<Example open={false} />);
    await act(async () => { pending.finish(); });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("uses instant positioning when reduced motion is requested", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<Example />);
    const { codes, scrollTo } = prepare();
    fireEvent.click(codes);
    await frame();
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith({ top: 188, behavior: "instant" });
  });

  it("attaches the behavior when an initially closed drawer opens", async () => {
    const { rerender } = render(<Example open={false} />);
    rerender(<Example />);
    const { codes, scrollTo } = prepare();
    fireEvent.click(codes);
    await frame();
    expect(scrollTo).toHaveBeenCalledWith({ top: 188, behavior: "smooth" });
  });

  it("still positions the card when a sibling transition is canceled", async () => {
    render(<Example />);
    const { codes, scrollTo } = prepare();
    let cancelTransition!: () => void;
    const finished = new Promise<void>((_resolve, reject) => { cancelTransition = () => reject(new Error("Canceled")); });
    getAnimations.mockReturnValue([{ finished }]);
    fireEvent.click(codes);
    await frame();
    await act(async () => { cancelTransition(); });
    expect(scrollTo).toHaveBeenCalledWith({ top: 188, behavior: "smooth" });
  });

  it("scrolls only the selected drawer when overlays are nested", async () => {
    function Nested() {
      const [nested, setNested] = useState(false);
      return <LanguageProvider><Drawer open title="Outer" closeLabel="Close outer" onClose={() => {}}>
        <Cards /><button onClick={() => setNested(true)}>Open nested</button>
        {nested && <Example title="Inner" />}
      </Drawer></LanguageProvider>;
    }
    render(<Nested />);
    const outer = prepare("Outer");
    fireEvent.click(screen.getByRole("button", { name: "Open nested" }));
    const inner = prepare("Inner");
    fireEvent.click(inner.codes);
    await frame();
    expect(inner.scrollTo).toHaveBeenCalledOnce();
    expect(outer.scrollTo).not.toHaveBeenCalled();
  });
});
