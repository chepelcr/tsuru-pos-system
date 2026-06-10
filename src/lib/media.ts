/**
 * Media library types + helpers.
 *
 * Mirrors the landing-dxp "media management" concept (a reusable asset library
 * + picker), but assets live in the **organization's S3 bucket** instead of the
 * repo. Uploads go through the organization-configurations service's presigned
 * endpoint; the gallery lists objects already in the bucket.
 *
 * Stored content value is always a plain absolute URL string (CloudFront), so
 * rendering is a passthrough — no base prefixing like the static-site skill.
 */

/** One asset in the org media library (an object under the bucket `media/` prefix). */
export interface MediaItem {
  /** Public CloudFront URL — what gets stored in content. */
  url: string;
  /** S3 object key. */
  key: string;
  /** Display file name (last path segment). */
  filename: string;
  /** Size in bytes. */
  size?: number;
  /** ISO-8601 last-modified timestamp. */
  lastModified?: string;
}

/** Presigned upload response from the backend. */
export interface PresignedUpload {
  uploadUrl: string;
  fileUrl: string;
  key: string;
}

/**
 * Resolve a stored ref to a usable `<img src>` / `href`.
 *
 * Content refs are absolute URLs (CloudFront) — or legacy data-URLs/external
 * URLs — so this is effectively identity. Kept as a named helper so call sites
 * read intentionally and we have one place to evolve if base-prefixing is ever
 * needed.
 */
export function resolveMediaUrl(ref?: string | null): string {
  return ref ?? "";
}

/** True when a value looks like an image we can preview (URL or data-URL). */
export function isPreviewableImage(ref?: string | null): boolean {
  if (!ref) return false;
  return /^(https?:)?\/\//i.test(ref) || ref.startsWith("data:");
}
