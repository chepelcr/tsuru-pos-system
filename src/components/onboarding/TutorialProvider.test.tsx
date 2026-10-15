import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Router, useLocation } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { TutorialProvider, useTutorial } from "./TutorialProvider";
import { OnboardingTour } from "./OnboardingTour";
import TutorialGuidePage from "@/pages/dashboard/TutorialGuidePage";
import { tutorialStorageKey } from "./tutorialModel";

const state = vi.hoisted(() => ({
  user: { userId: "user-1", onboarding_tour_completed_at: null as string | null | undefined },
  org: { id: "org-1" }, ready: true, grants: null as Set<string> | null,
  canCreate: true, mutate: vi.fn(), apply: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuthContext: () => ({ user: state.user, applyProfileUpdate: state.apply }) }));
vi.mock("@/hooks/useOrganization", () => ({ useOrganization: () => ({ useDefaultOrganization: () => ({ data: state.org }) }) }));
const can = (m: string, a: string, s?: string) => !state.grants || state.grants.has(`${m}:${a}:${s}`);
vi.mock("@/hooks/useRbac", () => ({ usePermissions: () => ({ can, isReady: state.ready }), useCanOpenCreateMenu: () => state.canCreate }));
vi.mock("@/hooks/useProfile", () => ({ useUpdateOnboardingTour: () => ({ mutate: state.mutate }) }));

function Shell() {
  const tour = useTutorial();
  const [location] = useLocation();
  return <>
    <button type="button" data-tour="tutorial-replay" onClick={tour.replay}>Replay</button>
    <output data-testid="progress">{tour.progress.status}:{tour.current?.id}</output>
    {/* Simulates the app's shell remount on every route change. */}
    <div key={location} data-testid="page">{location}</div>
    {location === "/dashboard/guide" && <TutorialGuidePage />}
    <OnboardingTour />
  </>;
}
function mount(path = "/dashboard") {
  const router = memoryLocation({ path });
  const content = () => <StrictMode><LanguageProvider><Router hook={router.hook}><TutorialProvider><Shell /></TutorialProvider></Router></LanguageProvider></StrictMode>;
  return { ...render(content()), router, content };
}
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
beforeEach(() => {
  localStorage.clear(); localStorage.setItem("language", "en");
  state.user = { userId: "user-1", onboarding_tour_completed_at: null };
  state.org = { id: "org-1" }; state.ready = true; state.grants = null; state.canCreate = true;
  state.mutate.mockReset(); state.apply.mockReset();
});

describe("persistent tutorial controller", () => {
  it("offers welcome on the overview, waits for permissions, and does not interrupt deep links", () => {
    state.ready = false;
    const view = mount("/dashboard/products");
    expect(screen.queryByRole("dialog")).toBeNull();
    state.ready = true; view.rerender(view.content());
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => view.router.navigate("/dashboard"));
    expect(screen.getByRole("dialog").textContent).toContain("Get comfortable");
  });
  it("moves across routes and back without restarting when the page remounts", () => {
    const view = mount(); click("Start the tour"); click("Next");
    expect(screen.getByTestId("page").textContent).toBe("/dashboard/organization/general");
    expect(screen.getByTestId("progress").textContent).toBe("active:organization");
    click("Back");
    expect(screen.getByTestId("progress").textContent).toBe("active:overview");
    expect(state.mutate).not.toHaveBeenCalled();
    view.unmount();
    mount("/dashboard/products");
    expect(screen.getByTestId("progress").textContent).toBe("active:overview");
    expect(screen.getByText(/You are in a different section/)).toBeTruthy();
    click("Return to this section");
    expect(screen.getByTestId("page").textContent).toBe("/dashboard");
  });
  it("persists dismissal, provides immediate replay, and completes only at Done", () => {
    const view = mount(); click("Maybe later");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("progress").textContent).toBe("dismissed:overview");
    view.unmount(); mount(); expect(screen.queryByRole("dialog")).toBeNull();
    click("Replay");
    while (screen.queryByRole("button", { name: "Next" })) click("Next");
    expect(screen.getByTestId("progress").textContent).toBe("active:profile");
    click("Done");
    expect(screen.getByTestId("progress").textContent).toBe("complete:profile");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state.mutate.mock.calls.every(([args]) => args.data.onboarding_tour_completed === true)).toBe(true);
  });
  it("respects prior server completion and permits offline replay", () => {
    state.user.onboarding_tour_completed_at = "2026-09-24T00:00:00Z";
    mount(); expect(screen.queryByRole("dialog")).toBeNull(); click("Replay");
    expect(screen.getByTestId("progress").textContent).toBe("active:overview");
    expect(state.mutate).not.toHaveBeenCalled();
  });
  it("waits for a profile field and respects a late server completion", () => {
    state.user.onboarding_tour_completed_at = undefined;
    const view = mount(); expect(screen.queryByRole("dialog")).toBeNull();
    state.user.onboarding_tour_completed_at = "2026-09-24T00:00:00Z";
    view.rerender(view.content());
    expect(screen.getByTestId("progress").textContent).toBe("complete:overview");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("falls back when a saved step is unavailable and calculates the filtered count", () => {
    state.grants = new Set(); state.canCreate = false;
    localStorage.setItem(tutorialStorageKey("user-1", "org-1"), JSON.stringify({ status: "active", step: "create-product" }));
    mount("/dashboard/products");
    expect(screen.getByTestId("progress").textContent).toBe("active:profile");
    expect(screen.getByText("Step 1 of 1")).toBeTruthy();
  });
  it("stays usable in memory if persistence fails", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    mount(); click("Start the tour"); click("Next");
    expect(screen.getByTestId("progress").textContent).toBe("active:organization");
    click("Close tutorial"); expect(screen.queryByRole("dialog")).toBeNull();
    spy.mockRestore();
  });
  it("does not carry an active tour into a different organization or user", () => {
    const view = mount(); click("Start the tour"); click("Next");
    state.org = { id: "org-2" }; view.rerender(view.content());
    expect(screen.getByTestId("progress").textContent).toBe("unseen:overview");
    expect(screen.queryByRole("dialog")).toBeNull();
    state.org = { id: "org-1" }; view.rerender(view.content());
    expect(screen.getByTestId("progress").textContent).toBe("active:organization");
    state.user = { userId: "user-2", onboarding_tour_completed_at: null }; view.rerender(view.content());
    expect(screen.getByTestId("progress").textContent).toBe("unseen:overview");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("updates translated instructions without changing the active step", () => {
    const router = memoryLocation({ path: "/dashboard" });
    function LanguageControl() {
      const { setLanguage } = useLanguage();
      return <button type="button" onClick={() => setLanguage("es")}>Spanish</button>;
    }
    render(<LanguageProvider><Router hook={router.hook}><TutorialProvider><LanguageControl /><Shell /></TutorialProvider></Router></LanguageProvider>);
    click("Start the tour"); click("Next"); click("Spanish");
    expect(screen.getByTestId("progress").textContent).toBe("active:organization");
    expect(screen.getByRole("heading", { name: "Revisá la identidad del negocio" })).toBeTruthy();
    expect(state.mutate).not.toHaveBeenCalled();
  });
  it("opens the permanent guide without executing work and keeps examples permission-filtered", () => {
    state.grants = new Set(); state.canCreate = false;
    mount(); click("Open the permanent guide");
    expect(screen.getByTestId("page").textContent).toBe("/dashboard/guide");
    expect(screen.getByRole("heading", { name: "Getting started" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Add a product" })).toBeNull();
    click("Open this section");
    expect(screen.getByTestId("page").textContent).toBe("/dashboard/profile");
    expect(state.mutate).toHaveBeenCalledTimes(1); // Tutorial preference only.
  });
});
