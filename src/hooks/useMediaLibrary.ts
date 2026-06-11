import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { salesApi, authOrgPath } from "@/lib/api";
import type { MediaItem, PresignedUpload } from "@/lib/media";

/**
 * Organization media library hook (organization-configurations service).
 *
 * Backed by the `organization_media` registry (rows), not raw S3 listing:
 * - `listQuery` — GET `/organizations/{org}/media` → the gallery (newest first).
 * - `upload` — presigned PUT to S3, then POST `/media` to register the row.
 * - `addExternal` — POST `/media` with an off-site URL (source=external).
 * - `remove` — DELETE `/media/{id}` (drops the row + the S3 object for locals).
 *
 * Reached via `salesApi` + {@link authOrgPath} (the org-config Lambda is mounted
 * at `/organizations/{org}/...` on the sales API gateway).
 */
export function useMediaLibrary(orgId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["media", orgId] });

  const listQuery = useQuery({
    queryKey: ["media", orgId],
    enabled: !!orgId,
    queryFn: () => salesApi.get<MediaItem[]>(authOrgPath(orgId!, "/media")),
  });

  const upload = useMutation({
    mutationFn: async (file: File): Promise<MediaItem> => {
      const contentType = file.type || "application/octet-stream";
      const presigned = await salesApi.post<PresignedUpload>(
        authOrgPath(orgId!, "/media/presigned"),
        { fileName: file.name, fileType: contentType },
      );
      const put = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!put.ok) throw new Error(`S3 upload failed (${put.status})`);
      // Register the uploaded object in the library registry.
      return salesApi.post<MediaItem>(authOrgPath(orgId!, "/media"), {
        url: presigned.fileUrl,
        key: presigned.key,
        filename: file.name,
        mime: contentType,
        size: file.size,
        kind: "image",
        source: "local",
      });
    },
    onSuccess: invalidate,
  });

  const addExternal = useMutation({
    mutationFn: (url: string): Promise<MediaItem> =>
      salesApi.post<MediaItem>(authOrgPath(orgId!, "/media"), {
        url,
        filename: url.split("/").pop() || url,
        kind: "image",
        source: "external",
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => salesApi.delete(authOrgPath(orgId!, `/media/${id}`)),
    onSuccess: invalidate,
  });

  return { listQuery, upload, addExternal, remove };
}
