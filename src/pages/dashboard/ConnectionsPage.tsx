import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/useRbac';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Badge, Button, Icon } from '@/components/ui';
import { Spinner } from '@/components/ui/Spinner';
import { partnerConnections, type PartnerConnectionSummary } from '@/lib/partnerConnections';
import { ROUTES } from '@/routePaths';

const permissionKeys: Record<string, string> = {
  'customers:read': 'readCustomers', 'customers:create': 'createCustomers', 'products:read': 'readProducts',
  'locations:read': 'readLocations', 'locations:validate': 'validateLocations', 'configuration:read': 'configuration',
  'invoices:prepare': 'prepareInvoices', 'invoices:submit': 'submitInvoices', 'invoices:read': 'readInvoices', 'invoices:artifacts': 'readArtifacts',
};

export default function ConnectionsPage() {
  const { user } = useAuthContext();
  const { useDefaultOrganization } = useOrganization();
  const { data: org } = useDefaultOrganization(user?.userId);
  const { is_owner: isOwner, isReady } = usePermissions();
  const { t } = useLanguage();
  usePageTitle([t('connections.title')]);
  if (!org || !isReady) return <div className="session-page py-10" role="status"><Spinner label={t('common.loading')} /></div>;
  if (!isOwner) return <div className="session-page py-10" role="alert">{t('connections.ownerOnly')}</div>;
  // Organization changes discard confirmation dialogs and mutation feedback.
  return <OrganizationConnections key={`${user?.userId}:${org.id}`} orgId={org.id} orgName={org.name} />;
}

function OrganizationConnections({ orgId, orgName }: { orgId: string; orgName: string }) {
  const { t, language } = useLanguage();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { confirm, confirmModal } = useConfirmModal();
  const [saved, setSaved] = useState(false);
  const queryKey = ['partner-connections', orgId];
  const list = useQuery({ queryKey, queryFn: () => partnerConnections<{ data: PartnerConnectionSummary[] }>(orgId), retry: false, staleTime: 0 });
  const revoke = useMutation({ mutationFn: (id: string) => partnerConnections(orgId, id), onSuccess: async () => {
    setSaved(true);
    await Promise.all([
      qc.invalidateQueries({ queryKey }),
      qc.invalidateQueries({ queryKey: ['user-organizations'] }),
    ]);
  } });
  const error = revoke.error ?? list.error;
  const errorKey = error instanceof Error && error.message.startsWith('connections.') ? error.message : 'connections.failed';
  const date = (value: string) => new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(value));
  return <div className="px-4 sm:px-6 pt-6 pb-12 max-w-[900px] mx-auto space-y-6">
    <header>
      <Button variant="ghost" size="sm" icon="arrowLeft" className="!pl-0 mb-3" onClick={() => navigate(ROUTES.DASHBOARD_ORG_SETTINGS)}>{t('orgSettings.title')}</Button>
      <h1 className="t-h1 mb-2">{t('connections.title')}</h1>
      <p className="t-body text-muted-foreground">{t('connections.description')}</p>
      <p className="t-sm mt-2">{orgName}</p>
    </header>
    {saved && <p role="status" className="card border-success/30 p-4">{t('connections.saved')}</p>}
    {error && <div role="alert" className="card border-destructive p-4 space-y-3"><p>{t(errorKey)}</p>
      <Button variant="outline" disabled={list.isFetching || revoke.isPending} onClick={() => { revoke.reset(); void list.refetch(); }}>{t('partner.retry')}</Button></div>}
    {list.isPending && <div className="card p-6" role="status"><Spinner label={t('common.loading')} /></div>}
    {list.isSuccess && !list.data.data.length && <section className="card p-6 space-y-3">
      <div aria-hidden="true" className="icon-pill icon-pill-info"><Icon name="shield" size={22} /></div>
      <h2 className="t-h3">{t('connections.empty')}</h2><p className="t-body text-muted-foreground">{t('connections.start')}</p>
    </section>}
    <div className="space-y-4">
      {list.data?.data.map(connection => <section key={connection.id} className="card p-5 sm:p-6 space-y-5" aria-label={connection.application_name}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="t-h3 break-words">{connection.application_name}</h2><p className="t-sm text-muted-foreground break-words">{connection.connection_name}</p></div>
          <Badge variant={connection.status === 'active' ? 'success' : 'secondary'}>{t(`connections.${connection.status}`)}</Badge>
        </div>
        <div><h3 className="t-label mb-2">{t('connections.permissions')}</h3>
          <ul className="grid sm:grid-cols-2 gap-2 t-sm text-muted-foreground">
            {connection.scopes.map(scope => <li key={scope}>{permissionKeys[scope] ? t(`connections.permission.${permissionKeys[scope]}`) : t('connections.permission.additional', { permission: scope })}</li>)}
          </ul>
        </div>
        <p className="t-sm text-muted-foreground">{t(connection.revoked_at ? 'connections.disabledOn' : 'connections.expiresOn')} {date(connection.revoked_at ?? connection.expires_at)}</p>
        {connection.status !== 'revoked' ? <Button variant="outline" disabled={revoke.isPending || list.isFetching || list.isError} onClick={() => {
          revoke.reset(); setSaved(false);
          confirm({ title: t('connections.confirmTitle', { app: connection.application_name }), message: t('connections.confirmDescription'),
            variant: 'destructive', confirmLabel: t('connections.disable'), cancelLabel: t('common.cancel'),
            onConfirm: async () => { await revoke.mutateAsync(connection.id); } });
        }}>{t('connections.disable')}</Button> : <p className="t-sm text-muted-foreground">{t('connections.reconnect')}</p>}
      </section>)}
    </div>
    <p className="t-sm text-muted-foreground">{t('connections.retained')}</p>
    {confirmModal}
  </div>;
}
