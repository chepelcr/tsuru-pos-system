import { useEffect, useRef, useState, type DragEvent } from "react";
import { Icon, Spinner } from "@/components/ui";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ProfilePhotoEditor } from "@/components/common/ProfilePhotoEditor";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRemoveProfilePhoto, useUpdateProfilePhoto } from "@/hooks/useProfile";
import { cropProfilePhoto, type PhotoPosition } from "@/lib/profilePhotoCrop";

interface ProfilePhotoPickerProps {
  userId: string;
  name: string;
  value?: string | null;
  onSaved: (url: string | null) => void;
}

export function ProfilePhotoPicker({ userId, name, value, onSaved }: ProfilePhotoPickerProps) {
  const { t } = useLanguage();
  const upload = useUpdateProfilePhoto(userId);
  const remove = useRemoveProfilePhoto(userId);
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const selectPhoto = (file: File) => {
    if (inFlight.current) return;
    setSaved(undefined);
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
      setSaved(t("profile.photo.saved"));
      setOpen(false);
      setPreview(undefined);
    } catch {
      setError(t("profile.photo.error"));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const removePhoto = async () => {
    if (inFlight.current || !value) return;
    inFlight.current = true;
    setSaving(true);
    setSaved(undefined);
    setError(undefined);
    try {
      await remove.mutateAsync();
      onSaved(null);
      setSaved(t("profile.photo.removed"));
      setOpen(false);
      setPreview(undefined);
    } catch {
      setError(t("profile.photo.removeError"));
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
        className={`group relative h-20 w-20 shrink-0 rounded-full ${dragging ? "ring-2 ring-primary ring-offset-2" : ""}`}
        aria-busy={saving}
        onDragOver={(event) => { event.preventDefault(); if (!saving) setDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={dropPhoto}
      >
        <button
          type="button"
          className="relative block h-full w-full rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait"
          aria-label={t(value ? "profile.photo.change" : "profile.photo.add")}
          title={t(value ? "profile.photo.change" : "profile.photo.add")}
          disabled={saving}
          onClick={() => { setSaved(undefined); setError(undefined); setOpen(true); }}
        >
          <UserAvatar src={value} name={name} alt={t("profile.photo.title")} className="h-full w-full text-2xl" />
          <span aria-hidden="true" className={`absolute inset-0 flex items-center justify-center rounded-full bg-foreground/60 text-background transition-opacity motion-reduce:transition-none group-hover:opacity-100 group-focus-within:opacity-100 ${saving ? "opacity-100" : "opacity-0"}`}>
            {saving ? <Spinner size={22} /> : <Icon name="edit" size={22} />}
          </span>
          <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm group-hover:opacity-0 group-focus-within:opacity-0"><Icon name="edit" size={14} /></span>
        </button>
        {saved && <p className="sr-only" role="status">{saved}</p>}
      </div>
      {open && <ProfilePhotoEditor
        src={preview}
        error={error}
        saving={saving}
        removing={remove.isPending}
        onSelect={selectPhoto}
        onClose={close}
        onRemove={value ? () => void removePhoto() : undefined}
        onSave={(image, zoom, position) => void savePhoto(image, zoom, position)}
        onImageError={() => setError(t("profile.photo.unreadable"))}
      />}
    </>
  );
}
