import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Drawer, Button, Input } from "@/components/ui";
import { FormField } from "@/components/forms/FormField";
import { ImagePicker } from "@/components/ui/ImagePicker";
import { ErrorBox } from "@/components/feedback/ErrorBox";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useCreateCategory,
  useUpdateCategory,
  type CategoryRequestPayload,
  type CategoryImageBlob,
} from "@/hooks/useCategories";
import type { Category } from "@/types";

interface CategoryDrawerFormProps {
  open: boolean;
  /** `undefined` while creating; a category object while editing. */
  category?: Category;
  orgId: string;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Pick contrasting text/button color (dark or light) for a given hex bg using
 * relative luminance. Ported from dashboard `category-form.getContrastingColor`
 * — replaces the naive `.includes('f')` heuristic used in the old card.
 * Returns the design-system contrast tokens as hex (these ARE data values
 * persisted to the BE color fields, not UI styling — §3.6).
 */
export function getContrastingColor(backgroundColor: string): string {
  const hex = backgroundColor.replace("#", "");
  if (hex.length < 6) return "#1a1a1a";
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  background_color: string;
  button_color: string;
  sort_order: number;
}

const DEFAULTS: FormData = {
  name: "",
  slug: "",
  description: "",
  background_color: "#fce7f3",
  button_color: "#e91e63",
  sort_order: 0,
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function toBlob(file: File): Promise<CategoryImageBlob> {
  return { data: await fileToBase64(file), name: file.name, contentType: file.type };
}

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").trim();

export function CategoryDrawerForm({ open, category, orgId, onClose, onSaved }: CategoryDrawerFormProps) {
  const { t } = useLanguage();
  const isEditing = !!category;
  const createMutation = useCreateCategory(orgId);
  const updateMutation = useUpdateCategory(orgId);

  // The BE response is snake_case (`background_color`, `button_color`,
  // `sort_order`) — read those directly off the category object.
  const { register, handleSubmit, watch, setValue, reset, formState } = useForm<FormData>({
    defaultValues: DEFAULTS,
  });

  // Local file refs for the two optional images (not part of RHF — survive
  // re-renders without re-triggering validation/submit).
  const image1Ref = useRef<File | null>(null);
  const image2Ref = useRef<File | null>(null);

  useEffect(() => {
    if (!open) return;
    image1Ref.current = null;
    image2Ref.current = null;
    if (category) {
      reset({
        name: category.name ?? "",
        slug: category.slug ?? "",
        description: category.description ?? "",
        background_color: category.background_color ?? DEFAULTS.background_color,
        button_color: category.button_color ?? DEFAULTS.button_color,
        sort_order: category.sort_order ?? 0,
      });
    } else {
      reset(DEFAULTS);
    }
  }, [open, category, reset]);

  const bgColor = watch("background_color");

  const onSubmit = handleSubmit(async (data) => {
    const body: CategoryRequestPayload = {
      name: data.name,
      slug: data.slug || slugify(data.name),
      description: data.description || undefined,
      background_color: data.background_color,
      button_color: data.button_color,
      sort_order: Number(data.sort_order) || 0,
    };
    if (image1Ref.current) body.image_1 = await toBlob(image1Ref.current);
    if (image2Ref.current) body.image_2 = await toBlob(image2Ref.current);

    if (isEditing) {
      await updateMutation.mutateAsync({ id: category!.category_id, body });
    } else {
      await createMutation.mutateAsync(body);
    }
    onSaved?.();
    onClose();
  });

  const saving = createMutation.isPending || updateMutation.isPending;
  const mutationError =
    (createMutation.error as Error | null)?.message ??
    (updateMutation.error as Error | null)?.message ??
    null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? t("categories.edit") : t("categories.new")}
      subtitle={isEditing ? category?.name : t("categories.newDescription")}
      icon="layers"
      width={480}
      footer={
        <div className="flex gap-2.5 px-6 py-4 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            {t("categories.form.cancel")}
          </Button>
          <Button variant="primary" size="sm" onClick={() => onSubmit()} disabled={saving}>
            {saving
              ? t(isEditing ? "categories.form.updating" : "categories.form.creating")
              : t(isEditing ? "categories.form.update" : "categories.form.create")}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="p-6 flex flex-col gap-4"
      >
        <FormField label={t("categories.form.name")} required error={formState.errors.name?.message}>
          <Input
            placeholder={t("categories.form.namePlaceholder")}
            {...register("name", {
              required: true,
              onChange: (e) => setValue("slug", slugify(e.target.value)),
            })}
          />
        </FormField>

        <FormField label={t("categories.form.slug")}>
          <Input placeholder={t("categories.form.slugPlaceholder")} disabled {...register("slug")} />
        </FormField>

        <FormField label={t("categories.form.description")}>
          <textarea
            className="input w-full min-h-[80px]"
            placeholder={t("categories.form.descriptionPlaceholder")}
            {...register("description")}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("categories.form.backgroundColor")}>
            {/* Data-driven color value (persisted to BE) — §3.6 allows the
                native color input; auto-derive a contrasting button color. */}
            <input
              type="color"
              className="input w-full h-10 p-1"
              {...register("background_color", {
                onChange: (e) => setValue("button_color", getContrastingColor(e.target.value)),
              })}
            />
          </FormField>
          <FormField label={t("categories.form.buttonColor")}>
            <input type="color" className="input w-full h-10 p-1" {...register("button_color")} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("categories.form.image1")}>
            <ImagePicker
              currentUrl={category?.image1_url ?? null}
              onFileChange={(f) => { image1Ref.current = f; }}
            />
          </FormField>
          <FormField label={t("categories.form.image2")}>
            <ImagePicker
              currentUrl={category?.image2_url ?? null}
              onFileChange={(f) => { image2Ref.current = f; }}
            />
          </FormField>
        </div>

        <FormField label={t("categories.form.sortOrder")}>
          <Input
            type="number"
            placeholder={t("categories.form.sortOrderPlaceholder")}
            {...register("sort_order", { valueAsNumber: true })}
          />
        </FormField>

        {mutationError && <ErrorBox message={mutationError} />}

        {/* Preview swatch: data-driven bg color — §3.6 case 4 (caller data). */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div
            className="h-12 flex items-center px-4 font-display font-bold text-sm"
            style={{ background: bgColor, color: getContrastingColor(bgColor) }}
          >
            {watch("name") || t("categories.form.namePlaceholder")}
          </div>
        </div>
      </form>
    </Drawer>
  );
}
