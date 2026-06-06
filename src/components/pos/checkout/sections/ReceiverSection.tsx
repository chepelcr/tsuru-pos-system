import { User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { Icon } from '@/components/ui';
import { ReceiverPicker } from '../ReceiverPicker';
import type { SaleReceiver } from '@/types/receiver';
import type { ClientSearchResult } from '@/hooks/useClientSearch';

interface ReceiverSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  orgId: string;
  receiver: SaleReceiver;
  selectedClient: ClientSearchResult | null;
  onSelectClient: (c: ClientSearchResult | null) => void;
  onEditReceiver: () => void;
  needsReceiver: boolean;
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
}: ReceiverSectionProps) {
  const { t } = useLanguage();

  const receiverName = receiver?.name || selectedClient?.client_name || selectedClient?.business_name;
  const receiverId = receiver?.identification?.number || selectedClient?.identification?.number;
  const hasReceiver = !!receiverName;

  const badge = hasReceiver ? '✓' : needsReceiver ? '*' : undefined;

  return (
    <SectionWrapper
      title={t('checkout.tab.receiver')}
      icon={User}
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={badge}
    >
      <div className="flex flex-col">
        {/* Selected receiver chip — slides down in, fades up out */}
        <div
          className="grid transition-all duration-300 ease-out"
          style={{
            gridTemplateRows: hasReceiver ? '1fr' : '0fr',
            opacity: hasReceiver ? 1 : 0,
          }}
        >
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

        {/* Required notice */}
        {needsReceiver && !hasReceiver && (
          <div className="text-[11px] text-destructive mb-3">{t('checkout.receiver.required')}</div>
        )}

        {/* Picker — slides down in when no receiver, slides up out when one is picked */}
        <div
          className="grid transition-all duration-300 ease-out"
          style={{
            gridTemplateRows: hasReceiver ? '0fr' : '1fr',
            opacity: hasReceiver ? 0 : 1,
          }}
          aria-hidden={hasReceiver}
        >
          <div className="min-h-0 overflow-hidden">
            <ReceiverPicker
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
