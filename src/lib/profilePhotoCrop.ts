export interface PhotoPosition { x: number; y: number }
export interface PhotoDimensions { width: number; height: number }
export interface PhotoTransform { zoom: number; position: PhotoPosition }

const clampZoom = (zoom: number) => Math.max(1, Math.min(3, zoom));

/** Position is measured in crop widths, so pointer movement survives resizing. */
export function photoCrop(image: PhotoDimensions, zoom: number, position: PhotoPosition) {
  const size = Math.min(image.width, image.height) / clampZoom(zoom);
  const maxX = (image.width / size - 1) / 2;
  const maxY = (image.height / size - 1) / 2;
  const x = Math.max(-maxX, Math.min(maxX, position.x));
  const y = Math.max(-maxY, Math.min(maxY, position.y));
  return {
    size,
    left: (image.width - size) / 2 - x * size,
    top: (image.height - size) / 2 - y * size,
    position: { x, y },
  };
}

/** Keep the image point beneath the fingers in place as their midpoint moves. */
export function photoGesture(image: PhotoDimensions, current: PhotoTransform, from: PhotoPosition[], to: PhotoPosition[]): PhotoTransform {
  const midpoint = (points: PhotoPosition[]) => ({
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  });
  const distance = (points: PhotoPosition[]) => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  const before = midpoint(from);
  const after = midpoint(to);
  const previousDistance = from.length === 2 ? distance(from) : 0;
  const zoom = clampZoom(current.zoom * (previousDistance > 0.001 ? distance(to) / previousDistance : 1));
  const scale = zoom / current.zoom;
  const position = { x: after.x - (before.x - current.position.x) * scale, y: after.y - (before.y - current.position.y) * scale };
  return { zoom, position: photoCrop(image, zoom, position).position };
}

/** Mouse wheel and keyboard zoom use the same anchored geometry as a pinch. */
export function zoomPhotoAt(image: PhotoDimensions, current: PhotoTransform, nextZoom: number, anchor: PhotoPosition = { x: 0, y: 0 }): PhotoTransform {
  const zoom = clampZoom(nextZoom);
  const scale = zoom / current.zoom;
  const position = { x: anchor.x - (anchor.x - current.position.x) * scale, y: anchor.y - (anchor.y - current.position.y) * scale };
  return { zoom, position: photoCrop(image, zoom, position).position };
}

/** Export exactly the square shown inside the circular avatar preview. */
export async function cropProfilePhoto(image: HTMLImageElement, zoom: number, position: PhotoPosition): Promise<File> {
  const crop = photoCrop({ width: image.naturalWidth, height: image.naturalHeight }, zoom, position);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Photo canvas is unavailable');
  context.drawImage(image, crop.left, crop.top, crop.size, crop.size, 0, 0, 512, 512);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Unable to crop photo')), 'image/png');
  });
  return new File([blob], 'profile-photo.png', { type: 'image/png' });
}
