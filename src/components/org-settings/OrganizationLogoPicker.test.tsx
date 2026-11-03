import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { api } from "@/lib/api";
import { OrganizationLogoPicker } from "./OrganizationLogoPicker";

vi.mock("@/lib/api", () => ({
  api: { post: vi.fn() },
  orgSettingsPath: (_userId: string, _orgId: string, endpoint: string) => endpoint,
}));

beforeEach(() => {
  localStorage.setItem("language", "en");
  vi.mocked(api.post).mockReset();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
});

it("uses the snake_case presigned-upload contract and response", async () => {
  vi.mocked(api.post).mockResolvedValue({
    upload_url: "https://uploads.example/presigned",
    file_url: "https://uploads.example/logo.png",
  });
  const onChange = vi.fn();
  const file = new File(["logo"], "logo.png", { type: "image/png" });

  const { container } = render(
    <LanguageProvider>
      <OrganizationLogoPicker userId="user-1" orgId="org-1" value="" onChange={onChange} />
    </LanguageProvider>,
  );

  fireEvent.change(container.querySelector('input[type="file"]')!, {
    target: { files: [file] },
  });

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith("/upload/presigned", {
      file_name: expect.stringMatching(/^logo-\d+\.png$/),
      file_type: "image/png",
      folder: "organization-logos/org-1",
    });
  });
  await waitFor(() => expect(onChange).toHaveBeenCalledWith("https://uploads.example/logo.png"));
  expect(fetch).toHaveBeenCalledWith("https://uploads.example/presigned", expect.objectContaining({
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: file,
  }));
});
