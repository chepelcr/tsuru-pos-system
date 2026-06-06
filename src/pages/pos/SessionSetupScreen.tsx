import { useState } from "react";
import { crossAppApi, crossAppOrgPath } from "@/lib/api";
import { useSessionContext } from "@/store/sessionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Organization } from "@/types/organization";
import type { Branch, Terminal, CreateTerminalRequest } from "@/types/branch";
import { Icon, Drawer, Button, Input, FormLabel } from "@/components/ui";
import { POS } from "@/theme/pos";

interface Props {
  org: Organization;
}

const selectStyle = (active: boolean, enabled: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "12px 40px 12px 14px",
  background: enabled ? POS.card : "rgba(36,36,38,0.4)",
  border: `1px solid ${active ? "rgba(212,168,116,0.4)" : POS.border}`,
  borderRadius: 10,
  color: active ? POS.text : POS.muted,
  fontSize: 14,
  fontFamily: POS.fontUI,
  fontWeight: active ? 600 : 400,
  cursor: enabled ? "pointer" : "not-allowed",
  appearance: "none",
  outline: "none",
  opacity: enabled ? 1 : 0.5,
  transition: "all 0.15s",
});

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
      setError("No se pudieron cargar las estaciones.");
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
      setTermError(e instanceof Error ? e.message : "No se pudo crear la terminal.");
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
      setError("No se pudo iniciar la sesión.");
      setSaving(false);
    }
  }

  const terminals = selectedBranch?.terminals ?? [];
  const hasNoTerminals = !!selectedBranch && terminals.length === 0;
  const canBegin = !!selectedBranch && !!selectedTerminal && !saving;

  return (
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: POS.bg,
        padding: "40px 20px",
        fontFamily: POS.fontUI,
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 300,
          background: `radial-gradient(ellipse at center, ${POS.roseLight} 0%, transparent 70%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 440,
          background: POS.surface,
          border: `1px solid ${POS.border}`,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,168,116,0.06)",
        }}
      >
        {/* Header strip */}
        <div
          style={{
            background: `linear-gradient(135deg, rgba(212,168,116,0.12) 0%, transparent 100%)`,
            borderBottom: `1px solid ${POS.border}`,
            padding: "28px 32px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: POS.roseLight,
                border: `1px solid rgba(212,168,116,0.3)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="store" size={20} style={{ color: POS.rose }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: POS.rose,
                  fontFamily: POS.fontUI,
                }}
              >
                {t("setup.pointOfSale")}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: POS.text,
                  fontFamily: POS.fontDisplay,
                  lineHeight: 1.2,
                }}
              >
                {org.name}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: POS.muted, lineHeight: 1.5, margin: 0 }}>
            {t("setup.selectStationTerminal")}
          </p>
        </div>

        {/* Form body */}
        <div style={{ padding: "24px 32px 32px" }}>

          {/* Station selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: POS.muted, marginBottom: 8 }}>
              {t("setup.station")}
            </label>
            <div style={{ position: "relative" }}>
              <select
                onFocus={loadBranches}
                onChange={(e) => handleBranchChange(Number(e.target.value))}
                value={selectedBranch?.code ?? ""}
                disabled={loadingBranches}
                style={selectStyle(!!selectedBranch, true)}
              >
                <option value="">{loadingBranches ? t("common.loading") : t("setup.selectStation")}</option>
                {branches.map((b) => (
                  <option key={b.branch_id} value={b.code}>
                    #{b.code} — {b.name}
                  </option>
                ))}
              </select>
              <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: POS.muted }}>
                {loadingBranches
                  ? <Icon name="refresh" size={14} style={{ animation: "spin 1s linear infinite" }} />
                  : <Icon name="chevronDown" size={14} />}
              </div>
            </div>
          </div>

          {/* Terminal selector */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: selectedBranch ? POS.muted : "rgba(142,142,147,0.4)", marginBottom: 8 }}>
              {t("setup.terminal")}
            </label>

            {hasNoTerminals ? (
              /* No terminals — prompt to add one */
              <button
                type="button"
                onClick={() => setAddTermOpen(true)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  border: `1.5px dashed rgba(212,168,116,0.4)`,
                  borderRadius: 10,
                  color: POS.rose,
                  fontSize: 13,
                  fontFamily: POS.fontUI,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = POS.roseDim)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icon name="plus" size={14} />
                {t("setup.addTerminalToStation")}
              </button>
            ) : (
              <div style={{ position: "relative" }}>
                <select
                  onChange={(e) => handleTerminalChange(Number(e.target.value))}
                  value={selectedTerminal?.code ?? ""}
                  disabled={!selectedBranch}
                  style={selectStyle(!!selectedTerminal, !!selectedBranch)}
                >
                  <option value="">{!selectedBranch ? t("setup.selectStationFirst") : t("setup.selectTerminal")}</option>
                  {terminals.map((t) => (
                    <option key={t.terminal_id} value={t.code}>
                      #{t.code} — {t.name}
                    </option>
                  ))}
                </select>
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: POS.muted, opacity: selectedBranch ? 1 : 0.4 }}>
                  <Icon name="chevronDown" size={14} />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: "rgba(255,69,58,0.1)",
                border: "1px solid rgba(255,69,58,0.25)",
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 13,
                color: "#FF453A",
                fontFamily: POS.fontUI,
              }}
            >
              <Icon name="alertTri" size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Selection summary */}
          {selectedBranch && selectedTerminal && (
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 20,
                padding: "12px 14px",
                background: "rgba(212,168,116,0.06)",
                border: "1px solid rgba(212,168,116,0.18)",
                borderRadius: 10,
              }}
            >
              {[
                { label: t("setup.station"), value: selectedBranch.name, code: selectedBranch.code },
                { label: t("setup.terminal"), value: selectedTerminal.name, code: selectedTerminal.code },
              ].map((item) => (
                <div key={item.label} style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: POS.rose, marginBottom: 2 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: POS.text }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: POS.muted }}>{t("setup.codeLabel")}{item.code}</div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleBegin}
            disabled={!canBegin}
            style={{
              width: "100%",
              padding: "14px 24px",
              background: canBegin
                ? `linear-gradient(135deg, ${POS.rose} 0%, #C49060 100%)`
                : "rgba(212,168,116,0.15)",
              border: canBegin ? "none" : `1px solid rgba(212,168,116,0.2)`,
              borderRadius: 12,
              color: canBegin ? "#1C1410" : POS.muted,
              fontSize: 15,
              fontWeight: 700,
              fontFamily: POS.fontUI,
              letterSpacing: "0.02em",
              cursor: canBegin ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transition: "all 0.2s",
              boxShadow: canBegin ? "0 4px 20px rgba(212,168,116,0.35)" : "none",
            }}
          >
            {saving ? (
              <><Icon name="refresh" size={16} style={{ animation: "spin 1s linear infinite" }} />{t("setup.starting")}</>
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
        iconBg="rgba(212,168,116,0.12)"
        iconColor={POS.rose}
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #242426; color: #FAF8F5; }
      `}</style>
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
    <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
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
        <div style={{ fontSize: 13, color: "#FF453A", padding: "10px 14px", background: "rgba(255,69,58,0.1)", border: "1px solid rgba(255,69,58,0.25)", borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
        <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSaving}>{t("common.cancel")}</Button>
        <Button variant="primary" size="sm" type="submit" disabled={isSaving || !name.trim() || !code}>
          {isSaving ? t("setup.creating") : t("setup.createTerminal")}
        </Button>
      </div>
    </form>
  );
}
