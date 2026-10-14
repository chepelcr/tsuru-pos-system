import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUpdateProfilePhoto } from "./useProfile";

vi.mock("aws-amplify/auth", () => ({ fetchAuthSession: async () => ({ tokens: { idToken: { toString: () => "test-token" } } }) }));

function wrapper() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
const imageUrl = "https://cdn.example.com/profile-pictures/u1/avatar.png";
const uploadUrl = "https://uploads.example.com/signed";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.unstubAllGlobals());

describe("profile photo upload and persistence", () => {
  it("uses the account route and snake_case, uploads the file, then persists the permanent URL", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ upload_url: uploadUrl, file_url: imageUrl }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json({ picture_url: imageUrl }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["photo"], "photo.png", { type: "image/png" });
    const { result } = renderHook(() => useUpdateProfilePhoto("u1"), { wrapper: wrapper() });
    let saved: string | undefined;
    await act(async () => { saved = await result.current.mutateAsync(file); });
    expect(saved).toBe(imageUrl);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/users/u1/profile/photo/presigned");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ file_type: "image/png", file_size: 5 });
    expect(fetchMock.mock.calls[1]).toEqual([uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: file }]);
    expect(fetchMock.mock.calls[2][0]).toContain("/api/users/u1/profile");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ picture_url: imageUrl });
  });

  it("keeps the previous saved profile when the storage upload fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ upload_url: uploadUrl, file_url: imageUrl }))
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useUpdateProfilePhoto("u1"), { wrapper: wrapper() });
    await act(async () => { await expect(result.current.mutateAsync(new File(["photo"], "p.png", { type: "image/png" }))).rejects.toThrow("upload failed"); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBeUndefined();
  });

  it("reports a profile save failure after upload without returning an unsaved URL", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ upload_url: uploadUrl, file_url: imageUrl }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json({ error: "Unable to save profile" }, 500));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useUpdateProfilePhoto("u1"), { wrapper: wrapper() });
    await act(async () => { await expect(result.current.mutateAsync(new File(["photo"], "p.png", { type: "image/png" }))).rejects.toThrow(); });
    expect(result.current.data).toBeUndefined();
  });
});
