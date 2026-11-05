import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useConfirmModal } from "./useConfirmModal";

describe("confirmation continuity", () => {
  it("keeps the same dialog during a pending request and blocks duplicate submissions and dismissal", async () => {
    let finish!: () => void;
    const action = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    function Harness() {
      const { confirm, confirmModal } = useConfirmModal();
      return <><button onClick={() => confirm({ title: "Confirm template", message: "Use this design?", confirmLabel: "Confirm organization", onConfirm: action })}>Open</button>{confirmModal}</>;
    }
    render(<LanguageProvider><Harness /></LanguageProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog");
    const submit = screen.getByRole("button", { name: "Confirm organization" });
    fireEvent.click(submit);
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(submit).toHaveProperty("disabled", true);
    fireEvent.click(submit);
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(dialog.parentElement!);
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(action).toHaveBeenCalledOnce();
    finish();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
