import { useEffect, useMemo } from 'react';
import { useOrgContext } from '@/contexts/OrgContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select } from '@/components/ui';

interface ActivityCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  disabled?: boolean;
}

/**
 * Economic-activity picker, sourced from the organization's REGISTERED fiscal
 * identity (`registered-organization`), not from the data-api catalog — only
 * codes the org actually holds may appear on its documents.
 *
 * Extracted from DocumentSection so the manual-order card can render it; the
 * auto-pick-first-active effect and the "not configured" fallback come along,
 * because both are behaviour, not layout.
 */
export function ActivityCodeSelect({
  value,
  onChange,
  id = 'activity-code',
  disabled,
}: ActivityCodeSelectProps) {
  const { t } = useLanguage();
  const { registeredOrg } = useOrgContext();

  // Filter to active ('A') so revoked codes don't pollute the picker.
  const activities = useMemo(
    () => (registeredOrg?.activities ?? []).filter((a) => a.status === 'A'),
    [registeredOrg],
  );

  // Fill in once org data arrives, rather than leaving the field empty and
  // failing validation at checkout.
  useEffect(() => {
    if (value) return;
    if (activities.length === 0) return;
    onChange(activities[0].code);
  }, [activities, value, onChange]);

  return (
    <div className="space-y-1">
      <label className="label-section" htmlFor={id}>
        {t('checkout.document.activityCode')}
      </label>
      {activities.length > 0 ? (
        <Select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="pp-input w-full"
        >
          {!activities.some((a) => a.code === value) && value && (
            <option value={value}>{value}</option>
          )}
          {activities.map((a) => (
            <option key={a.code} value={a.code}>
              {a.code}
              {a.description ? ` — ${a.description}` : ''}
            </option>
          ))}
        </Select>
      ) : (
        <Select id={id} disabled className="pp-input w-full">
          <option>{t('checkout.document.activityCode.notConfigured')}</option>
        </Select>
      )}
    </div>
  );
}
