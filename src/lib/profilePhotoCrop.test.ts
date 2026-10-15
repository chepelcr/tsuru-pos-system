import { describe, expect, it, vi } from "vitest";
import { cropProfilePhoto, photoCrop, photoGesture, zoomPhotoAt } from "./profilePhotoCrop";

describe("profile photo crop", () => {
  it.each([
    [{ width: 1200, height: 800 }, { size: 800, left: 200, top: 0 }],
    [{ width: 800, height: 1200 }, { size: 800, left: 0, top: 200 }],
  ])("centers landscape and portrait images without stretching", (dimensions, expected) => {
    expect(photoCrop(dimensions, 1, { x: 0, y: 0 })).toMatchObject(expected);
  });

  it.each([{ x: -100, y: -100 }, { x: 100, y: 100 }])("keeps zoomed edge crops inside the source photo", (position) => {
    const crop = photoCrop({ width: 1200, height: 800 }, 2, position);
    expect(crop.size).toBe(400);
    expect(crop.left).toBeGreaterThanOrEqual(0);
    expect(crop.top).toBeGreaterThanOrEqual(0);
    expect(crop.left + crop.size).toBeLessThanOrEqual(1200);
    expect(crop.top + crop.size).toBeLessThanOrEqual(800);
  });

  it("keeps the image point under a moving two-finger pinch", () => {
    const current = { zoom: 1.5, position: { x: 0.1, y: 0.05 } };
    const from = [{ x: -0.25, y: 0 }, { x: 0.25, y: 0 }];
    const to = [{ x: -0.4, y: 0.1 }, { x: 0.4, y: 0.1 }];
    const next = photoGesture({ width: 800, height: 400 }, current, from, to);
    expect(next.zoom).toBeCloseTo(2.4);
    expect(next.position.x).toBeCloseTo(0.16);
    expect(next.position.y).toBeCloseTo(0.18);
  });

  it("clamps pinch zoom at both limits and keeps the crop inside the image", () => {
    const image = { width: 800, height: 400 };
    const from = [{ x: -0.1, y: 0 }, { x: 0.1, y: 0 }];
    const expanded = [{ x: -0.5, y: 0 }, { x: 0.5, y: 0 }];
    const max = photoGesture(image, { zoom: 1, position: { x: 0, y: 0 } }, from, expanded);
    expect(max.zoom).toBe(3);
    const min = photoGesture(image, max, expanded, from);
    expect(min.zoom).toBe(1);
    expect(min.position).toEqual({ x: 0, y: 0 });
  });

  it("zooms around the mouse pointer rather than shifting its image point", () => {
    const result = zoomPhotoAt({ width: 800, height: 400 }, { zoom: 1, position: { x: 0, y: 0 } }, 2, { x: 0.25, y: 0 });
    expect(result).toEqual({ zoom: 2, position: { x: -0.25, y: 0 } });
  });

  it("exports the previewed source region at 512px, with the actual encoded MIME type", async () => {
    const drawImage = vi.fn();
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["cropped"], { type: "image/png" })));
    try {
      const image = Object.assign(document.createElement("img"), {});
      Object.defineProperties(image, { naturalWidth: { value: 800 }, naturalHeight: { value: 400 } });
      const file = await cropProfilePhoto(image, 2, { x: 0.05, y: 0 });
      expect(drawImage).toHaveBeenCalledWith(image, 290, 100, 200, 200, 0, 0, 512, 512);
      expect(file.type).toBe("image/png");
      expect(file.size).toBe(7);
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    } finally { getContext.mockRestore(); toBlob.mockRestore(); }
  });
});
