export type Localized = { es: string; en: string };
export type BlogBlockType = 'paragraph' | 'heading' | 'list' | 'quote' | 'divider' |
  'callout' | 'image' | 'image_text' | 'embed';
export type BlogImageLayout = 'full' | 'wide' | 'left' | 'right';
export interface BlogBlock {
  type: BlogBlockType;
  text?: Localized;
  mediaId?: string;
  layout?: BlogImageLayout;
  alt?: Localized;
  caption?: Localized;
  url?: string;
}
export interface BlogDocument {
  schemaVersion: 1;
  title: Localized;
  excerpt: Localized;
  blocks: BlogBlock[];
  coverMediaId?: string;
}
export interface BlogPost {
  id: string;
  slug: string;
  authorType: 'team' | 'user';
  authorName: string;
  status: string;
  publishedAt: string | null;
  media: Record<string, string>;
  revision: {
    id: string;
    version: number;
    document: BlogDocument;
    status: string;
    reason: string | null;
  } | null;
}
export const emptyBlogDocument = (): BlogDocument => ({
  schemaVersion: 1,
  title: { es: '', en: '' },
  excerpt: { es: '', en: '' },
  blocks: [{ type: 'paragraph', text: { es: '', en: '' } }],
});
