import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

export interface MenuItem {
  label: string;
  icon?: string;
  color?: string;
  action: () => void;
  hidden?: boolean;
}

interface MenuProps {
  items: MenuItem[];
  trigger?: React.ReactNode;
  align?: "left" | "right";
}

export function Menu({ items, trigger, align = "right" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const visible = items.filter((i) => !i.hidden);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({ top: rect.bottom + 4, left: rect.left, right: window.innerWidth - rect.right });
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  };

  return (
    <div className="inline-block">
      <div ref={triggerRef} onClick={handleOpen}>
        {trigger ?? (
          <button className="btn btn-ghost btn-sm btn-icon" type="button">
            <Icon name="moreV" size={15} />
          </button>
        )}
      </div>

      {open && createPortal(
        <>
          <div
            className="fixed inset-0 z-popover"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed bg-card border border-border rounded-lg shadow-dropdown z-popover min-w-[170px] overflow-hidden"
            style={{
              top: coords.top,
              ...(align === "right" ? { right: coords.right } : { left: coords.left }),
            }}
          >
            {visible.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  // Close FIRST, and run the action in the next frame — not in
                  // this handler.
                  //
                  // React batches every update in one discrete event into a
                  // single commit, and most of these actions navigate to a
                  // `lazy()` route. A synchronous commit that suspends cannot
                  // land, so `setOpen(false)` was held hostage by the chunk
                  // download: switching organization left this dropdown sitting
                  // on screen until the organizations page had finished loading.
                  //
                  // `requestAnimationFrame` puts the action in a new task, after
                  // React has already committed the close, so the menu is gone
                  // from the DOM before anything can suspend. The route's
                  // Suspense fallback then appears in the same paint — which is
                  // why this is not `startTransition`: a transition would hold
                  // the old page and show no loader at all.
                  setOpen(false);
                  requestAnimationFrame(() => item.action());
                }}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 bg-transparent border-0 cursor-pointer text-[13px] font-sans font-medium text-left hover:bg-muted/60"
                style={item.color ? { color: item.color } : undefined}
              >
                {item.icon && <Icon name={item.icon} size={14} />}
                {item.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
