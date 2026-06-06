/**
 * WIREFRAME — Flutter Mini Dashboard Gerente
 * Issues: JCA-209 (resumen), JCA-210 (modo venta), JCA-211 (aprobación cierres)
 * Descripción: Pantalla principal del gerente en Flutter.
 *              4 vistas internas: Resumen → Selector Puesto → POS Gerente → Cierres
 *
 * Carpeta en repo: wireframes/flutter/mini-dashboard-gerente.jsx
 */

import { useState } from "react";

const C = {
  primary: "#E8620A", primaryDark: "#C4500A", primaryGlow: "#E8620A15",
  bg: "#111111", surface: "#1C1C1C", surfaceHigh: "#242424",
  border: "#2E2E2E", text: "#FFFFFF", textSub: "#888888", textMuted: "#444444",
  success: "#2ECC71", successDim: "#2ECC7115",
  warning: "#F1C40F", warningDim: "#F1C40F15",
  error: "#E74C3C", errorDim: "#E74C3C15",
  sinpe: "#3498DB", card: "#27AE60",
};

const PUESTOS_SESION = [
  { id: "p1", nombre: "Puesto 1", contexto: "gradas", sesion: "vs Saprissa" },
  { id: "p2", nombre: "Puesto 2", contexto: "mesa",   sesion: "vs Saprissa" },
];

const PUESTOS_DATA = [
  { id: "p1", nombre: "Puesto 1", contexto: "gradas", total: 193000, ventas: 48, sync: "active",  cash: 120000, sinpe: 45000, card: 28000 },
  { id: "p2", nombre: "Puesto 2", contexto: "mesa",   total: 145000, ventas: 39, sync: "slow",    cash: 98000,  sinpe: 32000, card: 15000 },
];

const CIERRES_PENDIENTES = [
  { puesto: "Puesto 1", cajero: "Carlos Mora", contexto: "gradas", totalEsp: 193000, totalDecl: 191000 },
];

function fmt(n) { return "₡" + Number(n).toLocaleString("es-CR"); }

export default function MiniDashboardGerente() {
  const [view, setView] = useState("resumen"); // resumen | selector | pos_gerente | cierres
  const [puestoSelected, setPuestoSelected] = useState(null);

  const totalGlobal = PUESTOS_DATA.reduce((s, p) => s + p.total, 0);
  const syncMap = {
    active:  { color: C.success, label: "● Activo" },
    slow:    { color: C.warning, label: "● Señal débil" },
    offline: { color: C.error,   label: "● Sin señal" },
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0A",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
      padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #E8620A44; border-radius: 2px; }
        button { cursor: pointer; font-family: inherit; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {/* Phone frame */}
        <div style={{
          width: 390, height: 844,
          background: C.bg, borderRadius: 44, overflow: "hidden",
          boxShadow: "0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px #333, inset 0 0 0 1px #222",
          display: "flex", flexDirection: "column",
        }}>
          {/* Status bar */}
          <div style={{ height: 50, background: C.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.primary, letterSpacing: 1 }}>🍗 GERENTE</span>
            <span style={{ fontSize: 11, color: C.textSub, fontFamily: "monospace" }}>🟢 Online · 8:47 PM</span>
          </div>

          {/* ── VISTA: RESUMEN ── */}
          {view === "resumen" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Total global */}
              <div style={{ padding: "14px 16px 10px", background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 2, fontFamily: "'Barlow Condensed', sans-serif" }}>TOTAL GLOBAL · EN VIVO</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: C.primary, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 36 }}>{fmt(totalGlobal)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.success, animation: "blink 1.5s infinite" }} />
                    <span style={{ fontSize: 11, color: C.success, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>LIVE</span>
                  </div>
                </div>
              </div>

              {/* Puesto cards */}
              <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
                {PUESTOS_DATA.map(p => {
                  const s = syncMap[p.sync];
                  return (
                    <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 12, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.primary}, ${C.primaryDark})` }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: C.text }}>{p.nombre}</div>
                          <div style={{ fontSize: 11, color: C.textSub }}>
                            contexto: <span style={{ color: C.primary }}>{p.contexto}</span> · {p.ventas} ventas
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: s.color, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{s.label}</span>
                      </div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 28, color: C.primary, marginBottom: 10 }}>{fmt(p.total)}</div>
                      {[
                        { label: "Efectivo", v: p.cash,  icon: "💵", color: C.primary },
                        { label: "SINPE",    v: p.sinpe, icon: "📱", color: C.sinpe   },
                        { label: "Tarjeta",  v: p.card,  icon: "💳", color: C.card    },
                      ].map(m => (
                        <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ color: C.textSub, fontSize: 12 }}>{m.icon} {m.label}</span>
                          <span style={{ color: m.color, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13 }}>{fmt(m.v)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div style={{ padding: "12px 14px", background: C.surface, borderTop: `1px solid ${C.border}`, flexShrink: 0, display: "flex", gap: 8 }}>
                <button onClick={() => setView("cierres")} style={{
                  flex: 1, padding: "12px 6px",
                  background: CIERRES_PENDIENTES.length > 0 ? C.warningDim : C.surfaceHigh,
                  border: `1px solid ${CIERRES_PENDIENTES.length > 0 ? C.warning + "44" : C.border}`,
                  borderRadius: 10,
                  color: CIERRES_PENDIENTES.length > 0 ? C.warning : C.textSub,
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 13,
                }}>
                  🔒 Cierres{CIERRES_PENDIENTES.length > 0 ? ` (${CIERRES_PENDIENTES.length})` : ""}
                </button>
                <button onClick={() => setView("selector")} style={{
                  flex: 2, padding: "12px",
                  background: C.primary, border: "none", borderRadius: 10,
                  color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: 1,
                }}>
                  🛒 Entrar a vender
                </button>
              </div>
            </div>
          )}

          {/* ── VISTA: SELECTOR DE PUESTO ── */}
          {view === "selector" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => setView("resumen")} style={{ width: 34, height: 34, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSub, fontSize: 16 }}>←</button>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 19, color: C.text }}>¿EN CUÁL PUESTO VAS A VENDER?</div>
                  <div style={{ fontSize: 11, color: C.textSub }}>Tus ventas quedarán bajo ese asignacionId</div>
                </div>
              </div>
              {PUESTOS_SESION.map(p => (
                <button key={p.id} onClick={() => { setPuestoSelected(p); setView("pos_gerente"); }} style={{
                  padding: "18px 20px", background: C.surface,
                  border: `2px solid ${puestoSelected?.id === p.id ? C.primary : C.border}`,
                  borderRadius: 14, display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left",
                }}>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.text }}>{p.nombre}</div>
                    <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>
                      Contexto: <span style={{ color: C.primary, fontWeight: 700 }}>{p.contexto}</span> · {p.sesion}
                    </div>
                  </div>
                  <span style={{ color: C.primary, fontSize: 22 }}>→</span>
                </button>
              ))}
            </div>
          )}

          {/* ── VISTA: POS GERENTE ── */}
          {view === "pos_gerente" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "8px 16px", background: C.primary + "20", borderBottom: `1px solid ${C.primary}33`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: C.primary, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                  📍 {puestoSelected?.nombre} · {puestoSelected?.contexto}
                </span>
                <button onClick={() => setView("resumen")} style={{ fontSize: 11, color: C.textSub, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 5, padding: "3px 8px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                  ← Volver al resumen
                </button>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, padding: 28 }}>
                <div style={{ fontSize: 48 }}>🛒</div>
                <div style={{ color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, textAlign: "center", letterSpacing: 1 }}>
                  POS COMPLETO
                </div>
                <div style={{ color: C.textSub, fontSize: 13, textAlign: "center", lineHeight: 1.6 }}>
                  Misma interfaz que el cajero.<br/>
                  Ver: <span style={{ color: C.primary, fontFamily: "monospace" }}>wireframes/flutter/pos-cajero.jsx</span>
                </div>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 18px", width: "100%" }}>
                  <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace", letterSpacing: 1, marginBottom: 4 }}>asignacionId generado:</div>
                  <div style={{ fontSize: 13, color: C.primary, fontFamily: "monospace", fontWeight: 700 }}>
                    gerente-u99 + {puestoSelected?.id} + {puestoSelected?.contexto}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── VISTA: CIERRES ── */}
          {view === "cierres" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", background: C.surface, borderBottom: `1px solid ${C.border}`, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: C.text, flexShrink: 0 }}>
                🔒 CIERRES PENDIENTES
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                {CIERRES_PENDIENTES.map((c, i) => {
                  const diff = c.totalDecl - c.totalEsp;
                  return (
                    <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: C.text }}>{c.puesto} · {c.contexto}</div>
                          <div style={{ fontSize: 12, color: C.textSub }}>{c.cajero}</div>
                        </div>
                        <div style={{ padding: "4px 10px", background: C.warningDim, border: `1px solid ${C.warning}44`, borderRadius: 6, color: C.warning, fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                          ⚠ {fmt(Math.abs(diff))}
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: C.textSub, fontSize: 13 }}>Esperado</span>
                        <span style={{ color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{fmt(c.totalEsp)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                        <span style={{ color: C.textSub, fontSize: 13 }}>Declarado</span>
                        <span style={{ color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{fmt(c.totalDecl)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ flex: 1, padding: "10px", background: C.errorDim, border: `1px solid ${C.error}44`, borderRadius: 8, color: C.error, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14 }}>
                          ✗ Rechazar
                        </button>
                        <button style={{ flex: 2, padding: "10px", background: C.primary, border: "none", borderRadius: 8, color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 14 }}>
                          ✓ Aprobar Cierre
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => setView("resumen")} style={{ width: "100%", padding: 12, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15 }}>
                  ← Volver
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: "#444", letterSpacing: 2, fontFamily: "monospace", textAlign: "center" }}>
          WIREFRAME · JCA-209/210/211 · FLUTTER MINI DASHBOARD GERENTE
        </div>
      </div>
    </div>
  );
}
