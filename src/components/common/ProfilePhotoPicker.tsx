import { useEffect, useRef, useState, type DragEvent } from "react";
import { Icon } from "@/components/ui";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ProfilePhotoEditor } from "@/components/common/ProfilePhotoEditor";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUpdateProfilePhoto } from "@/hooks/useProfile";
import { cropProfilePhoto, type PhotoPosition } from "@/lib/profilePhotoCrop";

interface ProfilePhotoPickerProps {
  userId: string;
  name: string;
  value?: string | null;
  onSaved: (url: string) => void;
}

export function ProfilePhotoPicker({ userId, name, value, onSaved }: ProfilePhotoPickerProps) {
  const { t } = useLanguage();
  const upload = useUpdateProfilePhoto(userId);
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const selectPhoto = (file: File) => {
    if (inFlight.current) return;
    setSaved(false);
    setOpen(true);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError(t("profile.photo.invalid"));
      return;
    }
    setError(undefined);
    setPreview(URL.createObjectURL(file));
  };

  const close = () => {
    if (inFlight.current) return;
    setOpen(false);
    setPreview(undefined);
    setError(undefined);
  };

  const savePhoto = async (image: HTMLImageElement, zoom: number, position: PhotoPosition) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(undefined);
    try {
      const file = await cropProfilePhoto(image, zoom, position);
      const url = await upload.mutateAsync(file);
      onSaved(url);
      setSaved(true);
      setOpen(false);
      setPreview(undefined);
    } catch {
      setError(t("profile.photo.error"));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const dropPhoto = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) selectPhoto(file);
  };

  return (
    <>
      <div
        className={`mb-5 border-b pb-5 space-y-2 rounded-lg ${dragging ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border"}`}
        aria-busy={saving}
        onDragOver={(event) => { event.preventDefault(); if (!saving) setDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={dropPhoto}
      >
        <div className="flex items-center gap-4">
          <UserAvatar src={value} name={name} alt={t("profile.photo.title")} className="h-20 w-20 shrink-0 text-2xl" />
          <div className="min-w-0 space-y-2">
            <p className="t-sm font-semibold">{t("profile.photo.title")}</p>
            <button type="button" className="btn btn-outline btn-sm min-h-11" disabled={saving} onClick={() => { setSaved(false); setOpen(true); }}>
              <Icon name="upload" size={14} />
              {t(value ? "profile.photo.change" : "profile.photo.add")}
            </button>
            <p className="t-xs text-muted-foreground">{t("profile.photo.hint")}</p>
            <p className="t-xs text-muted-foreground">{t("profile.photo.dropHint")}</p>
          </div>
        </div>
        {saved && <p className="t-xs text-success" role="status">{t("profile.photo.saved")}</p>}
      </div>
      {open && <ProfilePhotoEditor
        src={preview}
        error={error}
        saving={saving}
        onSelect={selectPhoto}
        onClose={close}
        onSave={(image, zoom, position) => void savePhoto(image, zoom, position)}
        onImageError={() => setError(t("profile.photo.unreadable"))}
      />}
    </>
  );
}
