import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { salesApi, authOrgPath } from "@/lib/api";
import type { MediaItem, PresignedUpload } from "@/lib/media";

/**
 * Organization media library hook (organization-configurations service).
 *
 * - `listQuery` — GET `/organizations/{org}/media`: the gallery of assets
 *   already in the org bucket (newest first).
 * - `upload` — two-step direct-to-S3 upload: request a presigned PUT URL, then
 *   PUT the raw file to S3. Returns the new {@link MediaItem}; invalidates the
 *   gallery so it reappears for reuse.
 *
 * Reached via the `salesApi` client + {@link authOrgPath} — the org-config
 * Lambda is mounted at `/organizations/{org}/...` on the sales API gateway
 * (same place the POS already calls `/configurations`, `/credentials`).
 */
export function useMediaLibrary(orgId: string | undefined) {
  const qc = useQueryClient();

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

      // Direct browser → S3 PUT. No Authorization header — the presigned URL
      // is itself the credential. Content-Type MUST match what was signed.
      const put = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!put.ok) throw new Error(`S3 upload failed (${put.status})`);

      return {
        url: presigned.fileUrl,
        key: presigned.key,
        filename: file.name,
        size: file.size,
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media", orgId] }),
  });

  return { listQuery, upload };
}
