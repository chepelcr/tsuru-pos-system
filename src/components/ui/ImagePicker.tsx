import React, { useRef, useState } from "react";
import { Icon } from "./Icon";

interface ImagePickerProps {
  currentUrl?: string | null;
  onFileChange: (file: File | null) => void;
  size?: number;
}

export function ImagePicker({ currentUrl, onFileChange }: ImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);

  const applyFile = (file: File) => {
    setPreview(URL.createObjectURL(file));
    onFileChange(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) applyFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) applyFile(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onFileChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const displaySrc = preview ?? currentUrl;

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !displaySrc && inputRef.current?.click()}
        className={`w-full h-40 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden relative transition-colors ${
          dragging ? "border-primary bg-primary/[0.06]" : "border-border bg-muted/35"
        } ${displaySrc ? "cursor-default" : "cursor-pointer"}`}
      >
        {displaySrc ? (
          <>
            <img
              src={displaySrc}
              alt="preview"
              className="w-full h-full object-cover"
            />
            <div
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
              className={`absolute inset-0 bg-foreground/45 flex items-center justify-center gap-2 transition-opacity ${
                hovering ? "opacity-100" : "opacity-0"
              }`}
            >
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs px-3.5 py-1 rounded-md border border-white/60 bg-white/15 text-white cursor-pointer backdrop-blur-[4px]"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs px-3.5 py-1 rounded-md border border-destructive/60 bg-destructive/20 text-destructive-foreground cursor-pointer backdrop-blur-[4px]"
              >
                Eliminar
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground select-none">
            <Icon name="upload" size={28} />
            <div className="text-center">
              <div className="text-[13px] font-semibold">Arrastra una imagen aquí</div>
              <div className="t-xs text-muted-foreground">o haz clic para seleccionar</div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
