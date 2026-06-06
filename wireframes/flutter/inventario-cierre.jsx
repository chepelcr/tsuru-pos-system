import { useState } from "react";

const C = {
  primary: "#E8620A", primaryDark: "#C4500A", primaryGlow: "#E8620A15",
  bg: "#111111", surface: "#1C1C1C", surfaceHigh: "#242424",
  border: "#2E2E2E", borderBright: "#3A3A3A",
  text: "#FFFFFF", textSub: "#888888", textMuted: "#444444",
  success: "#2ECC71", successDim: "#2ECC7115",
  warning: "#F1C40F", warningDim: "#F1C40F15",
  error: "#E74C3C", errorDim: "#E74C3C15",
  sinpe: "#3498DB", card: "#27AE60",
};

const PRODUCTS = [
  { id: 1, name: "Hamburguesa", emoji: "🍔", cat: "Comida" },
  { id: 2, name: "Empanada", emoji: "🥟", cat: "Comida" },
  { id: 3, name: "Platanitos", emoji: "🍟", cat: "Comida" },
  { id: 4, name: "Cantón", emoji: "🌮", cat: "Comida" },
  { id: 5, name: "Coca Cola", emoji: "🥤", cat: "Bebida" },
  { id: 6, name: "Fanta Colita", emoji: "🧃", cat: "Bebida" },
  { id: 7, name: "Agua", emoji: "💧", cat: "Bebida" },
  { id: 8, name: "Fresco Natural", emoji: "🍹", cat: "Bebida" },
];

const INIT_INV = { 1: 20, 2: 30, 3: 15, 4: 10, 5: 24, 6: 18, 7: 36, 8: 12 };
const SOLD = { 1: 6, 2: 8, 3: 12, 4: 3, 5: 10, 6: 7, 7: 36, 8: 4 };

function fmt(n) { return "₡" + Number(n).toLocaleString("es-CR"); }

function Phone({ children, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 375, height: 812,
        background: C.bg, borderRadius: 40,
        overflow: "hidden",
        boxShadow: "0 32px 100px rgba(0,0,0,0.85), 0 0 0 1px #333, inset 0 0 0 1px #222",
        display: "flex", flexDirection: "column",
        fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
      }}>
        {/* Status bar */}
        <div style={{ height: 44, background: C.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: C.primary, letterSpacing: 1 }}>🍗 PUESTO 1</span>
          <span style={{ fontSize: 11, color: C.textSub, fontFamily: "monospace" }}>🟢 Online · 8:47 PM</span>
        </div>
        {children}
      </div>
      <div style={{ fontSize: 11, color: "#444", letterSpacing: 2, fontFamily: "monospace" }}>{label}</div>
    </div>
  );
}

function NumInput({ value, onChange, max }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      <button onClick={() => onChange(Math.max(0, value - 1))} style={{
        width: 32, height: 32, background: C.surfaceHigh, border: `1px solid ${C.border}`,
        borderRadius: "6px 0 0 6px", color: C.textSub, fontSize: 18, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>−</button>
      <div style={{
        width: 52, height: 32, background: C.surface, border: `1px solid ${C.border}`,
        borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: value > 0 ? C.text : C.textMuted,
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18,
      }}>{value}</div>
      <button onClick={() => onChange(value + 1)} style={{
        width: 32, height: 32, background: C.primary + "22", border: `1px solid ${C.primary}44`,
        borderRadius: "0 6px 6px 0", color: C.primary, fontSize: 18, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>+</button>
    </div>
  );
}

// ─── SCREEN 1: Apertura de Inventario ───
function AperturaScreen() {
  const [inv, setInv] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 });
  const [submitted, setSubmitted] = useState(false);
  const total = Object.values(inv).reduce((s, v) => s + v, 0);

  if (submitted) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, gap: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.success + "20", border: `2px solid ${C.success}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>✓</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: C.success, fontWeight: 800, fontSize: 26, letterSpacing: 1 }}>¡PUESTO ABIERTO!</div>
          <div style={{ color: C.textSub, fontSize: 13, marginTop: 6 }}>{total} unidades registradas</div>
        </div>
        <div style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
          {PRODUCTS.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.textSub, fontSize: 13 }}>{p.emoji} {p.name}</span>
              <span style={{ color: inv[p.id] > 0 ? C.text : C.textMuted, fontWeight: 700, fontSize: 13 }}>{inv[p.id]} uds</span>
            </div>
          ))}
        </div>
        <button onClick={() => setSubmitted(false)} style={{ width: "100%", padding: 14, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>← Editar inventario</button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 10px", flexShrink: 0 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: C.text, letterSpacing: 1 }}>INVENTARIO INICIAL</div>
        <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>Ingresá las unidades que traés hoy · Puntarenas FC vs Saprissa</div>
      </div>

      {/* Product list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        {["Comida", "Bebida"].map(cat => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.primary, letterSpacing: 2, fontWeight: 700, marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {cat === "Comida" ? "🍟" : "🥤"} {cat.toUpperCase()}
            </div>
            {PRODUCTS.filter(p => p.cat === cat).map(p => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", background: C.surface,
                border: `1px solid ${inv[p.id] > 0 ? C.primary + "44" : C.border}`,
                borderRadius: 10, marginBottom: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{p.emoji}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>{p.name}</span>
                </div>
                <NumInput value={inv[p.id]} onChange={(v) => setInv(i => ({ ...i, [p.id]: v }))} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: 16, background: C.surface, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ color: C.textSub, fontSize: 13 }}>Total unidades</span>
          <span style={{ color: total > 0 ? C.primary : C.textMuted, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20 }}>{total}</span>
        </div>
        <button
          onClick={() => total > 0 && setSubmitted(true)}
          style={{
            width: "100%", padding: 14,
            background: total > 0 ? C.primary : C.surfaceHigh,
            border: "none", borderRadius: 10,
            color: total > 0 ? "#fff" : C.textMuted,
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: 1,
            cursor: total > 0 ? "pointer" : "not-allowed",
          }}
        >
          {total > 0 ? "🚀 ABRIR PUESTO" : "Ingresá al menos 1 producto"}
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN 2: Cierre de Caja ───
function CierreScreen() {
  const [step, setStep] = useState(0); // 0=resumen, 1=efectivo, 2=sinpe-card, 3=confirmacion, 4=done
  const [efectivo, setEfectivo] = useState("");
  const [sinpe, setSinpe] = useState("");
  const [card, setCard] = useState("");
  const [nota, setNota] = useState("");

  const VENTAS = { efectivo: 120000, sinpe: 45000, card: 28000 };
  const total = VENTAS.efectivo + VENTAS.sinpe + VENTAS.card;
  const totalDecl = (Number(efectivo) || 0) + (Number(sinpe) || 0) + (Number(card) || 0);
  const diff = totalDecl - total;

  const steps = ["Resumen", "Efectivo", "SINPE / Tarjeta", "Confirmar"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 16px 10px", background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: C.text, letterSpacing: 1 }}>CIERRE DE CAJA</div>
        {/* Step indicators */}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              <div style={{
                height: 3, borderRadius: 2, width: "100%",
                background: i <= step ? C.primary : C.surfaceHigh,
                transition: "background 0.3s",
              }} />
              <span style={{ fontSize: 9, color: i === step ? C.primary : C.textMuted, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 0.5 }}>{s.toUpperCase()}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

        {/* STEP 0: Resumen del turno */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 2, marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>RESUMEN DEL TURNO</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: C.textSub, fontSize: 13 }}>Total de ventas</span>
                <span style={{ color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>87 transacciones</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ color: C.textSub, fontSize: 13 }}>Ventas pendientes de sync</span>
                <span style={{ color: C.success, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13 }}>✓ 0 pendientes</span>
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>MONTO ESPERADO POR MÉTODO</div>
                {[
                  { label: "Efectivo", v: VENTAS.efectivo, icon: "💵", color: C.primary },
                  { label: "SINPE", v: VENTAS.sinpe, icon: "📱", color: C.sinpe },
                  { label: "Tarjeta", v: VENTAS.card, icon: "💳", color: C.card },
                ].map(m => (
                  <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.textSub, fontSize: 13 }}>{m.icon} {m.label}</span>
                    <span style={{ color: m.color, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15 }}>{fmt(m.v)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10 }}>
                  <span style={{ color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16 }}>TOTAL</span>
                  <span style={{ color: C.primary, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24 }}>{fmt(total)}</span>
                </div>
              </div>
            </div>

            {/* Top 5 productos */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 2, marginBottom: 10, fontFamily: "'Barlow Condensed', sans-serif" }}>PRODUCTOS VENDIDOS</div>
              {PRODUCTS.map(p => {
                const s = SOLD[p.id]; const ini = INIT_INV[p.id];
                return (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.textSub, fontSize: 13 }}>{p.emoji} {p.name}</span>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13 }}>{s} / {ini}</span>
                      <span style={{ color: C.textMuted, fontSize: 10, marginLeft: 4 }}>vendidos</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 1: Declarar Efectivo */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 2, marginBottom: 4, fontFamily: "'Barlow Condensed', sans-serif" }}>EFECTIVO ESPERADO</div>
              <div style={{ color: C.primary, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 36 }}>{fmt(VENTAS.efectivo)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>💵 EFECTIVO FÍSICO CONTADO</div>
              <input
                type="number"
                placeholder="₡0"
                value={efectivo}
                onChange={e => setEfectivo(e.target.value)}
                style={{
                  width: "100%", padding: "14px 16px",
                  background: C.surfaceHigh, border: `1px solid ${efectivo && Number(efectivo) === VENTAS.efectivo ? C.success : C.border}`,
                  borderRadius: 10, color: C.text,
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 32,
                  outline: "none",
                }}
              />
            </div>
            {efectivo && (
              <div style={{
                padding: "12px 16px", borderRadius: 10,
                background: Number(efectivo) === VENTAS.efectivo ? C.successDim : C.warningDim,
                border: `1px solid ${Number(efectivo) === VENTAS.efectivo ? C.success + "44" : C.warning + "44"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: Number(efectivo) === VENTAS.efectivo ? C.success : C.warning, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15 }}>
                    {Number(efectivo) === VENTAS.efectivo ? "✓ Cuadra perfecto" : "⚠ Diferencia"}
                  </span>
                  {Number(efectivo) !== VENTAS.efectivo && (
                    <span style={{ color: C.warning, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15 }}>
                      {Number(efectivo) > VENTAS.efectivo ? "+" : ""}{fmt(Number(efectivo) - VENTAS.efectivo)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SINPE + Tarjeta */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "SINPE RECIBIDO", icon: "📱", expected: VENTAS.sinpe, value: sinpe, set: setSinpe, color: C.sinpe },
              { label: "TARJETA COBRADA", icon: "💳", expected: VENTAS.card, value: card, set: setCard, color: C.card },
            ].map(m => (
              <div key={m.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1, fontFamily: "'Barlow Condensed', sans-serif" }}>{m.icon} {m.label}</div>
                  <div style={{ fontSize: 11, color: C.textSub }}>Esperado: <span style={{ color: m.color, fontWeight: 700 }}>{fmt(m.expected)}</span></div>
                </div>
                <input
                  type="number"
                  placeholder="₡0"
                  value={m.value}
                  onChange={e => m.set(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 14px",
                    background: C.surfaceHigh,
                    border: `1px solid ${m.value && Number(m.value) === m.expected ? C.success : C.border}`,
                    borderRadius: 8, color: C.text,
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, outline: "none",
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* STEP 3: Confirmación */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: C.text, letterSpacing: 1 }}>RESUMEN FINAL</div>
            {[
              { label: "Efectivo", expected: VENTAS.efectivo, decl: Number(efectivo) || 0, icon: "💵", color: C.primary },
              { label: "SINPE", expected: VENTAS.sinpe, decl: Number(sinpe) || 0, icon: "📱", color: C.sinpe },
              { label: "Tarjeta", expected: VENTAS.card, decl: Number(card) || 0, icon: "💳", color: C.card },
            ].map(m => {
              const d = m.decl - m.expected;
              return (
                <div key={m.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: C.textSub, fontSize: 14, fontFamily: "'Barlow Condensed', sans-serif" }}>{m.icon} {m.label}</span>
                    <span style={{ color: d === 0 ? C.success : C.warning, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13 }}>
                      {d === 0 ? "✓ Cuadra" : `${d > 0 ? "+" : ""}${fmt(d)}`}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C.textMuted, fontSize: 12 }}>Esperado: {fmt(m.expected)}</span>
                    <span style={{ color: C.text, fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>Declarado: {fmt(m.decl)}</span>
                  </div>
                </div>
              );
            })}

            {/* Diferencia total */}
            <div style={{
              padding: "14px 16px", borderRadius: 10,
              background: diff === 0 ? C.successDim : C.warningDim,
              border: `1px solid ${diff === 0 ? C.success + "44" : C.warning + "44"}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ color: diff === 0 ? C.success : C.warning, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18 }}>
                {diff === 0 ? "✅ Todo cuadra" : "⚠ Diferencia"}
              </span>
              {diff !== 0 && <span style={{ color: C.warning, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22 }}>{fmt(Math.abs(diff))}</span>}
            </div>

            {/* Nota */}
            {diff !== 0 && (
              <div>
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif" }}>NOTA DE JUSTIFICACIÓN (opcional)</div>
                <textarea
                  placeholder="Ej: Un cliente no pasó la tarjeta, se devolvió el cobro..."
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%", padding: 12,
                    background: C.surfaceHigh, border: `1px solid ${C.border}`,
                    borderRadius: 8, color: C.text, fontSize: 13, outline: "none", resize: "none",
                    fontFamily: "'Barlow', sans-serif",
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Done */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, paddingTop: 40 }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.successDim, border: `2px solid ${C.success}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🔒</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: C.success, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, letterSpacing: 1 }}>CIERRE ENVIADO</div>
              <div style={{ color: C.textSub, fontSize: 13, marginTop: 6 }}>Esperando aprobación del gerente...</div>
            </div>
            <div style={{
              width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.warningDim, border: `1px solid ${C.warning}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⏳</div>
              <div>
                <div style={{ color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14 }}>Pendiente de aprobación</div>
                <div style={{ color: C.textSub, fontSize: 12 }}>El gerente revisará el cierre</div>
              </div>
            </div>
            <button onClick={() => { setStep(0); setEfectivo(""); setSinpe(""); setCard(""); setNota(""); }}
              style={{ width: "100%", padding: 12, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              ← Ver desde el inicio
            </button>
          </div>
        )}
      </div>

      {/* Footer nav */}
      {step < 4 && (
        <div style={{ padding: "12px 16px", background: C.surface, borderTop: `1px solid ${C.border}`, flexShrink: 0, display: "flex", gap: 10 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{
              flex: 1, padding: 13, background: C.surfaceHigh, border: `1px solid ${C.border}`,
              borderRadius: 10, color: C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 17, cursor: "pointer",
            }}>← Atrás</button>
          )}
          <button onClick={() => setStep(s => s + 1)} style={{
            flex: 2, padding: 13,
            background: step === 3 ? C.primary : C.primaryDark,
            border: "none", borderRadius: 10, color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 1, cursor: "pointer",
          }}>
            {step === 0 ? "Iniciar cierre →" : step === 3 ? "🔒 CONFIRMAR CIERRE" : "Siguiente →"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function WireframeInventarioCierre() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 48 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #E8620A44; border-radius: 2px; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        button { font-family: inherit; }
        textarea { font-family: inherit; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 28, color: "#E8620A", letterSpacing: 2 }}>
          🍗 POLLOS PORTEÑOS — FLUTTER APP
        </div>
        <div style={{ color: "#444", fontSize: 13, letterSpacing: 3, fontFamily: "monospace", marginTop: 4 }}>
          WIREFRAMES JCA-170 + JCA-183
        </div>
      </div>

      {/* Two phones */}
      <div style={{ display: "flex", gap: 48, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
        <Phone label="JCA-170 · APERTURA DE INVENTARIO">
          <AperturaScreen />
        </Phone>
        <Phone label="JCA-183 · CIERRE DE CAJA">
          <CierreScreen />
        </Phone>
      </div>
    </div>
  );
}
