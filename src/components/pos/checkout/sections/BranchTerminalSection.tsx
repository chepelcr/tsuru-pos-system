import { useState } from 'react';
import { Store } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SectionWrapper } from '@/components/common/SectionWrapper';
import { Button, Drawer, FormLabel, Input, Select } from '@/components/ui';
import { useCreateTerminal } from '@/hooks/useBranches';
import { useSessionSelection } from '@/hooks/useSessionSelection';
import type { CreateTerminalRequest } from '@/types/branch';

interface BranchTerminalSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  orgId: string;
}

/**
 * Which station and terminal this document is issued from.
 *
 * It belongs HERE, on the document, and not on a full-screen gate in front of
 * the POS: the branch and terminal are two fields of the document being issued
 * (Hacienda's `sucursal` and `terminal` segments of the consecutive), not a
 * precondition for opening a till. Asking for them up front blocked the whole
 * workspace — product grid included — behind a form whose answer is, for most
 * organizations, the only one possible.
 *
 * So `useSessionSelection` answers it automatically (assignment → current →
 * first available) and this card exists to SHOW that answer and let it be
 * changed for this document. It is only ever a question when the organization
 * genuinely has nothing to pick from, in which case it asks for the missing
 * piece to be created instead of failing at confirm time with
 * "missing branch/terminal".
 */
export function BranchTerminalSection({
  isExpanded,
  onToggle,
  orgId,
}: BranchTerminalSectionProps) {
  const { t } = useLanguage();
  const {
    branches,
    terminals,
    branch,
    terminal,
    selectBranch,
    selectTerminal,
    needsBranch,
    needsTerminal,
    isLoading,
  } = useSessionSelection(orgId);

  const createTerminal = useCreateTerminal(orgId);
  const [addOpen, setAddOpen] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);

  const handleAddTerminal = async (data: CreateTerminalRequest) => {
    if (!branch) return;
    setTermError(null);
    try {
      const created = await createTerminal.mutateAsync({
        branchCode: branch.code,
        data,
      });
      selectTerminal(created.terminal_id);
      setAddOpen(false);
    } catch (e: unknown) {
      setTermError(e instanceof Error ? e.message : t('setup.createTerminalError'));
    }
  };

  const badge =
    branch && terminal
      ? `#${branch.code}-${terminal.code}`
      : undefined;

  return (
    <>
      <SectionWrapper
        title={t('checkout.branchTerminal.title')}
        icon={Store}
        isExpanded={isExpanded}
        onToggle={onToggle}
        badge={badge}
        loading={isLoading}
      >
        <div className="space-y-3">
          {needsBranch ? (
            <div className="t-sm text-muted-foreground">
              {t('checkout.branchTerminal.noBranches')}
            </div>
          ) : (
            <div>
              <FormLabel htmlFor="checkout-branch">{t('setup.station')}</FormLabel>
              <Select
                id="checkout-branch"
                className="input input-sm w-full"
                value={branch?.branch_id ?? ''}
                onChange={(e) => selectBranch(e.target.value)}
              >
                <option value="">{t('setup.selectStation')}</option>
                {branches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    #{b.code} — {b.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {!needsBranch && (
            <div>
              <FormLabel htmlFor="checkout-terminal">{t('setup.terminal')}</FormLabel>
              {needsTerminal ? (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="w-full px-4 py-2.5 bg-transparent hover:bg-accent-rose-dim border-[1.5px] border-dashed border-accent-rose-border rounded-[10px] text-accent-rose t-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors"
                >
                  + {t('setup.addTerminalToStation')}
                </button>
              ) : (
                <Select
                  id="checkout-terminal"
                  className="input input-sm w-full"
                  value={terminal?.terminal_id ?? ''}
                  disabled={!branch}
                  onChange={(e) => selectTerminal(e.target.value)}
                >
                  <option value="">
                    {!branch ? t('setup.selectStationFirst') : t('setup.selectTerminal')}
                  </option>
                  {terminals.map((term) => (
                    <option key={term.terminal_id} value={term.terminal_id}>
                      #{term.code} — {term.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          )}
        </div>
      </SectionWrapper>

      <Drawer
        closeLabel={t('common.close')}
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setTermError(null);
        }}
        title={t('setup.newTerminal')}
        subtitle={branch ? `${t('setup.stationLabel')}${branch.name}` : undefined}
        icon="sliders"
        width={400}
      >
        <TerminalForm
          isSaving={createTerminal.isPending}
          error={termError}
          onSave={handleAddTerminal}
          onClose={() => {
            setAddOpen(false);
            setTermError(null);
          }}
        />
      </Drawer>
    </>
  );
}

// ─── Inline terminal form ──────────────────────────────────────────────────

interface TerminalFormProps {
  isSaving: boolean;
  error: string | null;
  onSave: (data: CreateTerminalRequest) => void;
  onClose: () => void;
}

function TerminalForm({ isSaving, error, onSave, onClose }: TerminalFormProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [code, setCode] = useState<number | ''>('');
  const [deviceId, setDeviceId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim(),
      code: Number(code),
      device_id: deviceId.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
      <div>
        <FormLabel required>{t('common.name')}</FormLabel>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('terminal.namePlaceholder')}
        />
      </div>
      <div>
        <FormLabel required>{t('setup.codeLabel').replace(' #', '')}</FormLabel>
        <Input
          required
          type="number"
          min={1}
          value={code}
          onChange={(e) => setCode(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={t('terminal.codePlaceholder')}
          className="font-mono"
        />
      </div>
      <div>
        <FormLabel>{t('setup.deviceId')}</FormLabel>
        <Input
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder={t('terminal.devicePlaceholder')}
          className="font-mono"
        />
        <p className="t-xs mt-1 text-muted-foreground">{t('setup.deviceIdHint')}</p>
      </div>

      {error && <div className="error-box-inline">{error}</div>}

      <div className="flex gap-2.5 justify-end pt-1">
        <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSaving}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="submit"
          disabled={isSaving || !name.trim() || !code}
        >
          {isSaving ? t('common.saving') : t('setup.createTerminal')}
        </Button>
      </div>
    </form>
  );
}
