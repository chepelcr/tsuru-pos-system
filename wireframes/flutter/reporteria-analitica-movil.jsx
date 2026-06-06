/**
 * WIREFRAME — Módulo de Reportería Analítica (Móvil)
 * Issues: JCA-213 al JCA-220
 * Descripción: Vista móvil de reportería para el gerente — accesible desde
 *              el Mini Dashboard Flutter o la PWA React.
 *              Versión compacta de wireframes/react/reporteria-analitica.jsx
 *
 * Carpeta en repo: wireframes/flutter/reporteria-analitica-movil.jsx
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

function fmt(n) { return "₡" + Number(n).toLocaleString("es-CR"); }
function fmtK(n) { return n >= 1000000 ? "₡" + (n/1000000).toFixed(1)+"M" : n >= 1000 ? "₡"+(n/1000).toFixed(0)+"k" : fmt(n); }

const PRODUCTOS = [
  { name: "Hamburguesa", emoji: "🍔", unidades: 284, total: 710000 },
  { name: "Coca Cola",   emoji: "🥤", unidades: 241, total: 241000 },
  { name: "Empanada",    emoji: "🥟", unidades: 198, total: 237600 },
  { name: "Cantón",      emoji: "🌮", unidades: 142, total: 255600 },
  { name: "Platanitos",  emoji: "🍟", unidades: 136, total: 108800 },
  { name: "Fanta Colita",emoji: "🧃", unidades: 119, total: 119000 },
  { name: "Fresco",      emoji: "🍹", unidades: 98,  total: 88200  },
  { name: "Agua",        emoji: "💧", unidades: 76,  total: 45600  },
];

const SESIONES = [
  { nombre: "vs Saprissa",    tipo: "partido", fecha: "06 Abr", total: 338000, estado: "diff" },
  { nombre: "Turno mañana",   tipo: "turno",   fecha: "05 Abr", total: 124500, estado: "ok"   },
  { nombre: "vs Alajuelense", tipo: "partido", fecha: "29 Mar", total: 387500, estado: "ok"   },
  { nombre: "Turno tarde",    tipo: "turno",   fecha: "28 Mar", total: 98200,  estado: "ok"   },
  { nombre: "vs Herediano",   tipo: "partido", fecha: "15 Mar", total: 412000, estado: "diff" },
];

const CONTEXTOS = [
  { label: "Gradas",      sub: "Estadio",     total: 824000, pct: 51, color: C.primary  },
  { label: "Mesa",        sub: "Estadio",     total: 487500, pct: 30, color: "#9B59B6"  },
  { label: "Caja",        sub: "Restaurante", total: 310100, pct: 19, color: C.sinpe    },
];

const VIEWS = [
  { id: "resumen",   icon: "📊", label: "Resumen"  },
  { id: "productos", icon: "🏆", label: "Productos"},
  { id: "sesiones",  icon: "📅", label: "Sesiones" },
  { id: "contexto",  icon: "📍", label: "Contexto" },
];

const PRESETS = ["Hoy", "Semana", "Mes", "Temporada"];

function StatRow({ label, value, color = C.text }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.textSub, fontSize: 13 }}>{label}</span>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color }}>{value}</span>
    </div>
  );
}

function MiniKPI({ label, value, color = C.primary }) {
  return (
    <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: 1.5, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function ReporteriaMobile() {
  const [view, setView]     = useState("resumen");
  const [preset, setPreset] = useState("Mes");
  const [sucursal, setSucursal] = useState("Todas");
  const [tipo, setTipo]     = useState("Todos");
  const [expandedProd, setExpandedProd] = useState(null);

  const maxUnits = Math.max(...PRODUCTOS.map(p => p.unidades));
  const totalGlobal = PRODUCTOS.reduce((s, p) => s + p.total, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #E8620A44; border-radius: 2px; }
        button { cursor: pointer; font-family: inherit; }
        select { font-family: inherit; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {/* Phone */}
        <div style={{
          width: 390, height: 844,
          background: C.bg, borderRadius: 44, overflow: "hidden",
          boxShadow: "0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px #333, inset 0 0 0 1px #222",
          display: "flex", flexDirection: "column",
        }}>
          {/* Status bar */}
          <div style={{ height: 50, background: C.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.primary, letterSpacing: 1 }}>🍗 REPORTERÍA</span>
            <span style={{ fontSize: 11, color: C.textSub, fontFamily: "monospace" }}>🟢 Online</span>
          </div>

          {/* Filter bar compacta */}
          <div style={{ padding: "10px 14px", background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {PRESETS.map(p => (
                <button key={p} onClick={() => setPreset(p)} style={{ flex: 1, padding: "5px 4px", borderRadius: 6, border: "none", background: preset === p ? C.primary : C.surfaceHigh, color: preset === p ? "#fff" : C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12 }}>{p}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { label: "Sucursal", value: sucursal, set: setSucursal, opts: ["Todas", "Estadio", "Restaurante"] },
                { label: "Tipo",     value: tipo,     set: setTipo,     opts: ["Todos", "Partido", "Turno"] },
              ].map(f => (
                <select key={f.label} value={f.value} onChange={e => f.set(e.target.value)} style={{ flex: 1, padding: "5px 8px", background: f.value !== "Todas" && f.value !== "Todos" ? C.primaryGlow : C.surfaceHigh, border: `1px solid ${f.value !== "Todas" && f.value !== "Todos" ? C.primary : C.border}`, borderRadius: 6, color: f.value !== "Todas" && f.value !== "Todos" ? C.primary : C.textSub, fontSize: 12, outline: "none" }}>
                  {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ))}
              <button style={{ padding: "5px 10px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontSize: 11 }}>
                📊 Export
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto" }}>

            {/* ── RESUMEN ── */}
            {view === "resumen" && (
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* KPIs globales */}
                <div style={{ display: "flex", gap: 8 }}>
                  <MiniKPI label="TOTAL" value={fmtK(totalGlobal)} />
                  <MiniKPI label="SESIONES" value="6" color={C.sinpe} />
                  <MiniKPI label="VENTAS" value="557" color={C.success} />
                </div>

                {/* Gráfica de barras mini */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 12 }}>📈 RECAUDACIÓN POR SESIÓN</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 80 }}>
                    {SESIONES.map((s, i) => {
                      const maxV = Math.max(...SESIONES.map(x => x.total));
                      const pct = (s.total / maxV) * 100;
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <div style={{ fontSize: 9, color: C.textMuted, fontFamily: "monospace" }}>{fmtK(s.total)}</div>
                          <div style={{ width: "100%", height: `${pct}%`, background: s.tipo === "partido" ? C.primary : C.sinpe, borderRadius: "3px 3px 0 0", minHeight: 4 }} />
                          <div style={{ fontSize: 8, color: C.textMuted, textAlign: "center" }}>{s.fecha.split(" ")[0]}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    {[{ color: C.primary, label: "Partido" }, { color: C.sinpe, label: "Turno" }].map(l => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                        <span style={{ fontSize: 10, color: C.textSub }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top 3 productos */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 10 }}>🏆 TOP PRODUCTOS</div>
                  {PRODUCTOS.slice(0, 3).map((p, i) => (
                    <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{["🥇","🥈","🥉"][i]}</span>
                        <span style={{ fontSize: 16 }}>{p.emoji}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>{p.name}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: C.primary }}>{fmtK(p.total)}</div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>{p.unidades} uds</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Contexto mini */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 10 }}>📍 POR CONTEXTO</div>
                  {CONTEXTOS.map(c => (
                    <div key={c.label} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: C.textSub }}>{c.label} <span style={{ fontSize: 11, color: C.textMuted }}>({c.sub})</span></span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: c.color }}>{fmtK(c.total)}</span>
                      </div>
                      <div style={{ height: 5, background: C.surfaceHigh, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${c.pct}%`, background: c.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PRODUCTOS ── */}
            {view === "productos" && (
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <MiniKPI label="TOTAL" value={fmtK(totalGlobal)} />
                  <MiniKPI label="UNIDADES" value="1294" color={C.success} />
                </div>
                {PRODUCTOS.map((p, i) => (
                  <div key={p.name}>
                    <button onClick={() => setExpandedProd(expandedProd === i ? null : i)} style={{
                      width: "100%", background: expandedProd === i ? C.primaryGlow : C.surface,
                      border: `1px solid ${expandedProd === i ? C.primary + "66" : C.border}`,
                      borderRadius: 10, padding: "12px 14px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{p.emoji}</span>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>{p.name}</div>
                          <div style={{ height: 3, width: 70, background: C.surfaceHigh, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(p.unidades / maxUnits) * 100}%`, background: i === 0 ? C.primary : i < 3 ? C.primaryDark : "#444", borderRadius: 2 }} />
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: C.primary }}>{fmtK(p.total)}</div>
                        <div style={{ fontSize: 11, color: C.textMuted }}>{p.unidades} uds · {((p.total / totalGlobal) * 100).toFixed(1)}%</div>
                      </div>
                    </button>
                    {/* Drill-down */}
                    {expandedProd === i && (
                      <div style={{ background: C.surfaceHigh, border: `1px solid ${C.primary}33`, borderRadius: "0 0 10px 10px", padding: "12px 14px", marginTop: -1 }}>
                        <div style={{ fontSize: 11, color: C.primary, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>DRILL-DOWN</div>
                        <StatRow label="Gradas" value={`${Math.round(p.unidades * 0.48)} uds`} color={C.primary} />
                        <StatRow label="Mesa" value={`${Math.round(p.unidades * 0.35)} uds`} color="#9B59B6" />
                        <StatRow label="Restaurante" value={`${Math.round(p.unidades * 0.17)} uds`} color={C.sinpe} />
                        <StatRow label="En efectivo" value={fmtK(Math.round(p.total * 0.56))} />
                        <StatRow label="SINPE" value={fmtK(Math.round(p.total * 0.28))} />
                        <StatRow label="Tarjeta" value={fmtK(Math.round(p.total * 0.16))} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── SESIONES ── */}
            {view === "sesiones" && (
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <MiniKPI label="SESIONES" value="6" color={C.sinpe} />
                  <MiniKPI label="MEJOR" value={fmtK(412000)} color={C.warning} />
                  <MiniKPI label="PROM." value={fmtK(241000)} />
                </div>
                {SESIONES.map((s, i) => (
                  <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: C.text }}>
                          {s.tipo === "partido" ? "⚽" : "🍽"} {s.nombre}
                        </div>
                        <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
                          {s.fecha} · <span style={{ color: s.tipo === "partido" ? C.primary : C.sinpe }}>{s.tipo}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.primary }}>{fmtK(s.total)}</div>
                        <div style={{ padding: "2px 8px", borderRadius: 4, background: s.estado === "ok" ? C.successDim : C.warningDim, color: s.estado === "ok" ? C.success : C.warning, fontSize: 10, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, display: "inline-block", marginTop: 3 }}>
                          {s.estado === "ok" ? "✅ Cuadra" : "⚠ Diferencia"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── CONTEXTO ── */}
            {view === "contexto" && (
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <MiniKPI label="ESTADIO" value={fmtK(1311500)} />
                  <MiniKPI label="RESTAURANTE" value={fmtK(310100)} color={C.sinpe} />
                </div>
                {/* Contextos */}
                {CONTEXTOS.map(c => (
                  <div key={c.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: c.color }} />
                    <div style={{ paddingLeft: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.text, textTransform: "capitalize" }}>{c.label}</div>
                          <div style={{ fontSize: 12, color: C.textSub }}>{c.sub}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, color: c.color }}>{fmtK(c.total)}</div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>{c.pct}% del total</div>
                        </div>
                      </div>
                      <div style={{ height: 8, background: C.surfaceHigh, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${c.pct}%`, background: c.color, borderRadius: 4, opacity: 0.85 }} />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Comparativa sucursales */}
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 10 }}>🏢 ESTADIO vs RESTAURANTE</div>
                  <StatRow label="Estadio — total" value={fmtK(1311500)} color={C.primary} />
                  <StatRow label="Restaurante — total" value={fmtK(310100)} color={C.sinpe} />
                  <StatRow label="Ticket prom. Estadio" value={fmt(2551)} />
                  <StatRow label="Ticket prom. Restaurante" value={fmt(2819)} color={C.success} />
                  <StatRow label="Sesiones Estadio" value="3 partidos" />
                  <StatRow label="Sesiones Restaurante" value="3 turnos" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom nav */}
          <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", flexShrink: 0 }}>
            {VIEWS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                flex: 1, padding: "10px 4px", background: "none", border: "none",
                borderTop: view === v.id ? `2px solid ${C.primary}` : "2px solid transparent",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}>
                <span style={{ fontSize: 18 }}>{v.icon}</span>
                <span style={{ fontSize: 9, color: view === v.id ? C.primary : C.textMuted, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 0.5 }}>{v.label.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: "#444", letterSpacing: 2, fontFamily: "monospace" }}>
          WIREFRAME · JCA-213 al JCA-220 · REPORTERÍA ANALÍTICA (MÓVIL)
        </div>
      </div>
    </div>
  );
}
