import { lazy, Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionBoundary } from "./PermissionBoundary";

const { usePermissionsMock } = vi.hoisted(() => ({
  usePermissionsMock: vi.fn(),
}));

vi.mock("@/hooks/useRbac", () => ({
  usePermissions: usePermissionsMock,
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const requirement = [["commercial", "read", "products"]] as const;

function ProtectedLazyPage() {
  const loader = vi.fn().mockResolvedValue({
    default: () => <div>Protected product page</div>,
  });
  const Page = lazy(loader);

  render(
    <PermissionBoundary requirements={requirement}>
      <Suspense fallback={<div>Loading page</div>}>
        <Page />
      </Suspense>
    </PermissionBoundary>,
  );

  return loader;
}

describe("PermissionBoundary", () => {
  beforeEach(() => {
    usePermissionsMock.mockReset();
  });

  it("does not import a protected page while permissions are loading", () => {
    usePermissionsMock.mockReturnValue({
      can: vi.fn(() => false),
      isReady: false,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    const loader = ProtectedLazyPage();

    expect(loader).not.toHaveBeenCalled();
    expect(screen.getByText("routes.loadingPermissions")).not.toBeNull();
  });

  it("does not import a protected page when access is denied", () => {
    usePermissionsMock.mockReturnValue({
      can: vi.fn(() => false),
      isReady: true,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const loader = ProtectedLazyPage();

    expect(loader).not.toHaveBeenCalled();
    expect(screen.getByText("routes.accessDenied")).not.toBeNull();
  });

  it("imports the protected page after access is granted", async () => {
    usePermissionsMock.mockReturnValue({
      can: vi.fn(() => true),
      isReady: true,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const loader = ProtectedLazyPage();

    expect(await screen.findByText("Protected product page")).not.toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
