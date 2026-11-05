import { useEffect, useId, useRef, useState } from "react";
import { Button, Icon, Spinner } from "@/components/ui";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { useOverlayLayer } from "@/hooks/useOverlayLayer";
import { useLanguage } from "@/contexts/LanguageContext";
import { localizeTemplate } from "./localizeTemplate";
import type { Template } from "@/types";

export function templateDemoUrl(template: Pick<Template, "name" | "preview_url">): string {
  const domain = import.meta.env.VITE_BASE_DOMAIN || "tsuru.jcampos.dev";
  const fallback = `https://${template.name}.examples.${domain}`;
  try {
    const url = new URL(template.preview_url || fallback);
    return url.protocol === "https:" ? url.href : fallback;
  } catch {
    return fallback;
  }
}

/** A live storefront stays inside this overlay while the gallery retains its state. */
export function TemplateSitePreview({ template, onClose }: { template: Template; onClose: () => void }) {
  const { t, language } = useLanguage();
  const panelRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const { isTopLayer } = useOverlayLayer({ active: true, panelRef, dismissible: true, onClose });
  const title = localizeTemplate(template, language).displayName;
  useEffect(() => {
    const dialog = panelRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return <OverlayPortal>
    <dialog ref={panelRef} aria-modal="true" aria-labelledby={titleId}
      className="m-auto p-0 w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[1440px] h-[92dvh] max-h-[92dvh] bg-card text-foreground border border-border rounded-xl shadow-modal overflow-hidden outline-none backdrop:bg-foreground/45 backdrop:backdrop-blur-[2px]"
      onCancel={event => { event.preventDefault(); if (isTopLayer()) onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget || !isTopLayer()) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}>
      <div className="h-full min-h-0 flex flex-col">
        <header className="flex items-center gap-3 p-3 sm:px-5 border-b border-border shrink-0">
          <span className="icon-pill icon-pill-primary-soft shrink-0" aria-hidden="true"><Icon name="store" size={20} /></span>
          <h2 id={titleId} className="t-h3 !mb-0 min-w-0 flex-1 truncate">{title}</h2>
          <Button variant="ghost" size="sm" icon="refresh" aria-label={t("common.refresh")}
            onClick={() => { setLoading(true); setReload(value => value + 1); }} />
          <Button variant="ghost" size="sm" icon="close" aria-label={t("common.close")} onClick={onClose} data-overlay-autofocus />
        </header>
        <div className="relative flex-1 min-h-0 bg-background">
          {loading && <div className="absolute inset-0 flex items-center justify-center pointer-events-none" role="status"><Spinner label={t("common.loading")} /></div>}
          <iframe key={reload} src={templateDemoUrl(template)} title={`${t("template.preview.liveDemo")}: ${title}`}
            className="relative w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-forms" referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setLoading(false)} />
        </div>
      </div>
    </dialog>
  </OverlayPortal>;
}
