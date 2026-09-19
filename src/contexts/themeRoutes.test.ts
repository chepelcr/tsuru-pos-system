import { describe, expect, it } from "vitest";
import { isPreOrganizationRoute } from "./ThemeContext";

/**
 * Which routes render the default palette instead of an organization's.
 *
 * Before this classification existed, these pages showed the LAST organization's
 * theme: with no org in scope the resolver fell through to the id mirrored in
 * localStorage, which is whichever org was open most recently. So you signed out
 * and met a login page in somebody else's branding, and the org picker branded
 * itself as one of the options it was asking you to choose between.
 */
describe("isPreOrganizationRoute", () => {
  it.each([
    "/login",
    "/register",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/organizations/select",
    "/join/abc123",
  ])("%s renders the default theme", (path) => {
    expect(isPreOrganizationRoute(path)).toBe(true);
  });

  it.each([
    "/dashboard",
    "/dashboard/documents",
    "/dashboard/products",
    "/pos/payment",
  ])("%s keeps the organization theme", (path) => {
    expect(isPreOrganizationRoute(path)).toBe(false);
  });

  it("does not match a route that merely starts with the same letters", () => {
    // `/registers` is not `/register`; a bare `startsWith` would claim it.
    expect(isPreOrganizationRoute("/registers")).toBe(false);
    expect(isPreOrganizationRoute("/logins")).toBe(false);
  });

  it("matches sub-paths of the org picker", () => {
    expect(isPreOrganizationRoute("/organizations/select/new")).toBe(true);
  });
});
