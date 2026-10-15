import { useCallback, useEffect, useLayoutEffect, useId, useRef, useState, type PointerEvent } from "react";
import { Button, Icon, Spinner } from "@/components/ui";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOverlayLayer } from "@/hooks/useOverlayLayer";
import { photoCrop, photoGesture, zoomPhotoAt, type PhotoDimensions, type PhotoPosition, type PhotoTransform } from "@/lib/profilePhotoCrop";

interface ProfilePhotoEditorProps {
  src?: string;
  error?: string;
  saving: boolean;
  removing?: boolean;
  onSelect: (file: File) => void;
  onClose: () => void;
  onRemove?: () => void;
  onSave: (image: HTMLImageElement, zoom: number, position: PhotoPosition) => void;
  onImageError: () => void;
}

export function ProfilePhotoEditor({ src, error, saving, removing, onSelect, onClose, onRemove, onSave, onImageError }: ProfilePhotoEditorProps) {
  const { t } = useLanguage();
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, PhotoPosition>());
  const currentTransform = useRef<PhotoTransform>({ zoom: 1, position: { x: 0, y: 0 } });
  const [dimensions, setDimensions] = useState<PhotoDimensions>();
  const [{ zoom, position }, setTransform] = useState<PhotoTransform>(currentTransform.current);
  const [dragging, setDragging] = useState(false);
  const { isTopLayer } = useOverlayLayer({ active: true, panelRef: panel, dismissible: !saving, onClose });
  const updateTransform = useCallback((next: PhotoTransform) => {
    currentTransform.current = next;
    setTransform(next);
  }, []);

  useLayoutEffect(() => {
    setDimensions(undefined);
    updateTransform({ zoom: 1, position: { x: 0, y: 0 } });
    pointers.current.clear();
  }, [src, updateTransform]);

  useEffect(() => {
    if (saving) pointers.current.clear();
  }, [saving]);

  useEffect(() => {
    const target = viewport.current;
    if (!target || !dimensions || saving) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = target.getBoundingClientRect();
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
      const anchor = { x: (event.clientX - rect.left) / rect.width - 0.5, y: (event.clientY - rect.top) / rect.height - 0.5 };
      updateTransform(zoomPhotoAt(dimensions, currentTransform.current, currentTransform.current.zoom * Math.exp(-event.deltaY * units * 0.002), anchor));
    };
    target.addEventListener("wheel", wheel, { passive: false });
    return () => target.removeEventListener("wheel", wheel);
  }, [dimensions, saving, updateTransform]);

  const crop = dimensions ? photoCrop(dimensions, zoom, position) : undefined;
  const move = (next: PhotoPosition) => {
    if (dimensions && !saving) updateTransform({ zoom, position: photoCrop(dimensions, zoom, next).position });
  };
  const nudge = (x: number, y: number) => move({ x: position.x + x, y: position.y + y });
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width - 0.5, y: (event.clientY - rect.top) / rect.height - 0.5 };
  };
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (saving || !dimensions || event.button !== 0 || pointers.current.size >= 2) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, point(event));
  };
  const movePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (saving || !dimensions || !pointers.current.has(event.pointerId)) return;
    const before = Array.from(pointers.current.values());
    pointers.current.set(event.pointerId, point(event));
    updateTransform(photoGesture(dimensions, currentTransform.current, before, Array.from(pointers.current.values())));
  };

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-drawer-modal bg-foreground/45 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => { if (!saving && isTopLayer()) onClose(); }}>
        <div
          ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-busy={saving} tabIndex={-1}
          className={`w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card border rounded-xl shadow-modal p-5 space-y-4 ${dragging ? "border-primary ring-2 ring-primary" : "border-border"}`}
          onClick={(event) => event.stopPropagation()}
          onDragOver={(event) => { event.preventDefault(); if (!saving) setDragging(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
          onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file && !saving) onSelect(file); }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={`${id}-title`} className="t-h3">{t("profile.photo.editorTitle")}</h2>
              <p id={`${id}-description`} className="t-sm text-muted-foreground mt-1">{t("profile.photo.editorDescription")}</p>
            </div>
            <button type="button" className="btn btn-ghost btn-icon min-h-11 min-w-11 shrink-0" aria-label={t("common.close")} disabled={saving} onClick={onClose}><Icon name="close" /></button>
          </div>

          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label={t("profile.photo.choose")} disabled={saving}
            onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onSelect(file); }} />

          <div className="rounded-lg border border-border bg-muted/40 p-4">
            {src ? (
              <div
                ref={viewport}
                role="group" aria-label={t("profile.photo.position")} aria-describedby={`${id}-moveHint ${id}-keyboardHint`} aria-disabled={saving} tabIndex={0}
                className="relative mx-auto w-56 max-w-full aspect-square overflow-hidden rounded-full border-2 border-primary bg-muted cursor-grab active:cursor-grabbing touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onPointerDown={startDrag}
                onPointerMove={movePointer}
                onPointerUp={(event) => { pointers.current.delete(event.pointerId); }}
                onPointerCancel={(event) => { pointers.current.delete(event.pointerId); }}
                onLostPointerCapture={(event) => { pointers.current.delete(event.pointerId); }}
                onKeyDown={(event) => {
                  const step = event.shiftKey ? 0.1 : 0.03;
                  const directions: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
                  if (directions[event.key]) { event.preventDefault(); nudge(...directions[event.key]); }
                  if (!dimensions || saving) return;
                  if (["+", "=", "-", "_"].includes(event.key)) {
                    event.preventDefault();
                    updateTransform(zoomPhotoAt(dimensions, currentTransform.current, zoom + (["+", "="].includes(event.key) ? 0.1 : -0.1)));
                  }
                  if (event.key === "Home") { event.preventDefault(); updateTransform({ zoom: 1, position: { x: 0, y: 0 } }); }
                }}
              >
                <img key={src} ref={image} src={src} alt={t("profile.photo.preview")} draggable={false}
                  className={`absolute max-w-none pointer-events-none ${crop ? "" : "invisible"}`}
                  style={crop && dimensions ? { width: `${dimensions.width / crop.size * 100}%`, height: `${dimensions.height / crop.size * 100}%`, left: `${-crop.left / crop.size * 100}%`, top: `${-crop.top / crop.size * 100}%` } : undefined}
                  onLoad={(event) => {
                    const img = event.currentTarget;
                    if (img.naturalWidth && img.naturalHeight) {
                      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                      viewport.current?.focus();
                    } else onImageError();
                  }}
                  onError={() => { setDimensions(undefined); onImageError(); }}
                />
                {!crop && !error && <div className="absolute inset-0 flex items-center justify-center" role="status" aria-label={t("common.loading")}><Spinner /></div>}
              </div>
            ) : (
              <button type="button" className="mx-auto flex w-56 max-w-full aspect-square flex-col items-center justify-center gap-3 rounded-full border-2 border-dashed border-border p-5 text-center text-muted-foreground hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => input.current?.click()}>
                <Icon name="upload" size={28} /><span className="t-sm">{t("profile.photo.dropHint")}</span><span className="t-sm font-semibold text-primary">{t("profile.photo.choose")}</span>
              </button>
            )}
            <p id={`${id}-moveHint`} className="t-xs text-center text-muted-foreground mt-3">
              {src ? <>
                <span className="[@media(pointer:fine)]:hidden">{t("profile.photo.moveHint")}</span>
                <span className="hidden [@media(pointer:fine)]:inline">{t("profile.photo.mouseHint")}</span>
              </> : t("profile.photo.hint")}
            </p>
            <p id={`${id}-keyboardHint`} className="sr-only">{t("profile.photo.keyboardHint")}</p>
          </div>

          {src && <div className="space-y-3">
            <div className="flex items-center justify-between gap-3"><span className="t-sm text-muted-foreground">{t("profile.photo.zoom")}</span><span className="t-sm font-medium tabular-nums">{Math.round(zoom * 100)}%</span></div>
            <Button variant="outline" className="w-full min-h-11" disabled={saving} icon="upload" onClick={() => input.current?.click()}>{t("profile.photo.chooseAnother")}</Button>
          </div>}

          {error && <p className="t-sm text-destructive" role="alert">{error}</p>}
          {onRemove && <Button variant="ghost" className="w-full min-h-11 text-destructive hover:bg-destructive/10" icon={removing ? undefined : "trash"} disabled={saving} onClick={onRemove}>{removing && <Spinner size={16} />}{t(removing ? "profile.photo.removing" : "profile.photo.remove")}</Button>}
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
            <Button variant="outline" className="min-h-11" disabled={saving} onClick={onClose}>{t("common.cancel")}</Button>
            <Button variant="primary" className="min-h-11" disabled={!dimensions || saving} onClick={() => { if (image.current && dimensions) onSave(image.current, zoom, position); }}>
              {saving && !removing && <Spinner size={16} />}{t(saving && !removing ? "profile.photo.saving" : "profile.photo.save")}
            </Button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
