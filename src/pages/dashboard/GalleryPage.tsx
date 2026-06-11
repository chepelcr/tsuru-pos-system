import { useRef, useState } from "react";
import { useOrgContext } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useMediaLibrary } from "@/hooks/useMediaLibrary";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { resolveMediaUrl, type MediaItem } from "@/lib/media";

/**
 * Media library management page (online-store / storefront section).
 *
 * Landing-dxp "media library" pattern — a grid of all org assets with upload
 * (dropzone) + add-by-URL + delete — but backed by the org S3 bucket via
 * {@link useMediaLibrary} (presigned upload + list + delete) instead of a
 * bundled media.json. Picking media into content fields is done by the
 * `<MediaPicker>`; this page is the manage-everything view.
 */
export default function GalleryPage() {
  const { orgId } = useOrgContext();
  const { t } = useLanguage();
  usePageTitle([t("gallery.title")]);
  const { listQuery, upload, remove } = useMediaLibrary(orgId);
  const { confirm, ConfirmModal } = useConfirmModal();

  const items: MediaItem[] = listQuery.data ?? [];
  const [urlDraft, setUrlDraft] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = async (file: File) => {
    setError(null);
    try {
      await upload.mutateAsync(file);
    } catch {
      setError(t("media.uploadError"));
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void doUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) void doUpload(file);
  };

  const copy = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  const askDelete = (item: MediaItem) =>
    confirm({
      title: t("gallery.deleteTitle"),
      message: t("gallery.deleteMessage", { name: item.filename }),
      variant: "destructive",
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => { await remove.mutateAsync(item.key); },
    });

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1100px] mx-auto">
      <div className="mb-6">
        <h1 className="t-h1 mb-1.5">{t("gallery.title")}</h1>
        <p className="t-body text-muted-foreground">{t("gallery.subtitle")}</p>
      </div>

      {/* Upload + URL add */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end mb-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !upload.isPending && inputRef.current?.click()}
          className={`h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
            dragging ? "border-primary bg-primary/[0.06]" : "border-border bg-muted/35"
          }`}
        >
          {upload.isPending ? (
            <><Spinner /><span className="t-xs text-muted-foreground">{t("media.uploading")}</span></>
          ) : (
            <><Icon name="upload" size={24} className="text-muted-foreground" />
              <span className="t-xs text-muted-foreground text-center px-3">{t("media.uploadHint")}</span></>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <span className="label-section">{t("media.urlField")}</span>
            <Input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder={t("media.urlPlaceholder")}
              className="sm:w-64"
            />
          </div>
        </div>
      </div>

      {error && <p className="mb-3 t-sm text-destructive">{error}</p>}

      {/* Grid */}
      {listQuery.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : listQuery.isError ? (
        <EmptyState icon="alertTri" title={t("media.loadError")}
          action={<Button variant="outline" size="sm" icon="refresh" onClick={() => listQuery.refetch()}>{t("common.retry")}</Button>} />
      ) : items.length === 0 ? (
        <EmptyState icon="upload" title={t("media.empty")} />
      ) : (
        <FadeIn>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((item) => (
              <div key={item.key} className="card overflow-hidden group">
                <div className="aspect-square bg-muted/35 overflow-hidden">
                  <img src={resolveMediaUrl(item.url)} alt={item.filename} className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5 flex flex-col gap-1.5">
                  <span className="t-xs font-mono truncate" title={item.filename}>{item.filename}</span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="xs" icon={copiedKey === item.key ? "check" : "copy"}
                      onClick={() => copy(item.url, item.key)}>
                      {copiedKey === item.key ? t("gallery.copied") : t("gallery.copyUrl")}
                    </Button>
                    <Button variant="ghost" size="xs" icon="trash"
                      disabled={remove.isPending}
                      aria-label={t("common.delete")}
                      onClick={() => askDelete(item)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      <ConfirmModal />
    </div>
  );
}
