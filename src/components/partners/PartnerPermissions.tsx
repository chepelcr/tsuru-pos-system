import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button, Icon } from '@/components/ui';

const labels: Record<string, string> = {
  'configuration:read': 'configuration', 'locations:read': 'locationsRead', 'locations:validate': 'locationsValidate',
  'products:read': 'productsRead', 'products:create': 'productsCreate', 'products:update': 'productsUpdate', 'products:delete': 'productsDelete',
  'customers:read': 'customersRead', 'customers:create': 'customersCreate', 'customers:update': 'customersUpdate', 'customers:delete': 'customersDelete',
  'media:read': 'mediaRead', 'media:write': 'mediaWrite',
  'invoices:prepare': 'invoicesPrepare', 'invoices:submit': 'invoicesSubmit', 'invoices:read': 'invoicesRead', 'invoices:artifacts': 'invoicesArtifacts',
};

/** Partner identity is shown here; the page shell and controls keep Tsuru's standard design. */
export function PartnerPermissions({ applicationId, application, scopes, pending, onAllow }: {
  applicationId: string; application: string; scopes: string[]; pending: boolean; onAllow: () => void;
}) {
  const { t } = useLanguage();
  const [consent, setConsent] = useState(false);
  useEffect(() => { setConsent(false); }, [applicationId, scopes.join(',')]);
  return <section className="card p-5 space-y-5" aria-label={t('partner.permissionsTitle')}>
    {applicationId.startsWith('ditso') ? <div className="flex justify-center py-2">
      <img src="/partners/ditso/logo-light.svg" alt={application} className="h-16 w-auto dark:hidden" />
      <img src="/partners/ditso/logo-dark.svg" alt={application} className="hidden h-16 w-auto dark:block" />
    </div> : <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-2xl font-bold" aria-label={application}>{application.slice(0, 1)}</div>}
    <div className="space-y-2 text-center"><h2 className="t-h2">{t('partner.permissionsFor', { application })}</h2>
      <p className="t-body text-muted-foreground">{t('partner.permissionsDescription', { application })}</p></div>
    <ul className="grid gap-2 sm:grid-cols-2">{scopes.map(scope => <li key={scope} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 t-sm">
      <Icon name="check" size={15} className="mt-0.5 shrink-0 text-primary" /><span>{labels[scope] ? t('partner.scope.' + labels[scope]) : scope}</span>
    </li>)}</ul>
    <p className="t-sm text-muted-foreground">{t('partner.permissionsOnce')}</p>
    <label className="flex cursor-pointer items-start gap-3 t-body"><input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={consent} onChange={event => setConsent(event.target.checked)} />{t('partner.approvePermissions', { application })}</label>
    <Button className="w-full" disabled={!consent || pending || !scopes.length} onClick={onAllow}>{pending ? t('common.saving') : t('partner.allowContinue')}</Button>
  </section>;
}
