import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Icon } from "./Icon";
import { OverlayPortal } from "./OverlayPortal";

export interface SelectFieldOption {
  value: string;
  label: string;
  /** Secondary line under the label (code, description, "unlocks…" copy). */
  hint?: string;
  /** Icon name from the curated set in Icon.tsx. */
  icon?: string;
  disabled?: boolean;
}

export interface SelectFieldProps {
  value?: string | null;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  inputSize?: "sm" | "md" | "lg";
  /**
   * Base input class for the trigger. Defaults to the `.input` scale; callers
   * that already style their field (`pp-input`, `client-input`) pass theirs so
   * the listbox adopts the surrounding form's look instead of fighting it.
   */
  baseClass?: string;
  /**
   * Show the filter box up front once the list is at least this long. 0 never
   * shows it up front — but typing still reveals it, because a list short
   * enough not to warrant a visible search box is not a list you should be
   * unable to type into.
   */
  searchThreshold?: number;
  /**
   * Focus handlers for the trigger. Callers use these to populate options
   * lazily — the POS shift-setup screen fetches its branches on first focus —
   * so they have to reach the button rather than be dropped on the way here.
   */
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/** Show the filter box up front only when scanning the list by eye stops being viable. */
const DEFAULT_SEARCH_THRESHOLD = 8;

/**
 * The app's select control: a token-styled listbox, not a native `<select>`.
 *
 * A native `<option>` honours almost nothing — background and colour, and that
 * is it. No radius, padding, hover state, icon, secondary line or font. The
 * popup is drawn by the OS, so no amount of CSS makes it match the design
 * system. `CountrySelect` already reached this conclusion for flags; this
 * generalizes it so there is ONE listbox implementation instead of two.
 *
 * Portals through {@link OverlayPortal} at `z-drawer-modal` (210) because the
 * common case is a select INSIDE the checkout drawer (`z-drawer`, 200): both
 * are body-level siblings, so anything lower paints behind the drawer — the
 * exact bug that made the payment overflow menu invisible.
 */
export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  id,
  name,
  className = "",
  inputSize = "md",
  baseClass,
  searchThreshold = DEFAULT_SEARCH_THRESHOLD,
  onFocus,
  onBlur,
  ...aria
}: SelectFieldProps) {
  const { t } = useLanguage();
  const reactId = useId();
  const listboxId = `${id ?? reactId}-listbox`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  /**
   * Typing on the trigger reveals the filter box for the rest of this open.
   *
   * Without it, the list is only searchable when it is long enough to render
   * the box up front — so on every shorter list, typing did nothing visible and
   * the only way to search was to open a longer one. It stays revealed even
   * after the query is emptied with backspace: unmounting the input mid-typing
   * drops focus to the body, and the next keystroke would go nowhere.
   */
  const [searchRevealed, setSearchRevealed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; dropUp: boolean } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const showSearch =
    (searchThreshold > 0 && options.length >= searchThreshold) || searchRevealed;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.hint?.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  const sizeClass =
    baseClass ?? (inputSize === "md" ? "input" : `input input-${inputSize}`);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setQuery("");
    setSearchRevealed(false);
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const commit = useCallback(
    (option: SelectFieldOption) => {
      if (option.disabled) return;
      onChange(option.value);
      close();
    },
    [onChange, close],
  );

  // Open with the current selection focused, so ↑/↓ moves from where you are.
  const openMenu = useCallback(() => {
    if (disabled) return;
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  }, [disabled, options, value]);

  // Position against the trigger's viewport rect, flipping up when the menu
  // would run past the bottom edge.
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const estimated = Math.min(filtered.length * 40 + (showSearch ? 48 : 0) + 8, 320);
      const below = window.innerHeight - r.bottom;
      const dropUp = below < estimated && r.top > below;
      setPos({
        top: dropUp ? Math.max(8, r.top - estimated - 6) : r.bottom + 6,
        left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
        width: r.width,
        dropUp,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, filtered.length, showSearch]);

  useEffect(() => {
    if (open && showSearch) searchRef.current?.focus();
  }, [open, showSearch]);

  // Outside click (covers the portaled menu, which is not a DOM descendant).
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  // Keep the active row in view while arrowing.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    menuRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const step = (delta: number) => {
    if (filtered.length === 0) return;
    setActiveIndex((current) => {
      let next = current;
      for (let i = 0; i < filtered.length; i++) {
        next = (next + delta + filtered.length) % filtered.length;
        if (!filtered[next]?.disabled) return next;
      }
      return current;
    });
  };

  const edge = (which: "first" | "last") => {
    const order = which === "first"
      ? filtered.map((_, i) => i)
      : filtered.map((_, i) => filtered.length - 1 - i);
    const found = order.find((i) => !filtered[i].disabled);
    if (found !== undefined) setActiveIndex(found);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    // The same handler is bound to the trigger AND to the filter input; the
    // text-editing keys belong to whichever of the two actually holds an
    // editable value.
    const fromSearch = e.target === searchRef.current;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        return;
      case "ArrowDown":
        e.preventDefault();
        step(1);
        return;
      case "ArrowUp":
        e.preventDefault();
        step(-1);
        return;
      case "Home":
        e.preventDefault();
        edge("first");
        return;
      case "End":
        e.preventDefault();
        edge("last");
        return;
      case "Tab":
        close(false);
        return;
      case "Enter":
      case " ": {
        // Space types into the filter box rather than selecting when searching.
        if (e.key === " " && showSearch) return;
        e.preventDefault();
        const option = filtered[activeIndex];
        if (option) commit(option);
        return;
      }
      case "Backspace":
        // The filter input edits its own value (caret position and all); only
        // a keystroke landing on the TRIGGER is ours to interpret.
        if (!fromSearch && query) {
          e.preventDefault();
          setQuery((q) => q.slice(0, -1));
          setActiveIndex(0);
        }
        return;
      default:
        break;
    }

    // Typing filters the list, wherever the focus happens to be.
    //
    // This used to be a type-ahead that only MOVED the highlight to the first
    // option starting with the typed prefix, and only on lists too short to
    // show the filter box. The result was a select that looked like it ignored
    // the keyboard: nothing on screen changed as you typed, and the only way to
    // actually search was to open a list long enough to render the box and
    // click into it. Typing now does the same thing everywhere — it filters —
    // and reveals the box so you can see what you typed.
    if (!fromSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setSearchRevealed(true);
      setQuery((q) => q + e.key);
      setActiveIndex(0);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
        }
        aria-label={aria["aria-label"]}
        aria-labelledby={aria["aria-labelledby"]}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          sizeClass,
          // min-w-0 all the way down: a flex item defaults to min-width:auto (its
          // content width), so a long label ("USD — Dólar estadounidense") would
          // refuse to shrink, overflow its grid column and spill out of the drawer
          // instead of truncating.
          "w-full min-w-0 flex items-center justify-between gap-2 text-left",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        <span className="flex items-center gap-2 min-w-0 overflow-hidden">
          {selected?.icon && <Icon name={selected.icon} size={15} className="flex-shrink-0" />}
          <span className="truncate min-w-0">
            {selected?.label ?? placeholder ?? t("placeholder.selectOption")}
          </span>
        </span>
        <Icon
          name="chevronDown"
          size={15}
          className={cn("flex-shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && pos && (
        <OverlayPortal>
          <div
            ref={menuRef}
            className={cn(
              "dropdown-menu fixed z-drawer-modal max-h-[320px] overflow-y-auto fade-up",
              pos.dropUp && "dropdown-menu-up",
            )}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {showSearch && (
              <div className="p-1 pb-1.5">
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                  onKeyDown={handleKeyDown}
                  placeholder={t("common.search")}
                  className="input input-sm w-full"
                />
              </div>
            )}

            <div role="listbox" id={listboxId} aria-label={aria["aria-label"]}>
              {filtered.length === 0 && (
                <div className="px-3 py-2 t-sm text-muted-foreground">
                  {t("common.noResults")}
                </div>
              )}

              {filtered.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <div
                    key={option.value}
                    id={`${listboxId}-opt-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                    onClick={() => commit(option)}
                    className={cn(
                      "flex items-start gap-2 px-2.5 py-1.5 rounded-md cursor-pointer",
                      isActive && !option.disabled && "bg-muted",
                      isSelected && "text-primary font-semibold",
                      option.disabled && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    {option.icon && (
                      <Icon name={option.icon} size={15} className="mt-0.5 flex-shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate t-sm">{option.label}</span>
                      {option.hint && (
                        <span className="block t-xs text-muted-foreground">{option.hint}</span>
                      )}
                    </span>
                    {isSelected && (
                      <Icon name="check" size={14} className="mt-0.5 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </OverlayPortal>
      )}
    </>
  );
}
