/**
 * Maps a storefront-template `category` string to a curated POS `<Icon>` name.
 *
 * The dashboard mapped categories to literal Tailwind palette classes
 * (`bg-pink-500/10`, `text-green-700`, …) — those are BURNED styles
 * (CLAUDE.md §3). Here we map ONLY to an icon; colour is always carried by the
 * design-system `icon-pill-primary-soft` / `icon-pill-muted` tokens at the call
 * site, so no per-category colour literals are introduced.
 *
 * Unknown categories fall back to the generic `store` icon.
 */
const CATEGORY_ICON: Record<string, string> = {
  demo: "store",
  marketplace: "store",
  electronics: "smartphone",
  fashion: "bag",
  crafts: "sparkles",
  food: "drink",
  foods: "drink",
  gourmet: "drink",
  fitness: "activity",
  pets: "users",
  pet: "users",
  beauty: "sparkles",
  cosmetics: "sparkles",
};

export function templateCategoryIcon(category: string): string {
  return CATEGORY_ICON[category?.toLowerCase()] ?? "store";
}
