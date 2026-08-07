import { useId, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { Input } from "./Input";
import { Spinner } from "./Spinner";
import { OverlayPortal } from "./OverlayPortal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrgContext } from "@/contexts/OrgContext";
import { useMediaLibrary } from "@/hooks/useMediaLibrary";
import { useOverlayLayer } from "@/hooks/useOverlayLayer";
import { isPreviewableImage, resolveMediaUrl, type MediaItem } from "@/lib/media";

interface MediaPickerProps {
  /** Stored image ref (absolute URL). */
  value: string | null | undefined;
  /** Persist the new ref. Empty string clears. */
  onChange: (ref: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Reusable image field backed by the **organization media library** (S3).
 *
 * Mirrors the landing-dxp media picker — preview + Select/Change/Clear + raw-ref
 * input + a modal with an upload dropzone, URL paste, and a reusable gallery —
 * but uploads land in the org's S3 bucket (via {@link useMediaLibrary}) and the
 * gallery lists what's already there. Stores a plain absolute URL string.
 *
 * Resolves `orgId` from {@link useOrgContext} so call sites only pass
 * `value`/`onChange` — a drop-in for the old `<ImagePicker>` (which yielded a
 * `File`); here the upload happens inside the picker and the URL is stored.
 */
export function MediaPicker({ value, onChange, disabled = false, className }: MediaPickerProps) {
  const { t } = useLanguage();
  const { orgId } = useOrgContext();
  const { listQuery, upload, addExternal } = useMediaLibrary(orgId);

  const [open, setOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = () => setOpen(false);
  const { isTopLayer } = useOverlayLayer({ active: open, panelRef, dismissible: true, onClose: close });

  const items: MediaItem[] = listQuery.data ?? [];
  const previewSrc = resolveMediaUrl(value);
  const busy = upload.isPending;

  const choose = (ref: string) => {
    onChange(ref);
    setOpen(false);
  };

  const handleUpload = async (file: File) => {
    setError(null);
    try {
      const item = await upload.mutateAsync(file);
      choose(item.url);
    } catch {
      setError(t("media.uploadError"));
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) void handleUpload(file);
  };

  const onAddUrl = async () => {
    const url = urlDraft.trim();
    if (!url) return;
    setUrlDraft("");
    setError(null);
    try {
      // Register the external URL in the library, then select it.
      const item = await addExternal.mutateAsync(url);
      choose(item.url);
    } catch {
      choose(url); // fall back to storing the raw ref even if registration fails
    }
  };

  return (
    <div className={`flex flex-col gap-2.5 ${className ?? ""}`}>
      {/* ── Field row ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="w-20 h-20 flex-shrink-0 rounded-lg border border-border bg-muted/35 overflow-hidden flex items-center justify-center text-muted-foreground hover:border-primary transition-colors disabled:opacity-55"
          aria-label={value ? t("media.change") : t("media.select")}
        >
          {isPreviewableImage(previewSrc) ? (
            <img src={previewSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <Icon name="upload" size={22} />
          )}
        </button>

        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              icon="upload"
              disabled={disabled}
              onClick={() => setOpen(true)}
            >
              {value ? t("media.change") : t("media.select")}
            </Button>
            {value && (
              <Button
                variant="ghost"
                size="sm"
                icon="close"
                disabled={disabled}
                onClick={() => onChange("")}
              >
                {t("media.clear")}
              </Button>
            )}
          </div>
          {/* Show the current ref read-only as a hint; editing/pasting a URL is
              done inside the modal (keeps the field compact). */}
          {value && (
            <p className="t-xs text-muted-foreground font-mono truncate max-w-full" title={value}>
              {value}
            </p>
          )}
        </div>
      </div>

      {/* ── Library modal ─────────────────────────────────────────────── */}
      {open && (
        <OverlayPortal>
        <div
          className="fixed inset-0 z-drawer-modal bg-foreground/45 backdrop-blur-[2px] flex items-center justify-center p-4 fade-in"
          onClick={() => { if (isTopLayer()) close(); }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="w-full max-w-[560px] max-h-[88dvh] overflow-y-auto bg-card border border-border rounded-xl shadow-modal p-5 fade-up outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 id={titleId} className="t-h4 !mb-0">{t("media.title")}</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={close}
                aria-label={t("common.cancel")}
                data-overlay-autofocus
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            {/* Upload dropzone */}
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
                <>
                  <Spinner />
                  <span className="t-xs text-muted-foreground">{t("common.uploading")}</span>
                </>
              ) : (
                <>
                  <Icon name="upload" size={26} className="text-muted-foreground" />
                  <span className="t-xs text-muted-foreground text-center px-3">
                    {t("media.uploadHint")}
                  </span>
                </>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickFile}
            />

            {error && (
              <p className="mt-2 t-xs text-destructive">{error}</p>
            )}

            {/* URL paste */}
            <div className="flex items-end gap-2 mt-3">
              <div className="flex-1">
                <span className="label-section">{t("media.urlField")}</span>
                <Input
                  type="text"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder={t("media.urlPlaceholder")}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddUrl(); } }}
                />
              </div>
              <Button variant="outline" size="sm" icon="plus" onClick={onAddUrl} disabled={!urlDraft.trim()}>
                {t("common.add")}
              </Button>
            </div>

            {/* Gallery */}
            <div className="mt-4">
              <span className="label-section">{t("media.gallery")}</span>
              {listQuery.isLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : listQuery.isError ? (
                <p className="t-sm text-muted-foreground py-6 text-center">{t("media.loadError")}</p>
              ) : items.length === 0 ? (
                <p className="t-sm text-muted-foreground py-6 text-center">{t("media.empty")}</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {items.map((item) => {
                    const selected = item.url === value;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => choose(item.url)}
                        title={item.filename}
                        className={`aspect-square rounded-lg overflow-hidden border bg-muted/35 transition-all ${
                          selected ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary"
                        }`}
                      >
                        <img src={resolveMediaUrl(item.url)} alt={item.filename} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        </OverlayPortal>
      )}
    </div>
  );
}
