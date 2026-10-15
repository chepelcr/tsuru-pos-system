import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BlogDocumentEditor } from '@/components/blog/BlogDocumentEditor';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Drawer';
import { FormLabel } from '@/components/ui/FormLabel';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { blogApi } from '@/lib/blogApi';
import { emptyBlogDocument, type BlogDocument, type BlogPost } from '@/lib/blogTypes';

export default function BlogWriterPage() {
  const { user } = useAuthContext();
  const userId = user?.userId ?? '';
  const { language, t } = useLanguage();
  usePageTitle([t('shell.blog')]);
  const es = language === 'es';
  const posts = useQuery({ queryKey: ['my-blog-posts', userId], queryFn: () => blogApi.list(userId), enabled: !!userId });
  const [open, setOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [draft, setDraft] = useState<BlogDocument>(emptyBlogDocument);
  const [slug, setSlug] = useState('');
  const [media, setMedia] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const operationPending = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const locked = busy || uploading;
  const editable = !selected || selected.status !== 'in_review';

  useEffect(() => {
    if (!open || (!dirty && !locked)) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open, dirty, locked]);

  const loadPost = (post: BlogPost) => {
    setSelected(post);
    setDraft(structuredClone(post.revision?.document ?? emptyBlogDocument()));
    setSlug(post.slug);
    setMedia(post.media);
    setDirty(false);
    setError('');
    setNotice('');
  };
  const choose = (post: BlogPost) => {
    if (open || operationPending.current) return;
    loadPost(post);
    setEditorKey((key) => key + 1);
    setOpen(true);
  };
  const begin = () => {
    if (open || operationPending.current) return;
    setSelected(null);
    setDraft(emptyBlogDocument());
    setSlug('');
    setMedia({});
    setDirty(false);
    setError('');
    setNotice('');
    setEditorKey((key) => key + 1);
    setOpen(true);
  };
  const close = () => {
    if (operationPending.current) return;
    if (dirty) setConfirmDiscard(true);
    else setOpen(false);
  };
  const run = async (work: () => Promise<void>) => {
    if (operationPending.current) return;
    operationPending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try { await work(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { operationPending.current = false; setBusy(false); }
  };
  const save = () => run(async () => {
    const saved = selected?.revision
      ? await blogApi.save(userId, selected.id, selected.revision.version, draft)
      : await blogApi.create(userId, slug, draft);
    loadPost(saved);
    setNotice(es ? 'Borrador guardado.' : 'Draft saved.');
    await posts.refetch();
  });
  const submit = () => run(async () => {
    if (!selected?.revision) return;
    const updated = await blogApi.submit(userId, selected.id, selected.revision.version);
    loadPost(updated);
    setNotice(es ? 'Artículo enviado a revisión.' : 'Article submitted for review.');
    await posts.refetch();
  });
  const upload = async (file: File) => {
    operationPending.current = true;
    setUploading(true);
    try {
      const presign = await blogApi.upload(userId, file);
      const response = await fetch(presign.uploadUrl, { method: 'PUT', headers: presign.headers, body: file });
      if (!response.ok) throw new Error(es ? 'No se pudo subir la imagen.' : 'Image upload failed.');
      await blogApi.completeUpload(userId, presign.id);
      setMedia((current) => ({ ...current, [presign.id]: presign.publicUrl }));
      return { id: presign.id, url: presign.publicUrl };
    } finally {
      operationPending.current = false;
      setUploading(false);
    }
  };
  const statusLabel = (status: string) => ({
    draft: es ? 'Borrador' : 'Draft',
    in_review: es ? 'En revisión' : 'In review',
    changes_requested: es ? 'Cambios solicitados' : 'Changes requested',
    published: es ? 'Publicado' : 'Published',
    approved: es ? 'Aprobado' : 'Approved',
    archived: es ? 'Archivado' : 'Archived',
    rejected: es ? 'Rechazado' : 'Rejected',
  }[status] ?? status.replace(/_/g, ' '));

  return <div className="space-y-6 px-4 py-6 md:px-8">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="t-h1">{es ? 'Mis artículos' : 'My articles'}</h1>
        <p className="mt-1 t-sm text-muted-foreground">{es
          ? 'Escribe una historia y envíala al equipo Tsuru para revisión.'
          : 'Write a story and send it to the Tsuru team for review.'}</p>
      </div>
      <Button type="button" icon="plus" onClick={begin} disabled={open || locked}>
        {es ? 'Nuevo artículo' : 'New article'}</Button>
    </div>
    <div className="space-y-3">
      {posts.isLoading && <p className="t-sm text-muted-foreground">{es ? 'Cargando…' : 'Loading…'}</p>}
      {posts.isError && <Button type="button" variant="outline" onClick={() => void posts.refetch()}>
        {es ? 'No se pudo cargar. Reintentar' : 'Could not load. Retry'}</Button>}
      {posts.data?.map((post) => <button key={post.id} type="button" onClick={() => choose(post)} disabled={open || locked}
        className="card card-hover flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
        <span className="min-w-0 break-words t-sm font-semibold">{post.revision?.document.title[language] || post.slug}</span>
        <Badge variant={post.status === 'in_review' ? 'warning' : 'secondary'}>{statusLabel(post.status)}</Badge>
      </button>)}
      {!posts.isLoading && !posts.isError && !posts.data?.length && <Card className="border-dashed p-8 text-center">
        <p className="t-sm text-muted-foreground">{es ? 'Todavía no tienes artículos.' : 'You have no articles yet.'}</p>
      </Card>}
    </div>
    <Drawer open={open} onClose={close} closeLabel={es ? 'Cerrar editor' : 'Close editor'}
      dismissible={!locked} width={880} icon="fileText"
      title={selected ? (es ? 'Artículo' : 'Article') : (es ? 'Nuevo borrador' : 'New draft')}
      subtitle={selected ? statusLabel(selected.status) : (es ? 'Comparte tu historia con la comunidad Tsuru.' : 'Share your story with the Tsuru community.')}
      footer={<div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6">
        <p role="status" className="t-xs text-muted-foreground">{uploading ? (es ? 'Subiendo imagen…' : 'Uploading image…')
          : busy ? (es ? 'Procesando…' : 'Working…')
          : dirty ? (es ? 'Cambios sin guardar' : 'Unsaved changes')
          : !editable ? (es ? 'El artículo está en revisión.' : 'The article is under review.')
          : (es ? 'Sin cambios pendientes' : 'No pending changes')}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" disabled={locked} onClick={close}>{es ? 'Cerrar' : 'Close'}</Button>
          {editable && <>
            <Button type="button" disabled={locked || !dirty} onClick={() => void save()}>
              {es ? 'Guardar borrador' : 'Save draft'}</Button>
            {selected?.revision && <Button type="button" variant="outline" disabled={locked || dirty} onClick={() => void submit()}>
              {es ? 'Enviar a revisión' : 'Submit for review'}</Button>}
          </>}
        </div>
      </div>}>
      <div className="min-w-0 space-y-6 p-4 sm:p-6">
        {error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 t-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-primary/40 p-3 t-sm">{notice}</p>}
        {selected?.revision?.reason && <Card className="bg-muted p-3 t-sm">
          {es ? 'Comentario del equipo: ' : 'Team feedback: '}{selected.revision.reason}</Card>}
        <div>
          <FormLabel htmlFor="blog-slug">Slug</FormLabel>
          <Input id="blog-slug" value={slug} disabled={locked || !!selected || !editable}
            onChange={(event) => { setSlug(event.target.value); setDirty(true); }} placeholder="mi-historia" />
        </div>
        <BlogDocumentEditor key={editorKey} value={draft} onChange={(next) => { setDraft(next); setDirty(true); }}
          media={media} onUpload={upload} disabled={locked || !editable} />
      </div>
    </Drawer>
    <Modal open={confirmDiscard} onClose={() => setConfirmDiscard(false)} variant="warning"
      title={es ? '¿Descartar los cambios?' : 'Discard changes?'}
      description={es ? 'Los cambios sin guardar se perderán al cerrar el editor.' : 'Unsaved changes will be lost when you close the editor.'}
      cancel={{ label: es ? 'Seguir editando' : 'Keep editing', onClick: () => setConfirmDiscard(false) }}
      confirm={{ label: es ? 'Descartar' : 'Discard', variant: 'destructive', onClick: () => { setConfirmDiscard(false); setOpen(false); setDirty(false); } }} />
  </div>;
}
