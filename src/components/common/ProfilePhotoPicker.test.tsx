import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePhotoPicker } from "./ProfilePhotoPicker";

const { mutateAsync, removeAsync, revokeObjectURL, createObjectURL, drawImage } = vi.hoisted(() => ({
  mutateAsync: vi.fn(), removeAsync: vi.fn(), revokeObjectURL: vi.fn(), createObjectURL: vi.fn(), drawImage: vi.fn(),
}));
vi.mock("@/hooks/useProfile", () => ({ useUpdateProfilePhoto: () => ({ mutateAsync }), useRemoveProfilePhoto: () => ({ mutateAsync: removeAsync }) }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

beforeEach(() => {
  vi.resetAllMocks();
  createObjectURL.mockReturnValue("blob:photo");
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = createObjectURL;
    static revokeObjectURL = revokeObjectURL;
  });
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "touch";
      this.isPrimary = init.isPrimary ?? true;
    }
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["cropped"], { type: "image/png" })));
  mutateAsync.mockResolvedValue("https://cdn.example.com/saved.png");
  removeAsync.mockResolvedValue(null);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const photo = () => new File(["photo"], "photo.jpg", { type: "image/jpeg" });
const savedUrl = "https://cdn.example.com/previous.png";
function setup() {
  const onSaved = vi.fn();
  const view = render(<ProfilePhotoPicker userId="u1" name="Test User" value={savedUrl} onSaved={onSaved} />);
  fireEvent.click(screen.getByRole("button", { name: "profile.photo.change" }));
  return { ...view, onSaved };
}
function select(file = photo()) {
  fireEvent.change(screen.getByLabelText("profile.photo.choose"), { target: { files: [file] } });
}
function loadPhoto() {
  const image = screen.getByAltText("profile.photo.preview");
  Object.defineProperties(image, { naturalWidth: { value: 800 }, naturalHeight: { value: 400 } });
  fireEvent.load(image);
  return image;
}
function photoViewport() {
  const stage = screen.getByRole("group", { name: "profile.photo.position" });
  vi.spyOn(stage, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 200));
  Object.defineProperty(stage, "setPointerCapture", { configurable: true, value: vi.fn() });
  return stage;
}
function pinchToDouble(stage: HTMLElement) {
  fireEvent.pointerDown(stage, { pointerId: 1, clientX: 50, clientY: 100, button: 0 });
  fireEvent.pointerDown(stage, { pointerId: 2, clientX: 150, clientY: 100, button: 0, isPrimary: false });
  fireEvent.pointerMove(stage, { pointerId: 1, clientX: 0, clientY: 100 });
  fireEvent.pointerMove(stage, { pointerId: 2, clientX: 200, clientY: 100, isPrimary: false });
  fireEvent.pointerUp(stage, { pointerId: 1 });
  fireEvent.pointerUp(stage, { pointerId: 2 });
}

describe("profile photo editor", () => {
  it("removes the photo through the compact avatar control and returns to initials", async () => {
    const onSaved = vi.fn();
    const { rerender } = render(<ProfilePhotoPicker userId="u1" name="Test User" value={savedUrl} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "profile.photo.remove" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(null));
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<ProfilePhotoPicker userId="u1" name="Test User" value={null} onSaved={onSaved} />);
    expect(screen.queryByAltText("profile.photo.title")).toBeNull();
    expect(screen.getByText("TU")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "profile.photo.remove" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("profile.photo.removed");
  });

  it("retains the saved photo and offers retry when removal fails", async () => {
    removeAsync.mockRejectedValueOnce(new Error("Unable to remove"));
    const onSaved = vi.fn();
    render(<ProfilePhotoPicker userId="u1" name="Test" value={savedUrl} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "profile.photo.remove" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("profile.photo.removeError"));
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByAltText("profile.photo.title").getAttribute("src")).toBe(savedUrl);
    fireEvent.click(screen.getByRole("button", { name: "profile.photo.remove" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(null));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("locks update and duplicate removal while the delete request is pending", async () => {
    let finish!: () => void;
    removeAsync.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    const onSaved = vi.fn();
    render(<ProfilePhotoPicker userId="u1" name="Test" value={savedUrl} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "profile.photo.remove" }));
    const change = screen.getByRole("button", { name: "profile.photo.change" }) as HTMLButtonElement;
    const remove = screen.getByRole("button", { name: "profile.photo.remove" }) as HTMLButtonElement;
    expect(change.disabled).toBe(true);
    expect(remove.disabled).toBe(true);
    fireEvent.click(change); fireEvent.click(remove);
    expect(removeAsync).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => finish());
    expect(onSaved).toHaveBeenCalledWith(null);
  });

  it("opens the modal before choosing, and cancels without uploading or changing the saved photo", () => {
    const { onSaved } = setup();
    expect(screen.getByRole("dialog")).toBeTruthy();
    select();
    loadPhoto();
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByAltText("profile.photo.title").getAttribute("src")).toBe(savedUrl);
    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:photo");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("accepts a dropped file, zooms and moves the crop, then uploads only the exported photo", async () => {
    const { onSaved } = setup();
    fireEvent.drop(screen.getByRole("dialog"), { dataTransfer: { files: [photo()] } });
    const image = loadPhoto();
    const stage = photoViewport();
    pinchToDouble(stage);
    fireEvent.keyDown(stage, { key: "ArrowRight" });
    fireEvent.click(screen.getByRole("button", { name: "profile.photo.save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("https://cdn.example.com/saved.png"));
    expect(drawImage).toHaveBeenCalledWith(image, 294, 100, 200, 200, 0, 0, 512, 512);
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ name: "profile-photo.png", type: "image/png", size: 7 });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("profile.photo.saved");
  });

  it("opens the editor when a photo is dropped on the profile photo area", () => {
    const view = render(<ProfilePhotoPicker userId="u1" name="Test" onSaved={vi.fn()} />);
    fireEvent.drop(view.container.querySelector('[aria-busy]')!, { dataTransfer: { files: [photo()] } });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByAltText("profile.photo.preview")).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("retains the crop after a failed upload and allows retry", async () => {
    mutateAsync.mockRejectedValueOnce(new Error("upload failed"));
    const { onSaved } = setup();
    select();
    loadPhoto();
    pinchToDouble(photoViewport());
    fireEvent.keyDown(screen.getByRole("group", { name: "profile.photo.position" }), { key: "ArrowLeft" });
    fireEvent.click(screen.getByRole("button", { name: "profile.photo.save" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("profile.photo.error"));
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByText("200%")).toBeTruthy();
    expect(screen.getByAltText("profile.photo.title").getAttribute("src")).toBe(savedUrl);
    fireEvent.click(screen.getByRole("button", { name: "profile.photo.save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(drawImage.mock.calls[1]).toEqual(drawImage.mock.calls[0]);
  });

  it("moves with one finger and resumes dragging after a second finger lifts", () => {
    setup(); select(); loadPhoto();
    const stage = photoViewport();
    pinchToDouble(stage);
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 120, clientY: 100 });
    const before = screen.getByAltText("profile.photo.preview").getAttribute("style");
    expect(before).toContain("left: -140%");
    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 180, clientY: 100, button: 0, isPrimary: false });
    fireEvent.pointerUp(stage, { pointerId: 2 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 140, clientY: 100 });
    expect(screen.getByAltText("profile.photo.preview").getAttribute("style")).toContain("left: -130%");
    fireEvent.pointerCancel(stage, { pointerId: 1 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 160, clientY: 100 });
    expect(screen.getByAltText("profile.photo.preview").getAttribute("style")).toContain("left: -130%");
  });

  it("supports wheel zoom and keyboard adjustment without visible positioning or zoom buttons", () => {
    setup(); select(); loadPhoto();
    const stage = photoViewport();
    const wheel = new WheelEvent("wheel", { deltaY: -Math.log(2) / 0.002, clientX: 100, clientY: 100, bubbles: true, cancelable: true });
    fireEvent(stage, wheel);
    expect(wheel.defaultPrevented).toBe(true);
    expect(screen.getByText("200%")).toBeTruthy();
    fireEvent.keyDown(stage, { key: "+" });
    expect(screen.getByText("210%")).toBeTruthy();
    fireEvent.keyDown(stage, { key: "-" });
    expect(screen.getByText("200%")).toBeTruthy();
    fireEvent.keyDown(stage, { key: "Home" });
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("button", { name: /profile\.photo\.(move\.|center|zoom)/ })).toBeNull();
  });

  it("moves with a held left mouse button and ignores right-click dragging", () => {
    setup(); select(); loadPhoto();
    const stage = photoViewport();
    const initial = screen.getByAltText("profile.photo.preview").getAttribute("style");
    fireEvent.pointerDown(stage, { pointerId: 1, pointerType: "mouse", clientX: 100, clientY: 100, button: 2 });
    fireEvent.pointerMove(stage, { pointerId: 1, pointerType: "mouse", clientX: 120, clientY: 100 });
    expect(screen.getByAltText("profile.photo.preview").getAttribute("style")).toBe(initial);
    fireEvent.pointerDown(stage, { pointerId: 1, pointerType: "mouse", clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(stage, { pointerId: 1, pointerType: "mouse", clientX: 120, clientY: 100 });
    expect(screen.getByAltText("profile.photo.preview").getAttribute("style")).toContain("left: -40%");
    fireEvent.pointerUp(stage, { pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerMove(stage, { pointerId: 1, pointerType: "mouse", clientX: 140, clientY: 100 });
    expect(screen.getByAltText("profile.photo.preview").getAttribute("style")).toContain("left: -40%");
  });

  it("rejects undecodable images and focuses the crop after a replacement loads", () => {
    setup(); select();
    fireEvent.error(screen.getByAltText("profile.photo.preview"));
    expect(screen.getByRole("alert").textContent).toBe("profile.photo.unreadable");
    expect((screen.getByRole("button", { name: "profile.photo.save" }) as HTMLButtonElement).disabled).toBe(true);
    createObjectURL.mockReturnValueOnce("blob:replacement");
    select(); loadPhoto();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("group", { name: "profile.photo.position" }));
  });

  it.each([new File(["text"], "x.txt", { type: "text/plain" }), new File([], "x.png", { type: "image/png" }), new File([new Uint8Array(5242881)], "x.png", { type: "image/png" })])("rejects invalid files before preview or upload", (file) => {
    setup();
    select(file);
    expect(screen.getByRole("alert").textContent).toBe("profile.photo.invalid");
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("keeps saving locked against duplicate clicks, drops and dismissal", async () => {
    let finish!: (value: string) => void;
    mutateAsync.mockReturnValue(new Promise<string>((resolve) => { finish = resolve; }));
    setup(); select(); loadPhoto();
    fireEvent.click(screen.getByRole("button", { name: "profile.photo.save" }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    const dialog = screen.getByRole("dialog");
    expect((within(dialog).getByRole("button", { name: "common.cancel" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.drop(dialog, { dataTransfer: { files: [photo()] } });
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog")).toBeTruthy();
    await act(async () => finish("https://cdn.example.com/saved.png"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
