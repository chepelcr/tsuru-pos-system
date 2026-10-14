import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/utils/avatar";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  alt?: string;
}

export function UserAvatar({ src, name, className, alt = "" }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return (
    <span className={cn("w-7 h-7 shrink-0 overflow-hidden rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-[11px]", className)}>
      {src && !failed ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials(name || "Usuario")}</span>
      )}
    </span>
  );
}
