import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MediaPicker } from "@/components/ui/MediaPicker";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePermissions } from "@/hooks/useRbac";
import type { SectionContent } from "@/types/content";

interface ContentFieldProps {
  item: SectionContent;
  value: string;
  onChange: (value: string) => void;
  sectionType: string;
  /** "single" | "both" — section-level color mode (from BaseSectionEditor). */
  sectionMode?: string;
  onModeChange?: (mode: string) => void;
  showSeparator?: boolean;
  disabled?: boolean;
}

/** Field-type → Badge variant. Keeps the editor token-pure (CLAUDE.md §3). */
function typeBadgeVariant(valueType: string): React.ComponentProps<typeof Badge>["variant"] {
  switch (valueType) {
    case "color":
      return "primary-soft";
    case "background":
      return "warning";
    case "text":
    case "string":
    case "textarea":
      return "info";
    case "image":
    case "image_url":
      return "success";
    case "boolean":
      return "secondary";
    case "json":
      return "outline";
    default:
      return "secondary";
  }
}

/**
 * Per-field content editor — renders by `valueType`. Ported from the dashboard
 * `cms/ContentField.tsx`, re-skinned to POS primitives.
 *
 * ⚠️ The color / background JSON serialization contract is kept **verbatim**
 * (the storefront + clone service read it). Only the inputs are re-skinned.
 * `<input type="color">` values are data-driven (CLAUDE.md §3.6 case 4 — OK).
 */
export function ContentField({
  item,
  value,
  onChange,
  sectionType,
  sectionMode = "both",
  onModeChange,
  showSeparator = true,
  disabled = false,
}: ContentFieldProps) {
  const { t } = useLanguage();
  // RBAC action gating — fail-open while my-permissions resolves (§5.1).
  const { can, isReady: permsReady } = usePermissions();
  const canEditContent = !permsReady || can("storefront", "update", "content");
  // MediaPicker hosts upload (storefront/upload/gallery) + add-by-URL
  // (storefront/create/gallery); it's a shared primitive, so it's rendered
  // read-only here when the user can do neither.
  const canAddMedia =
    !permsReady ||
    can("storefront", "upload", "gallery") ||
    can("storefront", "create", "gallery");

  // ── color (dual-mode) ─────────────────────────────────────────────────────
  const renderColorInput = () => {
    let colorData: Record<string, string>;
    try {
      colorData = JSON.parse(value || '{"mode":"single","value":"#000000"}');
    } catch {
      // Plain hex value — bare swatch + hex text.
      return (
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={value || "#000000"}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-10 p-1 rounded-md border border-border bg-card cursor-pointer"
            aria-label={t("content.color.swatch")}
          />
          <Input
            type="text"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1"
          />
        </div>
      );
    }

    if (sectionMode === "both") {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="label-section">{t("content.color.light")}</span>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={colorData.lightValue || colorData.value || "#000000"}
                disabled={disabled}
                onChange={(e) => {
                  colorData.mode = "both";
                  colorData.lightValue = e.target.value;
                  onChange(JSON.stringify(colorData));
                }}
                className="w-12 h-10 p-1 rounded-md border border-border bg-card cursor-pointer"
                aria-label={t("content.color.light")}
              />
              <Input
                type="text"
                value={colorData.lightValue || colorData.value || "#000000"}
                disabled={disabled}
                onChange={(e) => {
                  colorData.mode = "both";
                  colorData.lightValue = e.target.value;
                  onChange(JSON.stringify(colorData));
                }}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="label-section">{t("content.color.dark")}</span>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={colorData.darkValue || "#ffffff"}
                disabled={disabled}
                onChange={(e) => {
                  colorData.mode = "both";
                  colorData.darkValue = e.target.value;
                  onChange(JSON.stringify(colorData));
                }}
                className="w-12 h-10 p-1 rounded-md border border-border bg-card cursor-pointer"
                aria-label={t("content.color.dark")}
              />
              <Input
                type="text"
                value={colorData.darkValue || "#ffffff"}
                disabled={disabled}
                onChange={(e) => {
                  colorData.mode = "both";
                  colorData.darkValue = e.target.value;
                  onChange(JSON.stringify(colorData));
                }}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={colorData.value || value || "#000000"}
          disabled={disabled}
          onChange={(e) => {
            colorData.mode = "single";
            colorData.value = e.target.value;
            onChange(JSON.stringify(colorData));
          }}
          className="w-12 h-10 p-1 rounded-md border border-border bg-card cursor-pointer"
          aria-label={t("content.color.swatch")}
        />
        <Input
          type="text"
          value={colorData.value || value || "#000000"}
          disabled={disabled}
          onChange={(e) => {
            colorData.mode = "single";
            colorData.value = e.target.value;
            onChange(JSON.stringify(colorData));
          }}
          placeholder="#000000"
          className="flex-1"
        />
      </div>
    );
  };

  // ── background (type + mode + color/image) ────────────────────────────────
  const renderBackgroundInput = () => {
    let bgData: Record<string, any>;
    try {
      bgData = JSON.parse(value || '{"type":"color","value":"#ffffff","mode":"both"}');
    } catch {
      bgData = { type: "color", value: "#ffffff", mode: "both" };
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="label-section">{t("content.background.type")}</span>
            <select
              className="input"
              value={bgData.type}
              disabled={disabled}
              onChange={(e) => {
                bgData.type = e.target.value;
                if (e.target.value === "color") {
                  bgData.value = bgData.color || "#ffffff";
                } else if (e.target.value === "gradient") {
                  bgData.gradient = bgData.gradient || { from: "#ffffff", to: "#000000", direction: "to-r" };
                } else if (e.target.value === "image") {
                  bgData.image = bgData.image || { url: "", opacity: 1 };
                }
                onChange(JSON.stringify(bgData));
              }}
            >
              <option value="color">{t("content.background.solid")}</option>
              <option value="gradient">{t("content.background.gradient")}</option>
              <option value="image">{t("content.background.image")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="label-section">{t("content.background.colorMode")}</span>
            <select
              className="input"
              value={sectionMode}
              disabled={disabled}
              onChange={(e) => onModeChange?.(e.target.value)}
            >
              <option value="both">{t("content.color.mode.both")}</option>
              <option value="single">{t("content.color.mode.single")}</option>
            </select>
          </div>
        </div>

        {bgData.type === "color" && (
          <div className="flex flex-col gap-3">
            {sectionMode === "both" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="label-section">{t("content.color.light")}</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={bgData.lightValue || bgData.value || "#ffffff"}
                      disabled={disabled}
                      onChange={(e) => {
                        bgData.lightValue = e.target.value;
                        onChange(JSON.stringify(bgData));
                      }}
                      className="w-12 h-10 p-1 rounded-md border border-border bg-card cursor-pointer"
                      aria-label={t("content.color.light")}
                    />
                    <Input
                      type="text"
                      value={bgData.lightValue || bgData.value || "#ffffff"}
                      disabled={disabled}
                      onChange={(e) => {
                        bgData.lightValue = e.target.value;
                        onChange(JSON.stringify(bgData));
                      }}
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="label-section">{t("content.color.dark")}</span>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={bgData.darkValue || "#000000"}
                      disabled={disabled}
                      onChange={(e) => {
                        bgData.darkValue = e.target.value;
                        onChange(JSON.stringify(bgData));
                      }}
                      className="w-12 h-10 p-1 rounded-md border border-border bg-card cursor-pointer"
                      aria-label={t("content.color.dark")}
                    />
                    <Input
                      type="text"
                      value={bgData.darkValue || "#000000"}
                      disabled={disabled}
                      onChange={(e) => {
                        bgData.darkValue = e.target.value;
                        onChange(JSON.stringify(bgData));
                      }}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={bgData.value || "#ffffff"}
                  disabled={disabled}
                  onChange={(e) => {
                    bgData.value = e.target.value;
                    onChange(JSON.stringify(bgData));
                  }}
                  className="w-12 h-10 p-1 rounded-md border border-border bg-card cursor-pointer"
                  aria-label={t("content.color.swatch")}
                />
                <Input
                  type="text"
                  value={bgData.value || "#ffffff"}
                  disabled={disabled}
                  onChange={(e) => {
                    bgData.value = e.target.value;
                    onChange(JSON.stringify(bgData));
                  }}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            )}
          </div>
        )}

        {bgData.type === "image" && (
          <div className="flex flex-col gap-3">
            <MediaPicker
              value={bgData.image?.url || ""}
              disabled={disabled || !canAddMedia}
              onChange={(ref) => {
                bgData.image = bgData.image || {};
                bgData.image.url = ref;
                onChange(JSON.stringify(bgData));
              }}
            />
            <div className="flex flex-col gap-1.5">
              <span className="label-section">
                {t("content.background.opacity", {
                  pct: String(Math.round((bgData.image?.opacity ?? 1) * 100)),
                })}
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                disabled={disabled}
                value={bgData.image?.opacity ?? 1}
                onChange={(e) => {
                  bgData.image = bgData.image || {};
                  bgData.image.opacity = parseFloat(e.target.value);
                  onChange(JSON.stringify(bgData));
                }}
                className="w-full accent-primary cursor-pointer"
                aria-label={t("content.background.opacity", {
                  pct: String(Math.round((bgData.image?.opacity ?? 1) * 100)),
                })}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── boolean (toggle) ──────────────────────────────────────────────────────
  const renderBooleanInput = () => {
    const checked = value === "true" || value === "1";
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(checked ? "false" : "true")}
        aria-pressed={checked}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        } ${disabled ? "opacity-55 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-card shadow-card transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    );
  };

  // ── image (org media library via MediaPicker) ─────────────────────────────
  // The storefront content contract stores the image as a plain string in
  // `value` (an absolute URL). MediaPicker uploads to the org S3 bucket and
  // stores the returned CloudFront URL, or lets the user pick from the gallery
  // / paste a URL. Replaces the old base64-data-URL ImagePicker (which bloated
  // saved content).
  const renderImageInput = () => (
    <MediaPicker value={value} onChange={onChange} disabled={disabled || !canAddMedia} />
  );

  // ── json — structured repeaters (parity with dashboard) ───────────────────
  // The dashboard dispatched the json editor on the field key + section archetype:
  //   • `stats`               → add/remove repeater of { value, label }
  //   • `items` in benefits/values → repeater of { icon, title, description }
  //   • `items` in testimonials    → repeater of { name, rating, role, text }
  // Everything else falls back to the raw JSON textarea.
  const parseJsonArray = (): any[] => {
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeJsonArray = (rows: any[]) => onChange(JSON.stringify(rows));

  const renderRepeater = (
    fields: Array<{ key: string; label: string; type?: "text" | "number"; options?: string[] }>,
    blank: Record<string, any>,
    addLabel: string
  ) => {
    const rows = parseJsonArray();
    const update = (idx: number, fieldKey: string, fieldValue: string | number) => {
      const next = rows.map((row, i) => (i === idx ? { ...row, [fieldKey]: fieldValue } : row));
      writeJsonArray(next);
    };
    const remove = (idx: number) => writeJsonArray(rows.filter((_, i) => i !== idx));
    const add = () => writeJsonArray([...rows, { ...blank }]);

    return (
      <div className="flex flex-col gap-3">
        {rows.map((row, idx) => (
          <div key={idx} className="card-muted p-3 flex flex-col gap-2.5">
            {fields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1">
                <span className="label-section">{f.label}</span>
                {f.options ? (
                  <select
                    className="input w-full"
                    value={String(row[f.key] ?? "")}
                    disabled={disabled}
                    onChange={(e) => update(idx, f.key, e.target.value)}
                  >
                    {f.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={String(row[f.key] ?? "")}
                    disabled={disabled}
                    onChange={(e) =>
                      update(idx, f.key, f.type === "number" ? Number(e.target.value) : e.target.value)
                    }
                  />
                )}
              </div>
            ))}
            {canEditContent && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="xs"
                  icon="trash"
                  disabled={disabled}
                  onClick={() => remove(idx)}
                >
                  {t("content.field.remove")}
                </Button>
              </div>
            )}
          </div>
        ))}
        {canEditContent && (
          <Button variant="outline" size="sm" icon="plus" disabled={disabled} onClick={add}>
            {addLabel}
          </Button>
        )}
      </div>
    );
  };

  const renderRawJson = () => (
    <textarea
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      rows={6}
      className="input w-full font-mono text-sm resize-none"
      placeholder='{"key":"value"}'
    />
  );

  const renderJsonInput = () => {
    const key = item.key.toLowerCase();
    const section = sectionType.toLowerCase();

    if (key === "stats") {
      return renderRepeater(
        [
          { key: "value", label: t("content.field.statValue") },
          { key: "label", label: t("content.field.statLabel") },
        ],
        { value: "", label: "" },
        t("content.field.addStat")
      );
    }

    if (key === "items" && (section.includes("benefit") || section.includes("value"))) {
      return renderRepeater(
        [
          { key: "icon", label: t("content.field.icon") },
          { key: "title", label: t("content.field.itemTitle") },
          { key: "description", label: t("content.field.itemDescription") },
        ],
        { icon: "", title: "", description: "" },
        t("content.field.addItem")
      );
    }

    if (key === "items" && section.includes("testimonial")) {
      return renderRepeater(
        [
          { key: "name", label: t("content.field.name") },
          { key: "role", label: t("content.field.role") },
          { key: "rating", label: t("content.field.rating"), type: "number" },
          { key: "text", label: t("content.field.testimonialText") },
        ],
        { name: "", role: "", rating: 5, text: "" },
        t("content.field.addTestimonial")
      );
    }

    return renderRawJson();
  };

  const renderInput = () => {
    switch (item.valueType) {
      case "color":
        return renderColorInput();
      case "background":
        return renderBackgroundInput();
      case "boolean":
        return renderBooleanInput();
      case "image":
      case "image_url":
        return renderImageInput();
      case "json":
        return renderJsonInput();
      case "textarea":
        return (
          <textarea
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className="input w-full resize-none"
          />
        );
      case "text":
      case "string":
        // Long / description fields get a textarea; short ones a single line.
        if (item.key.toLowerCase().includes("description") || value.length > 100) {
          return (
            <textarea
              value={value}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              className="input w-full resize-none"
            />
          );
        }
        return (
          <Input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        );
      default:
        return (
          <Input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        );
    }
  };

  // Field label: prefer a translation key for the field, else the server label.
  const fieldKey = `content.field.${item.key}`;
  const label =
    t(fieldKey) !== fieldKey ? t(fieldKey) : item.displayName || item.key;
  const typeKey = `content.type.${item.valueType}`;
  const typeLabel = t(typeKey) !== typeKey ? t(typeKey) : item.valueType;

  return (
    <div className="flex flex-col gap-2" data-section={sectionType}>
      <div className="flex items-center gap-2 flex-wrap">
        <label htmlFor={item.id} className="t-label text-foreground">
          {label}
        </label>
        <Badge variant={typeBadgeVariant(item.valueType)}>{typeLabel}</Badge>
      </div>
      {item.description && (
        <p className="t-xs text-muted-foreground">{item.description}</p>
      )}
      {renderInput()}
      {showSeparator && <div className="mt-1 border-b border-border/60" />}
    </div>
  );
}
