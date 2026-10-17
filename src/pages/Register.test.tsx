import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";

vi.mock("@/contexts/AuthContext", () => ({ useAuthContext: () => ({ signUp: vi.fn() }) }));
vi.mock("@/contexts/NotificationsContext", () => ({ useNotifications: () => ({ add: vi.fn() }) }));
vi.mock("@/components/layout/AuthLayout", () => ({ AuthLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("wouter", () => ({ useLocation: () => ["/register", vi.fn()] }));
import Register from "./Register";

describe("account creation stages", () => {
  beforeEach(() => { localStorage.setItem("language", "en"); });

  it("moves from Info to Pass, and Back restores Info without introducing organization steps", async () => {
    render(<LanguageProvider><Register /></LanguageProvider>);
    const rail = screen.getByRole("navigation");
    expect(rail.textContent).toContain("1Information2Pass3Verification");
    expect(rail.querySelector('[aria-current="step"]')?.textContent).toBe("1Information");
    fireEvent.change(screen.getByLabelText("First name", { exact: false }), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText("Last name", { exact: false }), { target: { value: "User" } });
    fireEvent.change(screen.getByLabelText("Email", { exact: false }), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Username", { exact: false }), { target: { value: "test_user" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(rail.querySelector('[aria-current="step"]')?.textContent).toBe("2Pass"));
    expect(document.activeElement).toBe(screen.getByLabelText("Password", { exact: false, selector: '#register-password' }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(rail.querySelector('[aria-current="step"]')?.textContent).toBe("1Information"));
    expect(screen.getByLabelText("First name", { exact: false })).toHaveProperty("value", "Test");
    expect(rail.textContent).not.toContain("Organization");
  });
});
