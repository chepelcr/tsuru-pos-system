import { User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { Icon } from '@/components/ui';
import { ClientPicker } from '@/components/clients/ClientPicker';
import type { SaleReceiver } from '@/types/receiver';
import type { ClientSearchResult } from '@/hooks/useClientSearch';
import { resolveReceiverId, resolveReceiverName } from '@/lib/receiverResolution';

interface ReceiverSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  orgId: string;
  receiver: SaleReceiver;
  selectedClient: ClientSearchResult | null;
  onSelectClient: (c: ClientSearchResult | null) => void;
  onEditReceiver: () => void;
  needsReceiver: boolean;
  /**
   * An FEC: the counterparty is the SUPPLIER the organization buys from, and
   * becomes the XML's Emisor — the card says so instead of "Receptor".
   */
  isPurchase?: boolean;
  /** Document-type rules about this counterparty (lib/docTypeRules), translated. */
  issues?: { level: 'error' | 'hint'; text: string }[];
}

export function ReceiverSection({
  isExpanded,
  onToggle,
  orgId,
  receiver,
  selectedClient,
  onSelectClient,
  onEditReceiver,
  needsReceiver,
  isPurchase = false,
  issues = [],
}: ReceiverSectionProps) {
  const { t } = useLanguage();

  const receiverName = resolveReceiverName(receiver, selectedClient);
  const receiverId = resolveReceiverId(receiver, selectedClient);
  const hasReceiver = !!receiverName;

  const hasError = issues.some((i) => i.level === 'error');
  const badge = hasError ? '!' : hasReceiver ? '✓' : needsReceiver ? '*' : undefined;

  return (
    <SectionWrapper
      title={isPurchase ? t('checkout.tab.supplier') : t('checkout.tab.receiver')}
      icon={User}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={badge}
    >
      <div className="flex flex-col">
        {/* Selected receiver chip — slides down in, fades up out */}
        <div className="collapse-grid" data-open={hasReceiver}>
          <div className="min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-accent-rose-border bg-accent-rose-soft mb-3">
              <div className="w-8 h-8 rounded-full bg-card border border-accent-rose-border flex items-center justify-center flex-shrink-0">
                <span className="font-display text-sm text-accent-rose font-semibold">
                  {(receiverName ?? '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-foreground truncate">{receiverName}</div>
                {receiverId && <div className="text-[11px] text-muted-foreground">{receiverId}</div>}
              </div>
              <button
                type="button"
                onClick={onEditReceiver}
                title={t('common.edit')}
                className="w-7 h-7 rounded-md border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center justify-center"
              >
                <Icon name="edit" size={12} />
              </button>
              <button
                type="button"
                onClick={() => onSelectClient(null)}
                title={t('common.delete')}
                className="w-7 h-7 rounded-md border border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive/40 flex items-center justify-center"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Document-type rules for this counterparty */}
        {hasReceiver && issues.map((issue, i) => (
          <div
            key={i}
            role={issue.level === 'error' ? 'alert' : undefined}
            className={`text-[11px] mb-3 ${issue.level === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {issue.text}
          </div>
        ))}
        {isPurchase && !hasReceiver && (
          <div className="text-[11px] text-muted-foreground mb-3">{t('checkout.rules.fecSupplierIntro')}</div>
        )}

        {/* Required notice */}
        {needsReceiver && !hasReceiver && (
          <div className="text-[11px] text-destructive mb-3">{t('checkout.receiver.required')}</div>
        )}

        {/* Picker — slides down in when no receiver, slides up out when one is picked */}
        <div className="collapse-grid" data-open={!hasReceiver} aria-hidden={hasReceiver}>
          <div className="min-h-0 overflow-hidden">
            <ClientPicker
              variant="inline"
              orgId={orgId}
              selectedClientId={selectedClient?.client_id ?? null}
              onSelect={(c) => onSelectClient(c)}
              onAddNew={onEditReceiver}
            />
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
