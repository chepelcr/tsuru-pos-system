import { useEffect, useId, useRef, useState } from "react";
import { Icon, Spinner } from "@/components/ui";
import { UserAvatar } from "@/components/common/UserAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUpdateProfilePhoto } from "@/hooks/useProfile";

interface ProfilePhotoPickerProps {
  userId: string;
  name: string;
  value?: string | null;
  onSaved: (url: string) => void;
}

export function ProfilePhotoPicker({ userId, name, value, onSaved }: ProfilePhotoPickerProps) {
  const { t } = useLanguage();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const upload = useUpdateProfilePhoto(userId);
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const selectPhoto = async (file: File) => {
    setSaved(false);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError(t("profile.photo.invalid"));
      return;
    }
    setError(undefined);
    setPreview(URL.createObjectURL(file));
    try {
      const url = await upload.mutateAsync(file);
      onSaved(url);
      setSaved(true);
    } catch {
      setError(t("profile.photo.error"));
    } finally {
      setPreview(undefined);
    }
  };

  return (
    <div className="mb-5 border-b border-border pb-5 space-y-2" aria-busy={upload.isPending}>
      <div className="flex items-center gap-4">
        <UserAvatar src={preview || value} name={name} alt={t("profile.photo.title")} className="h-20 w-20 text-2xl" />
        <div className="min-w-0 space-y-2">
          <p className="t-sm font-semibold">{t("profile.photo.title")}</p>
          <input
            id={inputId}
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label={t("profile.photo.title")}
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void selectPhoto(file);
            }}
          />
          <button type="button" className="btn btn-outline btn-sm" disabled={upload.isPending} onClick={() => input.current?.click()}>
            {upload.isPending ? <Spinner size={14} /> : <Icon name="upload" size={14} />}
            {t(upload.isPending ? "profile.photo.saving" : value ? "profile.photo.change" : "profile.photo.add")}
          </button>
          <p className="t-xs text-muted-foreground">{t("profile.photo.hint")}</p>
        </div>
      </div>
      {error && <p className="t-xs text-destructive" role="alert">{error}</p>}
      {saved && <p className="t-xs text-success" role="status">{t("profile.photo.saved")}</p>}
    </div>
  );
}
