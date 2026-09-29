import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BlogBlock, BlogBlockType, BlogDocument, Localized } from '@/lib/blogTypes';

const TYPES: BlogBlockType[] = [
  'paragraph', 'heading', 'list', 'quote', 'callout', 'image', 'image_text', 'embed', 'divider',
];
const LABELS: Record<BlogBlockType, [string, string]> = {
  paragraph: ['Párrafo', 'Paragraph'], heading: ['Subtítulo', 'Heading'],
  list: ['Lista', 'List'], quote: ['Cita', 'Quote'], callout: ['Destacado', 'Callout'],
  image: ['Imagen', 'Image'], image_text: ['Imagen + texto', 'Image + text'],
  embed: ['Video', 'Video'], divider: ['Separador', 'Divider'],
};
const blank = (): Localized => ({ es: '', en: '' });

function TextPair({ label, value, onChange, multiline = false, disabled = false }: {
  label: string; value: Localized; onChange: (next: Localized) => void; multiline?: boolean; disabled?: boolean;
}) {
  return <div className="space-y-2">
    <div className="t-label text-muted-foreground">{label}</div>
    <div className="grid gap-3 md:grid-cols-2">
      {(['es', 'en'] as const).map((lang) => <label key={lang} className="block space-y-1">
        <span className="t-xs text-muted-foreground">{lang === 'es' ? 'Español' : 'English'}</span>
        {multiline ? <textarea disabled={disabled} className="w-full min-h-24 rounded-lg border border-border bg-background px-3 py-2 t-sm"
          value={value[lang]} onChange={(event) => onChange({ ...value, [lang]: event.target.value })} />
          : <input disabled={disabled} className="w-full rounded-lg border border-border bg-background px-3 py-2 t-sm"
            value={value[lang]} onChange={(event) => onChange({ ...value, [lang]: event.target.value })} />}
      </label>)}
    </div>
  </div>;
}

export function BlogDocumentEditor({ value, onChange, media, onUpload, disabled = false }: {
  value: BlogDocument;
  onChange: (next: BlogDocument) => void;
  media: Record<string, string>;
  onUpload: (file: File) => Promise<{ id: string; url: string }>;
  disabled?: boolean;
}) {
  const { language } = useLanguage();
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [preview, setPreview] = useState(false);
  const es = language === 'es';

  const updateBlock = (index: number, update: Partial<BlogBlock>) => {
    const blocks = value.blocks.map((block, at) => at === index ? { ...block, ...update } : block);
    onChange({ ...value, blocks });
  };
  const add = (type: BlogBlockType) => onChange({ ...value, blocks: [...value.blocks, {
    type, ...(type !== 'divider' && type !== 'image' && type !== 'embed' ? { text: blank() } : {}),
    ...(type === 'image' || type === 'image_text' ? { layout: type === 'image' ? 'wide' : 'left', alt: blank(), caption: blank() } : {}),
  }] });
  const move = (index: number, direction: -1 | 1) => {
    const next = [...value.blocks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...value, blocks: next });
  };
  const upload = async (index: number, file?: File) => {
    if (!file) return;
    setUploadError('');
    setUploading(index);
    try {
      const result = await onUpload(file);
      updateBlock(index, { mediaId: result.id });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(null);
    }
  };

  return <div className="space-y-5">
    <TextPair label={es ? 'Título' : 'Title'} value={value.title} disabled={disabled}
      onChange={(title) => onChange({ ...value, title })} />
    <TextPair label={es ? 'Resumen' : 'Excerpt'} value={value.excerpt} multiline disabled={disabled}
      onChange={(excerpt) => onChange({ ...value, excerpt })} />
    <div className="flex items-center justify-between gap-3">
      <h3 className="t-h3">{es ? 'Cuerpo del artículo' : 'Article body'}</h3>
      <button type="button" className="t-sm text-primary underline" onClick={() => setPreview(!preview)}>
        {preview ? (es ? 'Editar' : 'Edit') : (es ? 'Vista previa' : 'Preview')}
      </button>
    </div>
    {preview ? <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="t-h1">{value.title[language]}</h2>
      <p className="t-sm text-muted-foreground">{value.excerpt[language]}</p>
      {value.blocks.map((block, index) => {
        if (block.type === 'divider') return <hr key={index} className="border-border" />;
        if (block.type === 'image' || block.type === 'image_text') return <figure key={index}
          className={block.type === 'image_text'
            ? 'grid items-start gap-4 md:grid-cols-2'
            : `space-y-2 ${block.layout === 'wide' ? 'mx-auto max-w-3xl' : ''}`}>
          <div className={block.layout === 'right' ? 'md:order-2' : ''}>
          {block.mediaId && media[block.mediaId] ? <img src={media[block.mediaId]}
            alt={block.alt?.[language] || ''} className="w-full rounded-lg object-cover" />
            : <div className="rounded-lg bg-muted p-8 t-sm text-muted-foreground">{es ? 'Imagen pendiente' : 'Image pending'}</div>}
          {block.caption?.[language] && <figcaption className="t-xs text-muted-foreground">{block.caption[language]}</figcaption>}
          </div>
          {block.type === 'image_text' && <p className="t-sm whitespace-pre-wrap">{block.text?.[language]}</p>}
        </figure>;
        if (block.type === 'heading') return <h3 key={index} className="t-h2">{block.text?.[language]}</h3>;
        if (block.type === 'quote') return <blockquote key={index} className="border-l-4 border-primary pl-4 italic">{block.text?.[language]}</blockquote>;
        if (block.type === 'embed') return <p key={index} className="t-sm">{block.url}</p>;
        return <p key={index} className="t-sm whitespace-pre-wrap">{block.text?.[language]}</p>;
      })}
    </div> : <div className="space-y-3">
      {value.blocks.map((block, index) => <div key={index} className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="t-sm font-semibold">{index + 1}. {LABELS[block.type][es ? 0 : 1]}</span>
          <div className="flex gap-2 t-xs">
            <button type="button" className="text-primary disabled:opacity-40" disabled={index === 0 || disabled}
              onClick={() => move(index, -1)}>↑</button>
            <button type="button" className="text-primary disabled:opacity-40" disabled={index === value.blocks.length - 1 || disabled}
              onClick={() => move(index, 1)}>↓</button>
            <button type="button" className="text-destructive disabled:opacity-40" disabled={disabled}
              onClick={() => onChange({ ...value, blocks: value.blocks.filter((_, at) => at !== index) })}>
              {es ? 'Quitar' : 'Remove'}</button>
          </div>
        </div>
        {block.type !== 'image' && block.type !== 'divider' && block.type !== 'embed' &&
          <TextPair label={es ? 'Texto' : 'Text'} value={block.text ?? blank()} multiline disabled={disabled}
            onChange={(text) => updateBlock(index, { text })} />}
        {(block.type === 'image' || block.type === 'image_text') && <>
          <label className="block t-sm space-y-1">
            <span>{es ? 'Imagen' : 'Image'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={disabled || uploading !== null}
              className="block w-full t-xs" onChange={(event) => void upload(index, event.target.files?.[0])} />
          </label>
          {uploading === index && <p className="t-xs text-muted-foreground">{es ? 'Subiendo…' : 'Uploading…'}</p>}
          {block.mediaId && media[block.mediaId] && <img src={media[block.mediaId]} alt="" className="h-28 rounded-lg object-cover" />}
          <label className="block t-sm space-y-1">
            <span>{es ? 'Alineación' : 'Alignment'}</span>
            <select disabled={disabled} className="block rounded-lg border border-border bg-background px-3 py-2" value={block.layout ?? 'wide'}
              onChange={(event) => updateBlock(index, { layout: event.target.value as BlogBlock['layout'] })}>
              {(block.type === 'image_text' ? ['left', 'right'] : ['full', 'wide', 'left', 'right']).map((layout) =>
                <option key={layout} value={layout}>{layout}</option>) }
            </select>
          </label>
          <TextPair label={es ? 'Texto alternativo' : 'Alt text'} value={block.alt ?? blank()} disabled={disabled}
            onChange={(alt) => updateBlock(index, { alt })} />
          <TextPair label={es ? 'Pie de imagen' : 'Caption'} value={block.caption ?? blank()} disabled={disabled}
            onChange={(caption) => updateBlock(index, { caption })} />
        </>}
        {block.type === 'embed' && <label className="block t-sm space-y-1">
          <span>URL</span>
          <input disabled={disabled} className="w-full rounded-lg border border-border bg-background px-3 py-2" value={block.url ?? ''}
            onChange={(event) => updateBlock(index, { url: event.target.value })} />
        </label>}
      </div>)}
      {uploadError && <p role="alert" className="t-sm text-destructive">{uploadError}</p>}
      <div className="flex flex-wrap gap-2">
        {TYPES.map((type) => <button key={type} type="button" disabled={disabled}
          className="rounded-lg border border-border px-3 py-1.5 t-xs hover:bg-muted disabled:opacity-40"
          onClick={() => add(type)}>+ {LABELS[type][es ? 0 : 1]}</button>)}
      </div>
    </div>}
  </div>;
}
