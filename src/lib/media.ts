/**
 * Media library types + helpers.
 *
 * The library is a server-side registry (one `organization_media` row per asset)
 * exposed by the organization-configurations service — the equivalent of the
 * landing-dxp `media.json`, but per-org in the DB. Local assets live in the
 * org S3 bucket; external items are off-site URLs. Stored content value is
 * always the plain absolute `url`.
 */

/** One asset in the org media library (an `organization_media` row). */
export interface MediaItem {
  /** Stable registry id (used for delete + React keys). */
  id: string;
  /** Public URL — what gets stored in content. */
  url: string;
  /** S3 object key (local assets only). */
  key?: string;
  filename: string;
  /** image | video | audio | document */
  kind: string;
  /** local | external */
  source: string;
  mime?: string;
  size?: number;
  alt?: string;
  createdAt?: string;
}

/** Presigned upload response from the backend. */
export interface PresignedUpload {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

/** Resolve a stored ref to a usable `<img src>` (absolute URLs → identity). */
export function resolveMediaUrl(ref?: string | null): string {
  return ref ?? "";
}

/** True when a value looks like an image we can preview (URL or data-URL). */
export function isPreviewableImage(ref?: string | null): boolean {
  if (!ref) return false;
  return /^(https?:)?\/\//i.test(ref) || ref.startsWith("data:");
}
