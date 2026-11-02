import { useState } from 'react';
import { useRegisteredOrganization } from '@/hooks/useRegisteredOrganization';
import { useLanguage } from '@/contexts/LanguageContext';
import { Spinner } from '@/components/ui/Spinner';
import { FiscalInfoStepper } from './FiscalInfoStepper';
import { FiscalInfoSummaryCard } from './FiscalInfoSummaryCard';
import { FiscalInfoEditDrawer } from './FiscalInfoEditDrawer';

/** The partner's verified organization is explicit; a cached POS selection cannot choose it. */
export function PartnerFiscalProfile({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const { t } = useLanguage();
  const profile = useRegisteredOrganization(orgId);
  const [editing, setEditing] = useState(false);
  if (profile.isLoading) return <Spinner size={24} label={t('common.loading')} />;
  if (profile.isError) return <div role="alert" className="space-y-3"><p>{t('partner.failed')}</p>
    <button className="btn btn-outline" onClick={() => { void profile.refetch(); }}>{t('partner.retry')}</button></div>;
  if (!profile.data) return <FiscalInfoStepper orgId={orgId} onSaved={onSaved} />;
  return <>
    <FiscalInfoSummaryCard reg={profile.data} onEdit={() => setEditing(true)} />
    <FiscalInfoEditDrawer orgId={orgId} reg={profile.data} open={editing} onClose={() => {
      setEditing(false);
      onSaved(); // Server readiness decides whether the next component is still pending.
    }} />
  </>;
}
