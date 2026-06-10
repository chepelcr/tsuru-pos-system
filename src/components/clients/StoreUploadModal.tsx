import { useRef, useState } from "react";
import { Modal, Icon } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import type { StoreUploadResult } from "@/types";

interface StoreUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUpload: (file: string, filename: string) => Promise<StoreUploadResult>;
}

/** Read a File as base64, stripping the `data:…;base64,` prefix. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function StoreUploadModal({ open, onClose, onUpload }: StoreUploadModalProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<StoreUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setUploading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickFile = (file: File | null) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(selectedFile);
      const res = await onUpload(base64, selectedFile.name);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("stores.uploadError"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t("stores.uploadTitle")}
      description={t("stores.uploadDescription")}
      icon="upload"
      confirm={
        result
          ? { label: t("common.close"), onClick: handleClose, variant: "primary" }
          : {
              label: uploading ? t("stores.uploading") : t("stores.uploadExcel"),
              onClick: handleUpload,
              variant: "primary",
              loading: uploading,
              loadingLabel: t("stores.uploading"),
              disabled: !selectedFile || uploading,
            }
      }
      cancel={result ? undefined : { label: t("common.cancel"), onClick: handleClose, variant: "outline", disabled: uploading }}
    >
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/20"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="icon-pill icon-pill-muted mx-auto mb-2 w-10 h-10">
            <Icon name="upload" size={18} />
          </div>
          {selectedFile ? (
            <p className="t-sm font-semibold text-foreground break-all">{selectedFile.name}</p>
          ) : (
            <p className="t-sm text-muted-foreground">{t("stores.selectFile")}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </button>

        {result && (
          <p className="t-sm text-success font-semibold text-center">
            {result.count} {t("stores.uploadSuccess")}
          </p>
        )}
        {error && <p className="t-sm text-destructive text-center">{error}</p>}
      </div>
    </Modal>
  );
}
