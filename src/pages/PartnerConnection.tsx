import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { setSelectedOrgId } from '@/lib/selectedOrg';
import { useOrgConfigurations } from '@/hooks/useOrgConfigurations';
import { HaciendaCredentialsStepper } from '@/components/org-settings/hacienda/HaciendaCredentialsStepper';
import { PartnerFiscalProfile } from '@/components/org-settings/registered-org/PartnerFiscalProfile';
import { Spinner } from '@/components/ui/Spinner';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PartnerPermissions } from '@/components/partners/PartnerPermissions';

type Progress = {
  application_id: string; application_name: string; callback_uri: string; permissions_approved: boolean;
  requested_scopes?: string[]; display_name: string; organization_id: string | null; organizations: { id: string; name: string }[]; status: string;
  fiscal_readiness: null | { available?: boolean; ready: boolean; registered_organization_complete: boolean; hacienda_credentials_verified: boolean;
    certificate_and_pin_validated: boolean; next_step: string; certificate_problem?: string };
};

async function partner<T>(context: string, suffix = '', body?: unknown): Promise<T> {
  const base = import.meta.env.VITE_PARTNER_API_URL;
  if (!base) throw new Error('partner.unavailable');
  const session = await fetchAuthSession();
  const response = await fetch(`${base}/api/partner-onboarding/${encodeURIComponent(context)}${suffix}`, {
    method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.tokens?.idToken?.toString() ?? ''}` },
    body: body ? JSON.stringify(body) : undefined, cache: 'no-store', redirect: 'error',
  });
  if (!response.ok) throw new Error(response.status === 404 ? 'partner.expired' : 'partner.failed');
  return response.json();
}

export default function PartnerConnection() {
  const { context = '' } = useParams<{ context: string }>();
  const [location] = useLocation();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const progress = useQuery({ queryKey: ['partner-onboarding', context], queryFn: () => partner<Progress>(context), retry: false,
    enabled: /^[A-Za-z0-9_-]{43}$/.test(context), staleTime: 0 });
  const data = progress.data;
  const approved = data?.permissions_approved === true;
  const application = data?.application_name || 'Ditsö';
  const config = useOrgConfigurations(approved ? data?.organization_id ?? undefined : undefined);
  useEffect(() => {
    if (/^\/integraciones\/(?:ditso|partners)\/[A-Za-z0-9_-]{43}$/.test(location)) sessionStorage.setItem('ditsoPartnerReturn', location);
    if (approved && data?.organization_id) setSelectedOrgId(data.organization_id);
  }, [location, approved, data?.organization_id]);
  const permissions = useMutation({ mutationFn: () => partner(context, '/permissions', { consent: true, approved_scopes: data!.requested_scopes }),
    onSuccess: () => progress.refetch() });
  const select = useMutation({ mutationFn: (body: { organization_id?: string; create_organization?: boolean }) => partner(context, '/organization', body),
    onSuccess: async () => { setEditing(false); await qc.invalidateQueries({ queryKey: ['user-organizations'] }); await progress.refetch(); } });
  const authorize = useMutation({ mutationFn: async () => {
    const result = await partner<{ redirect_url: string }>(context, '/authorize', { consent: true, ...(data?.requested_scopes ? { approved_scopes: data.requested_scopes } : {}) });
    const callback = new URL(result.redirect_url);
    const expected = new URL(data!.callback_uri);
    if (expected.protocol !== 'https:' || callback.origin !== expected.origin || callback.pathname !== expected.pathname) throw new Error('partner.failed');
    return callback;
  }, onSuccess: callback => { sessionStorage.removeItem('ditsoPartnerReturn'); window.location.assign(callback.href); } });
  const error = progress.error ?? permissions.error ?? select.error ?? authorize.error;
  const ready = data?.fiscal_readiness;
  return <AuthLayout maxWidthClassName="max-w-2xl">
    <section className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="t-h1">{t('partner.connectApplication', { application })}</h1><p className="t-body text-muted-foreground">{t('partner.connectionSteps', { application })}</p></header>
      <ol className="flex justify-center gap-4 t-sm" aria-label={t('partner.progress')}><li className={!approved ? 'font-semibold text-primary' : 'text-muted-foreground'} aria-current={!approved ? 'step' : undefined}>{approved ? '✓ ' : '1. '}{t('partner.permissionsTitle')}</li><li aria-hidden="true">→</li><li className={approved ? 'font-semibold text-primary' : 'text-muted-foreground'} aria-current={approved ? 'step' : undefined}>2. {t('partner.organizationTitle')}</li></ol>
      {progress.isFetching && <div role="status"><Spinner size={24} label={t('common.loading')} /></div>}
      {error && <div role="alert" className="card border-destructive p-5 space-y-3"><p>{t(error instanceof Error && error.message.startsWith('partner.') ? error.message : 'partner.failed')}</p>
        <button className="btn btn-outline" onClick={() => { permissions.reset(); select.reset(); authorize.reset(); void progress.refetch(); }}>{t('partner.retry')}</button></div>}
      {data && !approved && <PartnerPermissions key={context} applicationId={data.application_id || 'ditso'} application={application} scopes={data.requested_scopes || []} pending={permissions.isPending || progress.isFetching} onAllow={() => permissions.mutate()} />}
      {data && approved && <>
        <div className="card p-5 space-y-4"><h2 className="t-h3">{data.display_name}</h2>
          {!data.organization_id ? <div className="space-y-3"><p>{t('partner.choose')}</p>
            {data.organizations.map(org => <button key={org.id} className="btn btn-outline w-full" disabled={select.isPending}
              onClick={() => select.mutate({ organization_id: org.id })}>{org.name}</button>)}
            <button className="btn btn-primary w-full" disabled={select.isPending} onClick={() => select.mutate({ create_organization: true })}>{t('partner.create')}</button></div>
            : <ol className="space-y-3" aria-label={t('partner.progress')}>
              {(['registered_organization_complete', 'hacienda_credentials_verified', 'certificate_and_pin_validated'] as const).map((key, i) =>
                <li key={key} className="flex gap-3"><span className={ready?.[key] ? 'text-success' : 'text-muted-foreground'}>{ready?.[key] ? '✓' : i + 1}</span><span>{t(`partner.${key}`)}</span></li>)}
            </ol>}
        </div>
        {data.organization_id && ready?.available === false && <div role="status" className="card p-5 space-y-3">
          <p>{t('partner.fiscalUnavailable')}</p>
          <button className="btn btn-outline" disabled={progress.isFetching} onClick={() => { void progress.refetch(); }}>{t('partner.recheck')}</button>
        </div>}
        {data.organization_id && ready && ready.available !== false && !ready.ready && <div className="card p-5 space-y-4">
          <p className="t-sm text-muted-foreground">{t('partner.fiscalOptional')}</p>
          <h2 className="t-h3">{t(`partner.${ready.next_step}`)}</h2>
          {ready.next_step === 'certificate' && ready.certificate_problem && <p className="t-sm text-muted-foreground">{t(`partner.certificate_${ready.certificate_problem}`)}</p>}
          {!editing ? <button className="btn btn-primary" onClick={() => setEditing(true)}>{t('partner.complete')}</button>
            : ready.next_step === 'fiscal_profile' ? <PartnerFiscalProfile orgId={data.organization_id} onSaved={() => { setEditing(false); void progress.refetch(); }} />
            : config.isLoading ? <Spinner size={24} /> : config.isError ? <p role="alert">{t('partner.failed')}</p>
            : <HaciendaCredentialsStepper key={ready.next_step} orgId={data.organization_id} existing={config.data}
                pending={ready.next_step === 'hacienda_credentials' ? 'credentials' : 'certificate'}
                onSaved={() => { setEditing(false); void progress.refetch(); }} />}
          <button className="btn btn-outline" disabled={progress.isFetching} onClick={() => { setEditing(false); void progress.refetch(); }}>{t('partner.recheck')}</button>
        </div>}
        {data.organization_id && <div className="card p-5 space-y-4"><p>{t('partner.permissionsAccepted')}</p>
          <button className="btn btn-primary w-full" disabled={!approved || authorize.isPending} onClick={() => authorize.mutate()}>{t('partner.connectReturn', { application })}</button></div>}
      </>}
      <button className="btn btn-ghost" onClick={() => { sessionStorage.removeItem('ditsoPartnerReturn'); window.location.assign('/'); }}>{t('partner.leave')}</button>
    </section>
  </AuthLayout>;
}
