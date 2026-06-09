import { useState } from "react";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { useSessionContext } from "@/store/sessionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Organization } from "@/types/organization";
import type { Branch, Terminal, CreateTerminalRequest } from "@/types/branch";
import { Icon, Drawer, Button, Input, FormLabel } from "@/components/ui";

interface Props {
  org: Organization;
}

export default function SessionSetupScreen({ org }: Props) {
  const { setSession } = useSessionContext();
  const { t } = useLanguage();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);

  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add terminal drawer
  const [addTermOpen, setAddTermOpen] = useState(false);
  const [savingTerm, setSavingTerm] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);

  async function loadBranches() {
    if (branchesLoaded) return;
    setLoadingBranches(true);
    setError(null);
    try {
      const res = await crossAppApi.get<{ data: Branch[] }>(
        crossAppOrgPath(org.id, "/branches?search=status:1")
      );
      setBranches(res.data ?? []);
      setBranchesLoaded(true);
    } catch {
      setError(t("setup.loadStationsError"));
    } finally {
      setLoadingBranches(false);
    }
  }

  function handleBranchChange(branchCode: number) {
    const branch = branches.find((b) => b.code === branchCode) ?? null;
    setSelectedBranch(branch);
    setSelectedTerminal(null);
    setError(null);
  }

  function handleTerminalChange(termCode: number) {
    const terminals = selectedBranch?.terminals ?? [];
    const term = terminals.find((t) => t.code === termCode) ?? null;
    setSelectedTerminal(term);
  }

  async function handleAddTerminal(data: CreateTerminalRequest) {
    if (!selectedBranch) return;
    setSavingTerm(true);
    setTermError(null);
    try {
      const newTerm = await crossAppApi.post<Terminal>(
        crossAppOrgPath(org.id, `/branches/${selectedBranch.branch_id}/terminals`),
        data
      );
      // Inject the new terminal into the branch in local state
      setBranches((prev) =>
        prev.map((b) =>
          b.branch_id === selectedBranch.branch_id
            ? { ...b, terminals: [...(b.terminals ?? []), newTerm] }
            : b
        )
      );
      setSelectedBranch((prev) =>
        prev ? { ...prev, terminals: [...(prev.terminals ?? []), newTerm] } : prev
      );
      setSelectedTerminal(newTerm);
      setAddTermOpen(false);
    } catch (e: unknown) {
      setTermError(e instanceof Error ? e.message : t("setup.createTerminalError"));
    } finally {
      setSavingTerm(false);
    }
  }

  async function handleBegin() {
    if (!selectedBranch || !selectedTerminal) return;
    setSaving(true);
    setError(null);
    try {
      setSession({
        branch_code: selectedBranch.code,
        terminal_code: selectedTerminal.code,
        branch_name: selectedBranch.name,
        terminal_name: selectedTerminal.name,
      });
    } catch {
      setError(t("setup.startSessionError"));
      setSaving(false);
    }
  }

  const terminals = selectedBranch?.terminals ?? [];
  const hasNoTerminals = !!selectedBranch && terminals.length === 0;
  const canBegin = !!selectedBranch && !!selectedTerminal && !saving;

  return (
    <div className="min-h-full flex items-center justify-center bg-background font-sans px-5 py-10">
      {/* Ambient glow */}
      <div className="session-setup-glow fixed top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-[440px] bg-card border border-border rounded-[20px] overflow-hidden shadow-modal">
        {/* Header strip */}
        <div className="session-setup-header border-b border-border px-8 pt-7 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="icon-pill-rose-soft w-10 h-10 flex-shrink-0">
              <Icon name="store" size={20} />
            </div>
            <div>
              <div className="t-xs font-semibold uppercase tracking-[0.08em] text-accent-rose">
                {t("setup.pointOfSale")}
              </div>
              <div className="text-lg font-bold font-display leading-tight text-foreground">
                {org.name}
              </div>
            </div>
          </div>
          <p className="t-sm text-muted-foreground leading-relaxed m-0">
            {t("setup.selectStationTerminal")}
          </p>
        </div>

        {/* Form body */}
        <div className="px-8 pt-6 pb-8">

          {/* Station selector */}
          <div className="mb-5">
            <label className="label-section block mb-2">
              {t("setup.station")}
            </label>
            <div className="relative">
              <select
                onFocus={loadBranches}
                onChange={(e) => handleBranchChange(Number(e.target.value))}
                value={selectedBranch?.code ?? ""}
                disabled={loadingBranches}
                className="select-native"
              >
                <option value="">{loadingBranches ? t("common.loading") : t("setup.selectStation")}</option>
                {branches.map((b) => (
                  <option key={b.branch_id} value={b.code}>
                    #{b.code} — {b.name}
                  </option>
                ))}
              </select>
              {loadingBranches && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <Icon name="refresh" size={14} className="animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Terminal selector */}
          <div className="mb-7">
            <label className="label-section block mb-2">
              {t("setup.terminal")}
            </label>

            {hasNoTerminals ? (
              /* No terminals — prompt to add one */
              <button
                type="button"
                onClick={() => setAddTermOpen(true)}
                className="w-full px-4 py-3 bg-transparent hover:bg-accent-rose-dim border-[1.5px] border-dashed border-accent-rose-border rounded-[10px] text-accent-rose t-sm font-semibold cursor-pointer flex items-center justify-center gap-2 transition-colors"
              >
                <Icon name="plus" size={14} />
                {t("setup.addTerminalToStation")}
              </button>
            ) : (
              <div className="relative">
                <select
                  onChange={(e) => handleTerminalChange(Number(e.target.value))}
                  value={selectedTerminal?.code ?? ""}
                  disabled={!selectedBranch}
                  className="select-native"
                >
                  <option value="">{!selectedBranch ? t("setup.selectStationFirst") : t("setup.selectTerminal")}</option>
                  {terminals.map((t) => (
                    <option key={t.terminal_id} value={t.code}>
                      #{t.code} — {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="error-box-inline mb-5">
              <Icon name="alertTri" size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Selection summary */}
          {selectedBranch && selectedTerminal && (
            <div className="flex gap-2.5 mb-5 px-3.5 py-3 bg-accent-rose-dim border border-accent-rose-border rounded-[10px]">
              {[
                { label: t("setup.station"), value: selectedBranch.name, code: selectedBranch.code },
                { label: t("setup.terminal"), value: selectedTerminal.name, code: selectedTerminal.code },
              ].map((item) => (
                <div key={item.label} className="flex-1">
                  <div className="t-xs font-bold uppercase tracking-[0.07em] text-accent-rose mb-0.5">
                    {item.label}
                  </div>
                  <div className="t-sm font-bold text-foreground">{item.value}</div>
                  <div className="t-xs text-muted-foreground">{t("setup.codeLabel")}{item.code}</div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleBegin}
            disabled={!canBegin}
            className="btn-session-cta"
          >
            {saving ? (
              <><Icon name="refresh" size={16} className="animate-spin" />{t("setup.starting")}</>
            ) : (
              <><Icon name="checkCircle" size={16} />{t("setup.startShift")}</>
            )}
          </button>
        </div>
      </div>

      {/* Add terminal drawer */}
      <Drawer
        open={addTermOpen}
        onClose={() => { setAddTermOpen(false); setTermError(null); }}
        title={t("setup.newTerminal")}
        subtitle={selectedBranch ? `${t("setup.stationLabel")}${selectedBranch.name}` : undefined}
        icon="sliders"
        width={400}
      >
        <TerminalForm
          branchId={selectedBranch?.code ?? 0}
          isSaving={savingTerm}
          error={termError}
          onSave={handleAddTerminal}
          onClose={() => { setAddTermOpen(false); setTermError(null); }}
        />
      </Drawer>
    </div>
  );
}

// ─── Inline terminal form ──────────────────────────────────────────────────────

interface TerminalFormProps {
  branchId: number;
  isSaving: boolean;
  error: string | null;
  onSave: (data: CreateTerminalRequest) => void;
  onClose: () => void;
}

function TerminalForm({ branchId, isSaving, error, onSave, onClose }: TerminalFormProps) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [code, setCode] = useState<number | "">("");
  const [deviceId, setDeviceId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ branch_id: branchId, name: name.trim(), code: Number(code), device_id: deviceId.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
      <div>
        <FormLabel required>{t("products.name")}</FormLabel>
        <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("terminal.namePlaceholder")} />
      </div>
      <div>
        <FormLabel required>{t("setup.codeLabel").replace(" #", "")}</FormLabel>
        <Input
          required
          type="number"
          min={1}
          value={code}
          onChange={(e) => setCode(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={t("terminal.codePlaceholder")}
          className="font-mono"
        />
      </div>
      <div>
        <FormLabel>{t("setup.deviceId")}</FormLabel>
        <Input
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder={t("terminal.devicePlaceholder")}
          className="font-mono"
        />
        <p className="t-xs mt-1 text-muted-foreground">
          {t("setup.deviceIdHint")}
        </p>
      </div>

      {error && (
        <div className="error-box-inline">
          {error}
        </div>
      )}

      <div className="flex gap-2.5 justify-end pt-1">
        <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSaving}>{t("common.cancel")}</Button>
        <Button variant="primary" size="sm" type="submit" disabled={isSaving || !name.trim() || !code}>
          {isSaving ? t("setup.creating") : t("setup.createTerminal")}
        </Button>
      </div>
    </form>
  );
}
