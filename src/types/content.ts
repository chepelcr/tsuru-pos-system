/**
 * CMS content-editor types.
 *
 * The underlying entity shapes (`Page`, `PageSection`, `SectionContent`,
 * `SectionContentUpdate`) are already defined in `./cms` (Infra). This module
 * re-exports them under the editor-centric names the dashboard `cms/types.ts`
 * used, and adds {@link ContentSection} — the per-section field map keyed by
 * each field's stable `key` (the shape `ContentPage` / `BaseSectionEditor`
 * operate on).
 */
export type {
  Page,
  PageSection,
  SectionContent,
  SectionContentValueType,
  SectionContentUpdate,
} from "./cms";

import type { SectionContent } from "./cms";

/** A section's fields, keyed by each field's stable `key`. */
export type ContentSection = Record<string, SectionContent>;

/** The full editor model: one {@link ContentSection} per `${slug}-${sectionType}` key. */
export type ContentData = Record<string, ContentSection>;
