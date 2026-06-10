import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useLanguage } from "@/contexts/LanguageContext";

interface QrShareModalProps {
  open: boolean;
  onClose: () => void;
  /** Public store URL to encode. When null, the modal shows an unavailable state. */
  siteUrl: string | null;
  /** Used to name the downloaded PNG file. */
  subdomain?: string;
}

export function QrShareModal({ open, onClose, siteUrl, subdomain }: QrShareModalProps) {
  const { t } = useLanguage();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setQrDataUrl(null);
      setError(null);
      setCopied(false);
      return;
    }

    if (!siteUrl) {
      setQrDataUrl(null);
      return;
    }

    setError(null);
    setQrDataUrl(null);

    QRCode.toDataURL(siteUrl, {
      errorCorrectionLevel: "M",
      width: 256,
      margin: 4,
    })
      .then((dataUrl: string) => setQrDataUrl(dataUrl))
      .catch(() => setError(t("qr.error")));
  }, [open, siteUrl, t]);

  const handleDownload = async () => {
    if (!qrDataUrl) return;
    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-${subdomain ?? "store"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError(t("qr.downloadError"));
    }
  };

  const handleCopy = async () => {
    if (!siteUrl) return;
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("qr.copyError"));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("qr.title")}
      description={t("qr.description")}
      icon="store"
    >
      <div className="flex flex-col items-center gap-4">
        {/* QR preview */}
        {error ? (
          <div className="w-56 h-56 rounded-xl bg-muted flex items-center justify-center">
            <p className="t-sm text-destructive text-center px-4">{error}</p>
          </div>
        ) : !siteUrl ? (
          <div className="w-56 h-56 rounded-xl bg-muted flex flex-col items-center justify-center gap-2 px-4">
            <Icon name="alertCircle" size={28} className="text-muted-foreground" />
            <p className="t-sm text-muted-foreground text-center">{t("qr.noUrl")}</p>
          </div>
        ) : qrDataUrl ? (
          <div className="rounded-xl bg-card border border-border p-3 shadow-card">
            <img src={qrDataUrl} alt={t("qr.imageAlt")} className="w-56 h-56" />
          </div>
        ) : (
          <div className="w-56 h-56 rounded-xl bg-muted/40 animate-pulse flex items-center justify-center">
            <p className="t-sm text-muted-foreground">{t("qr.generating")}</p>
          </div>
        )}

        {/* Site URL */}
        {siteUrl && (
          <div className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2 text-center">
            <p className="t-xs text-muted-foreground mb-0.5">{t("qr.storeUrl")}</p>
            <p className="t-sm font-mono break-all">{siteUrl}</p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button
            variant="outline"
            icon="copy"
            onClick={handleCopy}
            disabled={!siteUrl}
          >
            {copied ? t("qr.copied") : t("qr.copyLink")}
          </Button>
          <Button
            variant="primary"
            icon="download"
            onClick={handleDownload}
            disabled={!qrDataUrl}
          >
            {t("qr.download")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
