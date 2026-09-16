import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { events } from 'aws-amplify/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/hooks/useOrganization';
import { usePageTitle } from '@/hooks/usePageTitle';
import { api } from '@/lib/api';
import { EVENTS_ENDPOINT } from '@/lib/amplify';
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Spinner } from '@/components/ui';

interface SupportMessage {
  id: string; body: string; is_staff: boolean; created_at: string;
}
interface SupportTicket {
  id: string; organization_id: string; requester_user_id: string;
  subject: string; description: string; module: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string; updated_at: string; messages?: SupportMessage[];
}

export default function SupportPage() {
  const { t } = useLanguage();
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const orgId = org?.id;
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [module, setModule] = useState('general');
  const [reply, setReply] = useState('');
  const [notice, setNotice] = useState('');

  usePageTitle([t('support.title')]);

  const tickets = useQuery({
    queryKey: ['support-tickets', orgId], enabled: !!orgId,
    queryFn: () => api.get<SupportTicket[]>(`/api/support/tickets?organization_id=${encodeURIComponent(orgId!)}`),
  });
  const detail = useQuery({
    queryKey: ['support-ticket', selectedId], enabled: !!selectedId,
    queryFn: () => api.get<SupportTicket>(`/api/support/tickets/${selectedId}`),
  });
  const create = useMutation({
    mutationFn: () => api.post<SupportTicket>('/api/support/tickets', {
      organization_id: orgId, subject: subject.trim(), description: description.trim(), module,
    }),
    onSuccess: (ticket) => {
      setSubject(''); setDescription(''); setModule('general'); setSelectedId(ticket.id);
      setNotice(t('support.created'));
      void queryClient.invalidateQueries({ queryKey: ['support-tickets', orgId] });
    },
    onError: () => setNotice(t('support.error')),
  });
  const sendReply = useMutation({
    mutationFn: () => api.post(`/api/support/tickets/${selectedId}/messages`, { body: reply.trim() }),
    onSuccess: () => {
      setReply(''); setNotice('');
      void queryClient.invalidateQueries({ queryKey: ['support-ticket', selectedId] });
      void queryClient.invalidateQueries({ queryKey: ['support-tickets', orgId] });
    },
    onError: () => setNotice(t('support.error')),
  });

  // The server publishes reply hints on /support/<Cognito sub>. Re-read the
  // persisted ticket after each hint and after a reconnect (channels do not
  // buffer while offline). The endpoint is optional in local previews.
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
    <div className="space-y-5 py-5 max-w-6xl mx-auto">
      <div>
        <h1 className="t-h2">{t('support.title')}</h1>
        <p className="t-sm text-muted-foreground mt-1">{t('support.subtitle')}</p>
      </div>
      {notice && <div role="status" className="rounded-lg border border-border bg-muted p-3 t-sm">{notice}</div>}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t('support.newTicket')}</CardTitle></CardHeader>
          <CardBody>
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (orgId) create.mutate(); }}>
              <label className="block t-sm font-medium">
                {t('support.subject')}
                <Input className="mt-1" value={subject} onChange={(event) => setSubject(event.target.value)} minLength={3} maxLength={160} required />
              </label>
              <label className="block t-sm font-medium">
                {t('support.module')}
                <select className="input w-full mt-1" value={module} onChange={(event) => setModule(event.target.value)}>
                  <option value="general">{t('support.moduleOther')}</option>
                  <option value="documents">Documentos</option>
                  <option value="orders">Órdenes</option>
                  <option value="products">Productos</option>
                  <option value="sessions">Sesiones</option>
                  <option value="storefront">Tienda en línea</option>
                </select>
              </label>
              <label className="block t-sm font-medium">
                {t('support.description')}
                <textarea className="input w-full mt-1 min-h-32" value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={10000} required />
              </label>
              <Button type="submit" disabled={!orgId || create.isPending}>{t('support.send')}</Button>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('support.myTickets')}</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {tickets.isLoading && <Spinner size={24} />}
            {tickets.isError && <p className="t-sm text-destructive">{t('support.error')}</p>}
            {!tickets.isLoading && !tickets.data?.length && <p className="t-sm text-muted-foreground">{t('support.noTickets')}</p>}
            {tickets.data?.map((ticket) => (
              <button key={ticket.id} type="button" onClick={() => setSelectedId(ticket.id)}
                className={`w-full text-left rounded-lg border p-3 t-sm hover:bg-muted ${selectedId === ticket.id ? 'border-primary' : 'border-border'}`}>
                <span className="font-semibold block">{ticket.subject}</span>
                <span className="text-muted-foreground">{t(`support.status.${ticket.status}`)} · {new Date(ticket.updated_at).toLocaleDateString()}</span>
              </button>
            ))}
          </CardBody>
        </Card>
      </div>
      {selectedId && (
        <Card>
          <CardHeader><CardTitle>{t('support.ticketDetails')}: {detail.data?.subject ?? '…'}</CardTitle></CardHeader>
          <CardBody className="space-y-4">
            {detail.isLoading && <Spinner size={24} />}
            {detail.isError && <p className="t-sm text-destructive">{t('support.error')}</p>}
            {detail.data && <>
              <p className="t-sm whitespace-pre-wrap">{detail.data.description}</p>
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
    </div>
  );
}
