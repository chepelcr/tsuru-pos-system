import { useId, useRef, useState } from "react";
import { useOrgContext } from "@/contexts/OrgContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useMediaLibrary } from "@/hooks/useMediaLibrary";
import { usePermissions } from "@/hooks/useRbac";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FadeIn } from "@/components/ui/FadeIn";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { useOverlayLayer } from "@/hooks/useOverlayLayer";
import { resolveMediaUrl, type MediaItem } from "@/lib/media";

/**
 * Media library management page (online-store / storefront section).
 *
 * Landing-dxp "media library" pattern, server-backed by the `organization_media`
 * registry (via {@link useMediaLibrary}): a grid of all org assets, with an
 * Add button that opens an upload modal (dropzone + add-by-URL), plus per-tile
 * copy-URL and delete. Picking media into content fields is done by the
 * `<MediaPicker>`; this page is the manage-everything view.
 */
export default function GalleryPage() {
  const { orgId } = useOrgContext();
  const { t } = useLanguage();
  usePageTitle([t("gallery.title")]);
  const { listQuery, upload, addExternal, remove } = useMediaLibrary(orgId);
  const { confirm, ConfirmModal } = useConfirmModal();

  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canCreate = !permsReady || can("storefront", "create", "gallery");
  const canUpload = !permsReady || can("storefront", "upload", "gallery");
  const canDelete = !permsReady || can("storefront", "delete", "gallery");
  // The Add modal hosts both the upload dropzone and add-by-URL.
  const canAdd = canCreate || canUpload;

  const items: MediaItem[] = listQuery.data ?? [];
  const [addOpen, setAddOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addPanelRef = useRef<HTMLDivElement>(null);
  const addTitleId = useId();
  const closeAdd = () => setAddOpen(false);
  const { isTopLayer: isAddTopLayer } = useOverlayLayer({
    active: addOpen,
    panelRef: addPanelRef,
    dismissible: true,
    onClose: closeAdd,
  });

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

  const onAddUrl = async () => {
    const url = urlDraft.trim();
    if (!url) return;
    setUrlDraft("");
    setError(null);
    try {
      await addExternal.mutateAsync(url);
    } catch {
      setError(t("media.uploadError"));
    }
  };

  const copy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((k) => (k === id ? null : k)), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const askDelete = (item: MediaItem) =>
    confirm({
      title: t("gallery.deleteTitle"),
      message: t("gallery.deleteMessage", { name: item.filename }),
      variant: "destructive",
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => { await remove.mutateAsync(item.id); },
    });

  const busy = upload.isPending || addExternal.isPending;

  return (
    <div className="px-6 pt-6 pb-10 max-w-[1100px] mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="t-h1 mb-1.5">{t("gallery.title")}</h1>
          <p className="t-body text-muted-foreground">{t("gallery.subtitle")}</p>
        </div>
        {canAdd && (
          <Button variant="primary" size="sm" icon="plus" onClick={() => { setError(null); setAddOpen(true); }}>
            {t("gallery.add")}
          </Button>
        )}
      </div>

      {/* Grid */}
      {listQuery.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="aspect-square bg-muted/40 animate-pulse" />
              <div className="p-2.5 flex flex-col gap-1.5">
                <div className="skeleton-block animate-pulse h-3 w-3/4" />
                <div className="flex items-center gap-1.5">
                  <div className="skeleton-block animate-pulse h-6 w-20 rounded-md" />
                  <div className="bg-muted/40 animate-pulse h-6 w-6 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : listQuery.isError ? (
        <EmptyState icon="alertTri" title={t("media.loadError")}
          action={<Button variant="outline" size="sm" icon="refresh" onClick={() => listQuery.refetch()}>{t("common.retry")}</Button>} />
      ) : items.length === 0 ? (
        <EmptyState icon="upload" title={t("media.empty")}
          action={canAdd ? <Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>{t("gallery.add")}</Button> : undefined} />
      ) : (
        <FadeIn>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map((item) => (
              <div key={item.id} className="card overflow-hidden">
                <div className="aspect-square bg-muted/35 overflow-hidden">
                  <img src={resolveMediaUrl(item.url)} alt={item.alt || item.filename} className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5 flex flex-col gap-1.5">
                  <span className="t-xs font-mono truncate" title={item.filename}>{item.filename}</span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="xs" icon={copiedId === item.id ? "check" : "copy"}
                      onClick={() => copy(item.url, item.id)}>
                      {copiedId === item.id ? t("gallery.copied") : t("gallery.copyUrl")}
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="xs" icon="trash" disabled={remove.isPending}
                        aria-label={t("common.delete")} onClick={() => askDelete(item)} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      )}

      {/* Add modal — dropzone + add-by-URL (like the import modal) */}
      {addOpen && (
        <OverlayPortal>
        <div
          className="fixed inset-0 z-drawer-modal bg-foreground/45 backdrop-blur-[2px] flex items-center justify-center p-4 fade-in"
          onClick={() => { if (isAddTopLayer()) closeAdd(); }}
        >
          <div
            ref={addPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={addTitleId}
            tabIndex={-1}
            className="w-full max-w-[480px] max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card border border-border rounded-xl shadow-modal p-5 fade-up outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 id={addTitleId} className="t-h4 !mb-0">{t("gallery.addTitle")}</h3>
              <button type="button" className="btn btn-ghost btn-sm btn-icon"
                onClick={closeAdd} aria-label={t("common.close")} data-overlay-autofocus>
                <Icon name="close" size={16} />
              </button>
            </div>

            {canUpload && (
              <>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => !busy && inputRef.current?.click()}
                  className={`w-full h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                    dragging ? "border-primary bg-primary/[0.06]" : "border-border bg-muted/35"
                  }`}
                >
                  {busy ? (
                    <><Spinner /><span className="t-xs text-muted-foreground">{t("common.uploading")}</span></>
                  ) : (
                    <><Icon name="upload" size={26} className="text-muted-foreground" />
                      <span className="t-xs text-muted-foreground text-center px-3">{t("media.uploadHint")}</span></>
                  )}
                </div>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
              </>
            )}

            {error && <p className="mt-2 t-xs text-destructive">{error}</p>}

            {canCreate && (
              <div className="flex items-end gap-2 mt-3">
                <div className="flex-1">
                  <span className="label-section">{t("media.urlField")}</span>
                  <Input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)}
                    placeholder={t("media.urlPlaceholder")}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void onAddUrl(); } }} />
                </div>
                <Button variant="outline" size="sm" icon="plus" onClick={() => void onAddUrl()} disabled={!urlDraft.trim() || busy}>
                  {t("common.add")}
                </Button>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button variant="primary" size="sm" onClick={closeAdd}>{t("common.close")}</Button>
            </div>
          </div>
        </div>
        </OverlayPortal>
      )}

      <ConfirmModal />
    </div>
  );
}
