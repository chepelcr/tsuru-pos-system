import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";

const mocks = vi.hoisted(() => ({ confirmSignUp: vi.fn(), completeAutoSignIn: vi.fn(), getCurrentUser: vi.fn(), completeVerification: vi.fn(), resendSignUpCode: vi.fn(), navigate: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuthContext: () => mocks }));
vi.mock("@/contexts/NotificationsContext", () => ({ useNotifications: () => ({ add: vi.fn() }) }));
vi.mock("@/components/layout/AuthLayout", () => ({ AuthLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("wouter", () => ({ useLocation: () => ["/verify-email", mocks.navigate] }));
import VerifyEmail from "./VerifyEmail";

describe("email confirmation recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.setItem("language", "en"); sessionStorage.clear();
    sessionStorage.setItem("verificationEmail", "owner@example.com");
    sessionStorage.setItem("verificationOrigin", "register");
    mocks.confirmSignUp.mockResolvedValue(undefined);
    mocks.completeAutoSignIn.mockResolvedValue(true);
    mocks.getCurrentUser.mockResolvedValue({ userId: "user-1" });
  });

  it("retries profile setup without submitting the already-consumed code again", async () => {
    mocks.completeVerification.mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce({ userId: "user-1" });
    render(<LanguageProvider><VerifyEmail /></LanguageProvider>);
    fireEvent.paste(screen.getByLabelText("Digit 1 of 6"), { clipboardData: { getData: () => "123456" } });
    await screen.findByRole("button", { name: "Continue" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/organizations/new"));
    expect(mocks.confirmSignUp).toHaveBeenCalledOnce();
    expect(mocks.completeAutoSignIn).toHaveBeenCalledOnce();
    expect(mocks.completeVerification).toHaveBeenCalledTimes(2);
  });

  it("keeps confirmation successful when automatic sign-in is unavailable", async () => {
    mocks.completeAutoSignIn.mockRejectedValue(new Error("Expired auto-sign-in state"));
    render(<LanguageProvider><VerifyEmail /></LanguageProvider>);
    fireEvent.change(screen.getByLabelText("Digit 1 of 6"), { target: { value: "123456" } });
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/login"));
    expect(mocks.completeVerification).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("verificationEmail")).toBeNull();
  });

  it("shows verification as account step three and verifies once on the sixth digit", async () => {
    let finish!: () => void;
    mocks.confirmSignUp.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    mocks.completeVerification.mockResolvedValue({ userId: "user-1" });
    render(<LanguageProvider><VerifyEmail /></LanguageProvider>);
    expect(screen.getByRole("navigation").querySelector('[aria-current="step"]')?.textContent).toContain("Verification");
    expect(screen.getByRole("navigation").querySelectorAll("li")).toHaveLength(3);
    for (let position = 1; position <= 5; position++) {
      fireEvent.change(screen.getByLabelText(`Digit ${position} of 6`), { target: { value: String(position) } });
      expect(mocks.confirmSignUp).not.toHaveBeenCalled();
    }
    fireEvent.change(screen.getByLabelText("Digit 6 of 6"), { target: { value: "6" } });
    fireEvent.submit(screen.getByLabelText("Digit 1 of 6").closest("form")!);
    expect(mocks.confirmSignUp).toHaveBeenCalledOnce();
    expect(mocks.confirmSignUp).toHaveBeenCalledWith({ username: "owner@example.com", confirmationCode: "123456" });
    expect(screen.getAllByRole("textbox").every(input => (input as HTMLInputElement).disabled)).toBe(true);
    await act(async () => finish());
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/organizations/new"));
  });

  it("keeps a rejected code editable without automatically retrying in a loop", async () => {
    mocks.confirmSignUp.mockRejectedValueOnce(Object.assign(new Error("Wrong code"), { name: "CodeMismatchException" })).mockResolvedValueOnce(undefined);
    mocks.completeVerification.mockResolvedValue({ userId: "user-1" });
    render(<LanguageProvider><VerifyEmail /></LanguageProvider>);
    fireEvent.paste(screen.getByLabelText("Digit 1 of 6"), { clipboardData: { getData: () => "123456" } });
    await screen.findByRole("alert");
    expect(mocks.confirmSignUp).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Digit 6 of 6")).toHaveProperty("disabled", false);
    fireEvent.change(screen.getByLabelText("Digit 6 of 6"), { target: { value: "7" } });
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/organizations/new"));
    expect(mocks.confirmSignUp).toHaveBeenLastCalledWith({ username: "owner@example.com", confirmationCode: "123457" });
  });

  it("shows resend success on the page and prevents rapid duplicate sends", async () => {
    mocks.resendSignUpCode.mockResolvedValue(undefined);
    render(<LanguageProvider><VerifyEmail /></LanguageProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Resend code" }));
    expect(await screen.findByRole("status")).toHaveProperty("textContent", "We have sent a new verification code");
    expect(screen.getByRole("button", { name: "Resend code (60s)" })).toHaveProperty("disabled", true);
  });
});
