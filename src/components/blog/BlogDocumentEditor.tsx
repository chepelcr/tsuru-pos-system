import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormLabel } from '@/components/ui/FormLabel';
import { Input } from '@/components/ui/Input';
import { SelectField } from '@/components/ui/SelectField';
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
  const id = useId();
  return <fieldset className="min-w-0 space-y-2">
    <legend className="t-label">{label}</legend>
    <div className="grid gap-3 md:grid-cols-2">
      {(['es', 'en'] as const).map((lang) => {
        const languageLabel = lang === 'es' ? 'Español' : 'English';
        return <div key={lang} className="min-w-0">
          <FormLabel htmlFor={`${id}-${lang}`}>{languageLabel}</FormLabel>
          {multiline ? <textarea id={`${id}-${lang}`} disabled={disabled} className="input min-h-24"
            aria-label={`${label} (${languageLabel})`} value={value[lang]}
            onChange={(event) => onChange({ ...value, [lang]: event.target.value })} />
            : <Input id={`${id}-${lang}`} disabled={disabled} aria-label={`${label} (${languageLabel})`}
              value={value[lang]} onChange={(event) => onChange({ ...value, [lang]: event.target.value })} />}
        </div>;
      })}
    </div>
  </fieldset>;
}

export function BlogDocumentEditor({ value, onChange, media, onUpload, disabled = false }: {
  value: BlogDocument;
  onChange: (next: BlogDocument) => void;
  media: Record<string, string>;
  onUpload: (file: File) => Promise<{ id: string; url: string }>;
  disabled?: boolean;
}) {
  const { language } = useLanguage();
  const editorId = useId();
  const latestValue = useRef(value);
  latestValue.current = value;
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [preview, setPreview] = useState(false);
  const es = language === 'es';
  const fieldsDisabled = disabled || uploading !== null;
  const layouts = {
    full: es ? 'Ancho completo' : 'Full width',
    wide: es ? 'Ancho' : 'Wide',
    left: es ? 'Izquierda' : 'Left',
    right: es ? 'Derecha' : 'Right',
  };

  const updateBlock = (index: number, update: Partial<BlogBlock>) => {
    const current = latestValue.current;
    const blocks = current.blocks.map((block, at) => at === index ? { ...block, ...update } : block);
    onChange({ ...current, blocks });
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
    if (!file || fieldsDisabled) return;
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
    <TextPair label={es ? 'Título' : 'Title'} value={value.title} disabled={fieldsDisabled}
      onChange={(title) => onChange({ ...value, title })} />
    <TextPair label={es ? 'Resumen' : 'Excerpt'} value={value.excerpt} multiline disabled={fieldsDisabled}
      onChange={(excerpt) => onChange({ ...value, excerpt })} />
    <div className="flex items-center justify-between gap-3">
      <h3 className="t-h3">{es ? 'Cuerpo del artículo' : 'Article body'}</h3>
      <Button type="button" variant="outline" size="sm" icon={preview ? 'edit' : 'eye'} onClick={() => setPreview(!preview)}>
        {preview ? (es ? 'Editar' : 'Edit') : (es ? 'Vista previa' : 'Preview')}
      </Button>
    </div>
    {preview ? <Card className="p-4 sm:p-6 space-y-4">
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
    </Card> : <div className="space-y-3">
      {value.blocks.map((block, index) => <Card key={index} className="min-w-0 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="t-sm font-semibold">{index + 1}. {LABELS[block.type][es ? 0 : 1]}</span>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" icon="chevronUp" disabled={index === 0 || fieldsDisabled}
              aria-label={es ? `Subir bloque ${index + 1}` : `Move block ${index + 1} up`} onClick={() => move(index, -1)} />
            <Button type="button" variant="ghost" size="sm" icon="chevronDown" disabled={index === value.blocks.length - 1 || fieldsDisabled}
              aria-label={es ? `Bajar bloque ${index + 1}` : `Move block ${index + 1} down`} onClick={() => move(index, 1)} />
            <Button type="button" variant="ghost" size="sm" icon="trash" className="text-destructive" disabled={fieldsDisabled}
              aria-label={es ? `Quitar bloque ${index + 1}` : `Remove block ${index + 1}`}
              onClick={() => onChange({ ...value, blocks: value.blocks.filter((_, at) => at !== index) })}>
              {es ? 'Quitar' : 'Remove'}</Button>
          </div>
        </div>
        {block.type !== 'image' && block.type !== 'divider' && block.type !== 'embed' &&
          <TextPair label={es ? 'Texto' : 'Text'} value={block.text ?? blank()} multiline disabled={fieldsDisabled}
            onChange={(text) => updateBlock(index, { text })} />}
        {(block.type === 'image' || block.type === 'image_text') && <>
          <div>
            <FormLabel htmlFor={`${editorId}-image-${index}`}>{es ? 'Imagen' : 'Image'}</FormLabel>
            <Input id={`${editorId}-image-${index}`} type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={fieldsDisabled}
              className="min-w-0 py-1.5 file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-0.5 file:text-foreground"
              onChange={(event) => { void upload(index, event.target.files?.[0]); event.target.value = ''; }} />
          </div>
          {uploading === index && <p role="status" className="t-xs text-muted-foreground">{es ? 'Subiendo…' : 'Uploading…'}</p>}
          {block.mediaId && media[block.mediaId] && <img src={media[block.mediaId]} alt="" className="h-28 max-w-full rounded-lg object-cover" />}
          <div>
            <FormLabel htmlFor={`${editorId}-layout-${index}`}>{es ? 'Alineación' : 'Alignment'}</FormLabel>
            <SelectField id={`${editorId}-layout-${index}`} disabled={fieldsDisabled}
              aria-label={es ? 'Alineación' : 'Alignment'} value={block.layout ?? (block.type === 'image_text' ? 'left' : 'wide')}
              options={(block.type === 'image_text' ? ['left', 'right'] as const : ['full', 'wide', 'left', 'right'] as const)
                .map((layout) => ({ value: layout, label: layouts[layout] }))}
              onChange={(layout) => updateBlock(index, { layout: layout as BlogBlock['layout'] })} />
          </div>
          <TextPair label={es ? 'Texto alternativo' : 'Alt text'} value={block.alt ?? blank()} disabled={fieldsDisabled}
            onChange={(alt) => updateBlock(index, { alt })} />
          <TextPair label={es ? 'Pie de imagen' : 'Caption'} value={block.caption ?? blank()} disabled={fieldsDisabled}
            onChange={(caption) => updateBlock(index, { caption })} />
        </>}
        {block.type === 'embed' && <div>
          <FormLabel htmlFor={`${editorId}-url-${index}`}>URL</FormLabel>
          <Input id={`${editorId}-url-${index}`} type="url" disabled={fieldsDisabled} value={block.url ?? ''}
            onChange={(event) => updateBlock(index, { url: event.target.value })} />
        </div>}
      </Card>)}
      {uploadError && <p role="alert" className="t-sm text-destructive">{uploadError}</p>}
      <div className="flex flex-wrap gap-2">
        {TYPES.map((type) => <Button key={type} type="button" variant="outline" size="sm" icon="plus" disabled={fieldsDisabled}
          onClick={() => add(type)}>{LABELS[type][es ? 0 : 1]}</Button>)}
      </div>
    </div>}
  </div>;
}
