import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BlogDocumentEditor } from '@/components/blog/BlogDocumentEditor';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { blogApi } from '@/lib/blogApi';
import { emptyBlogDocument, type BlogDocument, type BlogPost } from '@/lib/blogTypes';

export default function BlogWriterPage() {
  const { user } = useAuthContext();
  const userId = user?.userId ?? '';
  const { language } = useLanguage();
  const es = language === 'es';
  const posts = useQuery({ queryKey: ['my-blog-posts', userId], queryFn: () => blogApi.list(userId), enabled: !!userId });
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [draft, setDraft] = useState<BlogDocument>(emptyBlogDocument);
  const [slug, setSlug] = useState('');
  const [media, setMedia] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const choose = (post: BlogPost) => {
    setSelected(post);
    setDraft(structuredClone(post.revision?.document ?? emptyBlogDocument()));
    setSlug(post.slug);
    setMedia(post.media);
    setDirty(false);
    setError('');
    setNotice('');
  };
  const begin = () => {
    setSelected(null);
    setDraft(emptyBlogDocument());
    setSlug('');
    setMedia({});
    setDirty(true);
    setError('');
    setNotice('');
  };
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try { await work(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setBusy(false); }
  };
  const save = () => run(async () => {
    const saved = selected?.revision
      ? await blogApi.save(userId, selected.id, selected.revision.version, draft)
      : await blogApi.create(userId, slug, draft);
    choose(saved);
    setNotice(es ? 'Borrador guardado.' : 'Draft saved.');
    await posts.refetch();
  });
  const submit = () => run(async () => {
    if (!selected?.revision) return;
    const updated = await blogApi.submit(userId, selected.id, selected.revision.version);
    choose(updated);
    setNotice(es ? 'Artículo enviado a revisión.' : 'Article submitted for review.');
    await posts.refetch();
  });
  const upload = async (file: File) => {
    const presign = await blogApi.upload(userId, file);
    const response = await fetch(presign.uploadUrl, { method: 'PUT', headers: presign.headers, body: file });
    if (!response.ok) throw new Error(es ? 'No se pudo subir la imagen.' : 'Image upload failed.');
    await blogApi.completeUpload(userId, presign.id);
    setMedia((current) => ({ ...current, [presign.id]: presign.publicUrl }));
    setDirty(true);
    return { id: presign.id, url: presign.publicUrl };
  };
  const editable = !selected || selected.status !== 'in_review';

  return <div className="space-y-6 px-4 py-6 md:px-8">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold">{es ? 'Mis artículos' : 'My articles'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{es
          ? 'Escribe una historia y envíala al equipo Tsuru para revisión.'
          : 'Write a story and send it to the Tsuru team for review.'}</p>
      </div>
      <button type="button" onClick={begin} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
        {es ? 'Nuevo artículo' : 'New article'}</button>
    </div>
    {error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-primary/40 p-3 text-sm">{notice}</p>}
    <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="space-y-2">
        {posts.isLoading && <p className="text-sm text-muted-foreground">{es ? 'Cargando…' : 'Loading…'}</p>}
        {posts.isError && <button type="button" className="text-sm text-destructive underline" onClick={() => void posts.refetch()}>
          {es ? 'No se pudo cargar. Reintentar' : 'Could not load. Retry'}</button>}
        {posts.data?.map((post) => <button key={post.id} type="button" onClick={() => choose(post)}
          className={`block w-full rounded-lg border p-3 text-left hover:bg-muted/50 ${selected?.id === post.id ? 'border-primary' : 'border-border'}`}>
          <span className="block text-sm font-semibold">{post.revision?.document.title[language] || post.slug}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{post.status.replace(/_/g, ' ')}</span>
        </button>)}
        {!posts.isLoading && !posts.data?.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {es ? 'Todavía no tienes artículos.' : 'You have no articles yet.'}</p>}
      </aside>
      <section className="min-w-0 rounded-xl border border-border bg-card p-5 space-y-5">
        <div>
          <h2 className="text-xl font-semibold">{selected ? (es ? 'Artículo' : 'Article') : (es ? 'Nuevo borrador' : 'New draft')}</h2>
          {selected?.revision?.reason && <p className="mt-2 rounded-lg bg-muted p-3 text-sm">
            {es ? 'Comentario del equipo: ' : 'Team feedback: '}{selected.revision.reason}</p>}
        </div>
        <label className="block space-y-1 text-sm">
          <span>Slug</span>
          <input value={slug} disabled={!!selected || !editable} onChange={(event) => { setSlug(event.target.value); setDirty(true); }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2" placeholder="mi-historia" />
        </label>
        <BlogDocumentEditor value={draft} onChange={(next) => { setDraft(next); setDirty(true); }}
          media={media} onUpload={upload} disabled={busy || !editable} />
        {editable && <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button type="button" disabled={busy || !dirty} onClick={() => void save()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
            {es ? 'Guardar borrador' : 'Save draft'}</button>
          {selected?.revision && <button type="button" disabled={busy || dirty} onClick={() => void submit()}
            className="rounded-lg border border-primary px-4 py-2 text-sm text-primary disabled:opacity-50">
            {es ? 'Enviar a revisión' : 'Submit for review'}</button>}
        </div>}
      </section>
    </div>
  </div>;
}
