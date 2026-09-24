import { useRef, useState } from "react";
import { Icon, Spinner } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { api, orgSettingsPath } from "@/lib/api";

interface OrganizationLogoPickerProps {
  userId: string;
  orgId: string;
  value: string;
  onChange: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
}

interface PresignedUpload {
  uploadUrl: string;
  fileUrl: string;
}

/** The shared upload bucket is available before a store bucket is provisioned. */
export function OrganizationLogoPicker({
  userId,
  orgId,
  value,
  onChange,
  onUploadingChange,
  disabled = false,
}: OrganizationLogoPickerProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError(t("orgSettings.general.logoInvalid"));
      return;
    }
    setError(null);
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const extension = file.type === "image/png" ? "png" : "jpg";
      const target = await api.post<PresignedUpload>(
        orgSettingsPath(userId, orgId, "/upload/presigned"),
        {
          fileName: `logo-${Date.now()}.${extension}`,
          fileType: file.type,
          folder: `organization-logos/${orgId}`,
        },
      );
      const response = await fetch(target.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);
      onChange(target.fileUrl);
    } catch {
      setError(t("orgSettings.general.logoUploadError"));
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-lg border border-border bg-muted/35 overflow-hidden flex items-center justify-center">
          {value ? (
            <img src={value} alt={t("orgSettings.general.logo")} className="w-full h-full object-contain" />
          ) : (
            <Icon name="store" size={25} className="text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Spinner size={14} /> : <Icon name="upload" size={14} />}
            {t("orgSettings.general.logoUpload")}
          </button>
          {value && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={disabled || uploading}
              onClick={() => onChange("")}
            >
              {t("common.remove")}
            </button>
          )}
        </div>
      </div>
      {error && <p className="t-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}
