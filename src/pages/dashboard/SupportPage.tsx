import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { events } from 'aws-amplify/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/hooks/useOrganization';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supportApi, supportOrgPath } from '@/lib/api';
import { EVENTS_ENDPOINT } from '@/lib/amplify';
import {
  Button, Card, CardBody, CardHeader, CardTitle, Drawer, FormLabel,
  Icon, Input, SelectField, Spinner,
} from '@/components/ui';

interface SupportMessage {
  id: string; body: string; is_staff: boolean; created_at: string;
}
interface SupportEvidence {
  id: string; file_name: string; content_type: string; size_bytes: number; created_at: string;
}
interface SupportTicket {
  id: string; organization_id: string; requester_user_id: string;
  subject: string; description: string; module: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string; updated_at: string; messages?: SupportMessage[];
  evidence?: SupportEvidence[];
}
interface EvidenceUploadTarget {
  id: string; upload_url: string; headers: Record<string, string>;
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_EVIDENCE_FILES = 5;
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

function EvidencePreview({ file, onRemove, disabled }: {
  file: File; onRemove: () => void; disabled: boolean;
}) {
  const [preview, setPreview] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
      <img src={preview} alt={file.name} className="h-24 w-full object-cover" />
      <div className="flex items-center gap-2 p-2">
        <span className="min-w-0 flex-1 truncate t-xs" title={file.name}>{file.name}</span>
        <Button type="button" variant="ghost" size="xs" icon="close" disabled={disabled}
          aria-label={`Quitar ${file.name}`} onClick={onRemove} />
      </div>
    </div>
  );
}

function EvidenceDrop({ files, onChange, disabled }: {
  files: File[]; onChange: (files: File[]) => void; disabled: boolean;
}) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const addFiles = (incoming: File[]) => {
    const invalid = incoming.find((file) => !ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_EVIDENCE_BYTES);
    if (invalid) { setError(t('support.evidenceInvalid')); return; }
    if (incoming.length > MAX_EVIDENCE_FILES - files.length) {
      setError(t('support.evidenceLimit')); return;
    }
    setError('');
    onChange([...files, ...incoming]);
  };

  return (
    <div className="space-y-3">
      <div role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault(); inputRef.current?.click();
          }
        }}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault(); setDragging(false);
          if (!disabled) addFiles(Array.from(event.dataTransfer.files));
        }}
        className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/[0.06]' : 'border-border bg-muted/30 hover:border-primary/60'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}>
        <Icon name="upload" size={26} className="text-primary" />
        <span className="mt-2 t-sm font-semibold">{t('support.evidenceDrop')}</span>
        <span className="mt-1 t-xs text-muted-foreground">{t('support.evidenceHint')}</span>
      </div>
      <input ref={inputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif"
        multiple disabled={disabled} onChange={(event) => {
          addFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = '';
        }} />
      {error && <p role="alert" className="t-xs text-destructive">{error}</p>}
      {files.length > 0 && <div className="grid grid-cols-2 gap-2">
        {files.map((file, index) => <EvidencePreview key={`${file.name}-${file.lastModified}-${index}`}
          file={file} disabled={disabled} onRemove={() => onChange(files.filter((_, item) => item !== index))} />)}
      </div>}
    </div>
  );
}

export default function SupportPage() {
  const { t } = useLanguage();
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const orgId = org?.id;
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [module, setModule] = useState('general');
  const [evidence, setEvidence] = useState<File[]>([]);
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState('');

  const moduleOptions = useMemo(() => [
    { value: 'general', label: t('support.moduleOther'), icon: 'layers' },
    { value: 'documents', label: t('support.moduleDocuments'), icon: 'fileText' },
    { value: 'orders', label: t('support.moduleOrders'), icon: 'cart' },
    { value: 'products', label: t('support.moduleProducts'), icon: 'package' },
    { value: 'sessions', label: t('support.moduleSessions'), icon: 'clock' },
    { value: 'storefront', label: t('support.moduleStorefront'), icon: 'store' },
  ], [t]);

  usePageTitle([t('support.title')]);

  const tickets = useQuery({
    queryKey: ['support-tickets', orgId], enabled: !!orgId,
    queryFn: () => supportApi.get<SupportTicket[]>(supportOrgPath(orgId!, '/tickets')),
    refetchInterval: 30_000,
  });
  const detail = useQuery({
    queryKey: ['support-ticket', orgId, selectedId], enabled: !!orgId && !!selectedId,
    queryFn: () => supportApi.get<SupportTicket>(supportOrgPath(orgId!, `/tickets/${selectedId}`)),
    refetchInterval: 30_000,
  });
  const create = useMutation({
    mutationFn: async () => {
      // organization_id is NOT in the body — the path carries it, and the API
      // rejects a body copy that could disagree with the URL.
      const ticket = await supportApi.post<SupportTicket>(supportOrgPath(orgId!, '/tickets'), {
        subject: subject.trim(), description: description.trim(), module,
      });
      const failed: string[] = [];
      for (const file of evidence) {
        try {
          const target = await supportApi.post<EvidenceUploadTarget>(
            supportOrgPath(orgId!, `/tickets/${ticket.id}/evidence`),
            { file_name: file.name, content_type: file.type, size_bytes: file.size },
          );
          const response = await fetch(target.upload_url, { method: 'PUT', headers: target.headers, body: file });
          if (!response.ok) throw new Error(`Evidence upload failed (${response.status})`);
          await supportApi.post(
            supportOrgPath(orgId!, `/tickets/${ticket.id}/evidence/${target.id}/complete`), {},
          );
        } catch { failed.push(file.name); }
      }
      return { ticket, failed };
    },
    onSuccess: ({ ticket, failed }) => {
      setSubject(''); setDescription(''); setModule('general'); setEvidence([]);
      setSelectedId(ticket.id); setDrawerOpen(false);
      setNotice(failed.length ? t('support.createdEvidenceFailed') : t('support.created'));
      void queryClient.invalidateQueries({ queryKey: ['support-tickets', orgId] });
      void queryClient.invalidateQueries({ queryKey: ['support-ticket', orgId, ticket.id] });
    },
    onError: () => setNotice(t('support.unavailable')),
  });
  const sendReply = useMutation({
    mutationFn: () => supportApi.post(
      supportOrgPath(orgId!, `/tickets/${selectedId}/messages`), { body: reply.trim() },
    ),
    onSuccess: () => {
      setReply(''); setNotice('');
      void queryClient.invalidateQueries({ queryKey: ['support-ticket', orgId, selectedId] });
      void queryClient.invalidateQueries({ queryKey: ['support-tickets', orgId] });
    },
    onError: () => setNotice(t('support.unavailable')),
  });

  const openEvidence = async (item: SupportEvidence) => {
    if (!selectedId || !orgId) return;
    try {
      const result = await supportApi.get<{ download_url: string }>(
        supportOrgPath(orgId, `/tickets/${selectedId}/evidence/${item.id}/download`),
      );
      const anchor = document.createElement('a');
      anchor.href = result.download_url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
      anchor.click();
    } catch { setNotice(t('support.evidenceOpenError')); }
  };

  useEffect(() => {
    if (!user?.userId || !EVENTS_ENDPOINT) return;
    let stopped = false;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let close: (() => void) | undefined;
    const connect = async () => {
      if (stopped) return;
      try {
        const channel = await events.connect(`/support/${user.userId}`);
        if (stopped) { channel.close(); return; }
        void queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
        void queryClient.invalidateQueries({ queryKey: ['support-ticket'] });
        const subscription = channel.subscribe({
          next: () => {
            void queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
            void queryClient.invalidateQueries({ queryKey: ['support-ticket'] });
          },
          error: () => { close?.(); reconnect = setTimeout(connect, 3000); },
        });
        close = () => { subscription.unsubscribe(); channel.close(); };
      } catch { reconnect = setTimeout(connect, 3000); }
    };
    void connect();
    return () => { stopped = true; if (reconnect) clearTimeout(reconnect); close?.(); };
  }, [user?.userId, queryClient]);

  return (
    <div className="px-4 sm:px-6 pt-6 pb-10 max-w-[1100px] mx-auto space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="t-h2">{t('support.title')}</h1>
          <p className="t-sm text-muted-foreground mt-1">{t('support.subtitle')}</p>
        </div>
        <Button type="button" icon="plus" onClick={() => { setNotice(''); setDrawerOpen(true); }} disabled={!orgId}>
          {t('support.newTicket')}
        </Button>
      </div>
      {notice && <div role="status" className="rounded-lg border border-border bg-muted p-3 t-sm">{notice}</div>}
      <Card>
        <CardHeader><CardTitle>{t('support.myTickets')}</CardTitle></CardHeader>
        <CardBody className="space-y-2">
          {tickets.isLoading && <Spinner size={24} />}
          {tickets.isError && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="t-sm font-semibold text-destructive">{t('support.unavailableTitle')}</p>
            <p className="mt-1 t-xs text-muted-foreground">{t('support.unavailable')}</p>
            <Button type="button" variant="outline" size="sm" icon="refresh" className="mt-3"
              onClick={() => void tickets.refetch()}>{t('common.retry')}</Button>
          </div>}
          {!tickets.isLoading && !tickets.isError && !tickets.data?.length && <p className="t-sm text-muted-foreground">{t('support.noTickets')}</p>}
          {tickets.data?.map((ticket) => (
            <button key={ticket.id} type="button" onClick={() => setSelectedId(ticket.id)}
              className={`w-full text-left rounded-lg border p-3 t-sm hover:bg-muted ${selectedId === ticket.id ? 'border-primary' : 'border-border'}`}>
              <span className="font-semibold block">{ticket.subject}</span>
              <span className="text-muted-foreground">{t(`support.status.${ticket.status}`)} · {new Date(ticket.updated_at).toLocaleDateString()}</span>
            </button>
          ))}
        </CardBody>
      </Card>
      {selectedId && (
        <Card>
          <CardHeader><CardTitle>{t('support.ticketDetails')}: {detail.data?.subject ?? '…'}</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            {detail.isLoading && <Spinner size={24} />}
            {detail.isError && <p className="t-sm text-destructive">{t('support.unavailable')}</p>}
            {detail.data && <>
              <p className="t-sm whitespace-pre-wrap">{detail.data.description}</p>
              {!!detail.data.evidence?.length && <div>
                <h3 className="t-sm font-semibold mb-2">{t('support.evidence')}</h3>
                <div className="flex flex-wrap gap-2">
                  {detail.data.evidence.map((item) => <Button key={item.id} type="button" variant="outline"
                    size="sm" icon="eye" onClick={() => void openEvidence(item)}>{item.file_name}</Button>)}
                </div>
              </div>}
              <div className="space-y-2">
                {detail.data.messages?.map((message) => (
                  <div key={message.id} className={`rounded-lg p-3 t-sm ${message.is_staff ? 'bg-primary/10' : 'bg-muted'}`}>
                    <div className="font-semibold">{message.is_staff ? 'Tsuru' : t('support.title')}</div>
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    <span className="text-muted-foreground text-xs">{new Date(message.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {detail.data.status !== 'closed' && <form className="flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); if (reply.trim()) sendReply.mutate(); }}>
                <textarea className="input w-full min-h-24" value={reply} onChange={(event) => setReply(event.target.value)} placeholder={t('support.reply')} maxLength={10000} required />
                <Button type="submit" disabled={sendReply.isPending || !reply.trim()}>{t('support.sendReply')}</Button>
              </form>}
            </>}
          </CardBody>
        </Card>
      )}

      <Drawer open={drawerOpen} onClose={() => !create.isPending && setDrawerOpen(false)}
        closeLabel={t('common.close')} dismissible={!create.isPending} title={t('support.newTicket')}
        subtitle={t('support.drawerSubtitle')} icon="mail" width={540}
        footer={<div className="flex justify-end gap-2 p-4">
          <Button type="button" variant="ghost" disabled={create.isPending} onClick={() => setDrawerOpen(false)}>{t('common.cancel')}</Button>
          <Button type="submit" form="support-ticket-form" disabled={!orgId || create.isPending || !subject.trim() || description.trim().length < 10}
            icon={create.isPending ? undefined : 'mail'}>{create.isPending ? t('support.sending') : t('support.send')}</Button>
        </div>}>
        <form id="support-ticket-form" className="space-y-5 p-6" onSubmit={(event) => { event.preventDefault(); if (orgId) create.mutate(); }}>
          <div>
            <FormLabel htmlFor="support-subject" required>{t('support.subject')}</FormLabel>
            <Input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)}
              minLength={3} maxLength={160} required disabled={create.isPending} />
          </div>
          <div>
            <FormLabel htmlFor="support-module" required>{t('support.module')}</FormLabel>
            <SelectField id="support-module" value={module} onChange={setModule} options={moduleOptions}
              disabled={create.isPending} searchThreshold={0} />
          </div>
          <div>
            <FormLabel htmlFor="support-description" required>{t('support.description')}</FormLabel>
            <textarea id="support-description" className="input w-full min-h-36" value={description}
              onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={10000}
              required disabled={create.isPending} />
          </div>
          <div>
            <FormLabel>{t('support.evidenceOptional')}</FormLabel>
            <EvidenceDrop files={evidence} onChange={setEvidence} disabled={create.isPending} />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
