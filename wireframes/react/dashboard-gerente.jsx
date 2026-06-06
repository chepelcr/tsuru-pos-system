import { useState, useEffect, useRef } from "react";

const C = {
  primary: "#E8620A", primaryDark: "#C4500A", primaryGlow: "#E8620A22",
  bg: "#0D0D0D", surface: "#161616", surfaceHigh: "#1E1E1E", surfaceBorder: "#242424",
  border: "#2A2A2A", borderBright: "#383838",
  text: "#FFFFFF", textSub: "#888888", textMuted: "#555555",
  success: "#2ECC71", successDim: "#2ECC7122",
  warning: "#F1C40F", warningDim: "#F1C40F22",
  error: "#E74C3C", errorDim: "#E74C3C22",
  sinpe: "#3498DB", card: "#27AE60", cash: "#E8620A",
};

function fmt(n) { return "₡" + Number(n).toLocaleString("es-CR"); }
function fmtSmall(n) { return n >= 1000 ? "₡" + (n / 1000).toFixed(1) + "k" : fmt(n); }

const PRODUCTS_RANK = [
  { name: "Hamburguesa", emoji: "🍔", units: 34, total: 85000 },
  { name: "Coca Cola", emoji: "🥤", units: 28, total: 28000 },
  { name: "Empanada", emoji: "🥟", units: 22, total: 26400 },
  { name: "Platanitos", emoji: "🍟", units: 19, total: 15200 },
  { name: "Cantón", emoji: "🌮", units: 14, total: 25200 },
  { name: "Fanta Colita", emoji: "🧃", units: 11, total: 11000 },
  { name: "Fresco Natural", emoji: "🍹", units: 9, total: 8100 },
  { name: "Agua", emoji: "💧", units: 6, total: 3600 },
];

const INITIAL_STATE = {
  p1: { cash: 120000, sinpe: 45000, card: 28000, sales: 48, lastSync: 0 },
  p2: { cash: 98000, sinpe: 32000, card: 15000, sales: 39, lastSync: 12 },
};

function PuestoCard({ name, data, status }) {
  const total = data.cash + data.sinpe + data.card;
  const barMax = 150000;
  const statusMap = {
    active: { color: C.success, label: "Activo", dot: "●" },
    slow: { color: C.warning, label: "Señal débil", dot: "●" },
    offline: { color: C.error, label: "Sin señal", dot: "●" },
  };
  const s = statusMap[status];

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: 24,
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 20,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${C.primary}, ${C.primaryDark}88)`,
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: C.text, letterSpacing: 1 }}>
            {name}
          </div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
            {data.sales} ventas registradas
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.surfaceHigh, padding: "5px 10px", borderRadius: 8, border: `1px solid ${C.border}` }}>
          <span style={{ color: s.color, fontSize: 8 }}>{s.dot}</span>
          <span style={{ color: s.color, fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{s.label}</span>
          {data.lastSync > 0 && (
            <span style={{ color: C.textMuted, fontSize: 10, fontFamily: "monospace" }}>·{data.lastSync}m</span>
          )}
        </div>
      </div>

      {/* Total */}
      <div>
        <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 2, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>TOTAL RECAUDADO</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 42, color: C.primary, letterSpacing: -1 }}>
          {fmt(total)}
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: C.surfaceHigh, borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min((total / barMax) * 100, 100)}%`, background: `linear-gradient(90deg, ${C.primary}, ${C.primaryDark})`, borderRadius: 2, transition: "width 0.5s" }} />
        </div>
      </div>

      {/* Payment breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { label: "Efectivo", value: data.cash, color: C.cash, icon: "💵" },
          { label: "SINPE", value: data.sinpe, color: C.sinpe, icon: "📱" },
          { label: "Tarjeta", value: data.card, color: C.card, icon: "💳" },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, width: 20 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: C.textSub, fontFamily: "'Barlow Condensed', sans-serif" }}>{label}</span>
                <span style={{ fontSize: 13, color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{fmt(value)}</span>
              </div>
              <div style={{ height: 3, background: C.surfaceHigh, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(value / total) * 100}%`, background: color, borderRadius: 2, opacity: 0.8 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardGerente() {
  const [data, setData] = useState(INITIAL_STATE);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("live"); // live | cierre | historial
  const [p1Status, setP1Status] = useState("active");
  const [p2Status, setP2Status] = useState("slow");
  const timerRef = useRef(null);

  const totalGlobal = data.p1.cash + data.p1.sinpe + data.p1.card + data.p2.cash + data.p2.sinpe + data.p2.card;
  const totalSales = data.p1.sales + data.p2.sales;

  const doRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setData(d => ({
        p1: { ...d.p1, cash: d.p1.cash + Math.floor(Math.random() * 5000), sales: d.p1.sales + Math.floor(Math.random() * 3), sinpe: d.p1.sinpe + Math.floor(Math.random() * 2000) },
        p2: { ...d.p2, cash: d.p2.cash + Math.floor(Math.random() * 3500), sales: d.p2.sales + Math.floor(Math.random() * 2), card: d.p2.card + Math.floor(Math.random() * 1500) },
      }));
      setLastRefresh(0);
      setRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setLastRefresh(s => s + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (lastRefresh > 0 && lastRefresh % 30 === 0) doRefresh();
  }, [lastRefresh]);

  const maxUnits = Math.max(...PRODUCTS_RANK.map(p => p.units));

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Barlow', 'Arial', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #E8620A44; border-radius: 2px; }
        .tab { transition: all 0.15s; cursor: pointer; }
        .tab:hover { opacity: 0.8; }
        .btn { transition: all 0.12s; cursor: pointer; }
        .btn:hover { opacity: 0.85; }
        .btn:active { transform: scale(0.97); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .fade { animation: fadeIn 0.3s ease forwards; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .live-dot { animation: blink 1.5s infinite; }
        @keyframes barGrow { from { width: 0; } }
        .bar-grow { animation: barGrow 0.6s ease forwards; }
      `}</style>

      {/* Top navbar */}
      <div style={{
        height: 60,
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.primary, letterSpacing: 1 }}>
            🍗 POLLOS PORTEÑOS
          </span>
          <div style={{ width: 1, height: 20, background: C.border }} />
          <span style={{ color: C.textSub, fontSize: 13 }}>⚽ Puntarenas FC vs Saprissa — Partido activo</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div className="live-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: C.success }} />
            <span style={{ fontSize: 12, color: C.success, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 1 }}>EN VIVO</span>
          </div>
          {/* Refresh */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textMuted }}>
            <span style={{ fontFamily: "monospace" }}>
              {refreshing ? "🔄 Actualizando..." : `Actualizado hace ${lastRefresh}s`}
            </span>
            <button className="btn" onClick={doRefresh} style={{
              background: C.surfaceHigh, border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.textSub, padding: "4px 10px", fontSize: 11,
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
            }}>↻ Refrescar</button>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👤</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: "0 28px",
        display: "flex",
        gap: 0,
      }}>
        {[
          { id: "live", label: "📊 Tiempo Real" },
          { id: "cierre", label: "🔒 Cierres" },
          { id: "historial", label: "📁 Historial" },
        ].map(t => (
          <button key={t.id} className="tab" onClick={() => setActiveTab(t.id)} style={{
            padding: "12px 20px",
            background: "none",
            border: "none",
            borderBottom: activeTab === t.id ? `2px solid ${C.primary}` : "2px solid transparent",
            color: activeTab === t.id ? C.primary : C.textSub,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700, fontSize: 14, letterSpacing: 0.5,
            marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>

        {/* === LIVE TAB === */}
        {activeTab === "live" && (
          <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Global KPI row */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 16 }}>
              {/* Total global */}
              <div style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: 24,
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", right: -20, top: -20,
                  width: 120, height: 120,
                  background: C.primaryGlow,
                  borderRadius: "50%",
                }} />
                <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 2, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 6 }}>RECAUDACIÓN TOTAL</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 48, color: C.primary, letterSpacing: -1 }}>
                  {fmt(totalGlobal)}
                </div>
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>Ambos puestos combinados</div>
              </div>

              {[
                { label: "VENTAS TOTALES", value: totalSales, unit: "transacciones", color: C.success },
                { label: "TICKET PROMEDIO", value: fmt(Math.round(totalGlobal / totalSales)), unit: "por venta", color: C.warning },
                { label: "PARTIDOS HOY", value: 1, unit: "activo ahora", color: C.sinpe },
              ].map(k => (
                <div key={k.label} style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: 20,
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                }}>
                  <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 2, fontFamily: "'Barlow Condensed', sans-serif" }}>{k.label}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 36, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: C.textSub }}>{k.unit}</div>
                </div>
              ))}
            </div>

            {/* Puesto cards */}
            <div style={{ display: "flex", gap: 16 }}>
              <PuestoCard name="PUESTO 1" data={data.p1} status={p1Status} />
              <PuestoCard name="PUESTO 2" data={data.p2} status={p2Status} />
            </div>

            {/* Simular cambios de estado */}
            <div style={{ display: "flex", gap: 8, fontSize: 11, color: C.textMuted, alignItems: "center" }}>
              <span>Simular señal:</span>
              {["active","slow","offline"].map(s => (
                <button key={s} className="btn" onClick={() => setP1Status(s)} style={{
                  padding: "3px 8px", borderRadius: 4,
                  background: p1Status === s ? C.surfaceBorder : C.surfaceHigh,
                  border: `1px solid ${C.border}`, color: C.textSub, fontSize: 10, cursor: "pointer",
                }}>P1: {s}</button>
              ))}
              {["active","slow","offline"].map(s => (
                <button key={s} className="btn" onClick={() => setP2Status(s)} style={{
                  padding: "3px 8px", borderRadius: 4,
                  background: p2Status === s ? C.surfaceBorder : C.surfaceHigh,
                  border: `1px solid ${C.border}`, color: C.textSub, fontSize: 10, cursor: "pointer",
                }}>P2: {s}</button>
              ))}
            </div>

            {/* Bottom row: Ranking + Desglose pago global */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* Ranking productos */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 20, letterSpacing: 1 }}>
                  🏆 RANKING DE PRODUCTOS
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {PRODUCTS_RANK.map((p, i) => (
                    <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        width: 22, textAlign: "center", fontSize: 12,
                        color: i === 0 ? C.warning : i === 1 ? C.textSub : i === 2 ? "#CD7F32" : C.textMuted,
                        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
                      }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
                      <span style={{ fontSize: 16 }}>{p.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 13, color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>{p.name}</span>
                          <span style={{ fontSize: 12, color: C.textSub, fontFamily: "monospace" }}>{p.units} uds · {fmtSmall(p.total)}</span>
                        </div>
                        <div style={{ height: 3, background: C.surfaceHigh, borderRadius: 2, overflow: "hidden" }}>
                          <div className="bar-grow" style={{
                            height: "100%",
                            width: `${(p.units / maxUnits) * 100}%`,
                            background: i === 0 ? C.primary : i < 3 ? C.primaryDark : C.surfaceBorder,
                            borderRadius: 2,
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose global de pagos */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 20, letterSpacing: 1 }}>
                  💰 DESGLOSE POR MÉTODO
                </div>
                {(() => {
                  const total = totalGlobal;
                  const cash = data.p1.cash + data.p2.cash;
                  const sinpe = data.p1.sinpe + data.p2.sinpe;
                  const card = data.p1.card + data.p2.card;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {[
                        { label: "Efectivo", icon: "💵", value: cash, color: C.cash },
                        { label: "SINPE Móvil", icon: "📱", value: sinpe, color: C.sinpe },
                        { label: "Tarjeta", icon: "💳", value: card, color: C.card },
                      ].map(m => (
                        <div key={m.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 18 }}>{m.icon}</span>
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>{m.label}</span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: m.color }}>{fmt(m.value)}</div>
                              <div style={{ fontSize: 11, color: C.textMuted }}>{Math.round((m.value / total) * 100)}% del total</div>
                            </div>
                          </div>
                          <div style={{ height: 8, background: C.surfaceHigh, borderRadius: 4, overflow: "hidden" }}>
                            <div className="bar-grow" style={{
                              height: "100%", width: `${(m.value / total) * 100}%`,
                              background: m.color, borderRadius: 4, opacity: 0.85,
                            }} />
                          </div>
                        </div>
                      ))}
                      <div style={{
                        borderTop: `1px solid ${C.border}`, paddingTop: 16,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <span style={{ color: C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14 }}>TOTAL GLOBAL</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, color: C.primary }}>{fmt(total)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* === CIERRES TAB === */}
        {activeTab === "cierre" && (
          <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, color: C.text, letterSpacing: 1 }}>
              🔒 CIERRES DEL PARTIDO
            </div>
            {[
              { name: "PUESTO 1", estado: "pendiente", cajero: "Carlos Mora", efectivoDecl: 118000, efectivoEsp: 120000, sinpeDecl: 45000, sinpeEsp: 45000, cardDecl: 28000, cardEsp: 28000 },
              { name: "PUESTO 2", estado: "no_iniciado", cajero: "María Quesada", efectivoDecl: 0, efectivoEsp: 98000, sinpeDecl: 0, sinpeEsp: 32000, cardDecl: 0, cardEsp: 15000 },
            ].map(p => {
              const diff = (p.efectivoDecl - p.efectivoEsp) + (p.sinpeDecl - p.sinpeEsp) + (p.cardDecl - p.cardEsp);
              const cuadra = diff === 0;
              return (
                <div key={p.name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.text }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: C.textSub }}>Cajero: {p.cajero}</div>
                    </div>
                    <div style={{
                      padding: "6px 14px", borderRadius: 8,
                      background: p.estado === "pendiente" ? C.warningDim : C.surfaceHigh,
                      border: `1px solid ${p.estado === "pendiente" ? C.warning + "44" : C.border}`,
                      color: p.estado === "pendiente" ? C.warning : C.textMuted,
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
                    }}>
                      {p.estado === "pendiente" ? "⏳ Pendiente de aprobación" : "🔘 Cierre no iniciado"}
                    </div>
                  </div>

                  {p.estado === "pendiente" && (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                        {[
                          { label: "Efectivo", decl: p.efectivoDecl, esp: p.efectivoEsp, icon: "💵", color: C.cash },
                          { label: "SINPE", decl: p.sinpeDecl, esp: p.sinpeEsp, icon: "📱", color: C.sinpe },
                          { label: "Tarjeta", decl: p.cardDecl, esp: p.cardEsp, icon: "💳", color: C.card },
                        ].map(m => {
                          const d = m.decl - m.esp;
                          return (
                            <div key={m.label} style={{ background: C.surfaceHigh, borderRadius: 10, padding: 16, border: `1px solid ${C.border}` }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                                <span>{m.icon}</span>
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, color: C.textSub }}>{m.label}</span>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 11, color: C.textMuted }}>Esperado</span>
                                  <span style={{ fontSize: 13, color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{fmt(m.esp)}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 11, color: C.textMuted }}>Declarado</span>
                                  <span style={{ fontSize: 13, color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{fmt(m.decl)}</span>
                                </div>
                                <div style={{
                                  borderTop: `1px solid ${C.border}`, paddingTop: 6,
                                  display: "flex", justifyContent: "space-between",
                                }}>
                                  <span style={{ fontSize: 11, color: C.textMuted }}>Diferencia</span>
                                  <span style={{ fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: d === 0 ? C.success : C.error }}>
                                    {d === 0 ? "✓ Cuadra" : `${d > 0 ? "+" : ""}${fmt(d)}`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{
                          padding: "10px 16px", borderRadius: 8,
                          background: cuadra ? C.successDim : C.errorDim,
                          border: `1px solid ${cuadra ? C.success + "44" : C.error + "44"}`,
                          color: cuadra ? C.success : C.error,
                          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16,
                        }}>
                          {cuadra ? "✅ Todo cuadra" : `⚠ Diferencia de ${fmt(Math.abs(diff))}`}
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button className="btn" style={{ padding: "10px 20px", background: C.errorDim, border: `1px solid ${C.error}44`, borderRadius: 8, color: C.error, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                            ✗ Rechazar
                          </button>
                          <button className="btn" style={{ padding: "10px 20px", background: C.primary, border: "none", borderRadius: 8, color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                            ✓ Aprobar Cierre
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* === HISTORIAL TAB === */}
        {activeTab === "historial" && (
          <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, color: C.text, letterSpacing: 1 }}>
              📁 HISTORIAL DE PARTIDOS
            </div>
            {[
              { fecha: "29 Mar 2026", rival: "Alajuelense", total: 387500, estado: "ok", diff: 0 },
              { fecha: "15 Mar 2026", rival: "Herediano", total: 412000, estado: "diff", diff: -2500 },
              { fecha: "01 Mar 2026", rival: "Saprissa", total: 445200, estado: "ok", diff: 0 },
              { fecha: "15 Feb 2026", rival: "Santos", total: 298000, estado: "ok", diff: 0 },
            ].map((p, i) => (
              <div key={i} style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: C.surfaceHigh, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚽</div>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>vs {p.rival}</div>
                    <div style={{ fontSize: 12, color: C.textSub }}>{p.fecha}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: C.primary }}>{fmt(p.total)}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>recaudado</div>
                  </div>
                  <div style={{
                    padding: "5px 12px", borderRadius: 6,
                    background: p.estado === "ok" ? C.successDim : C.errorDim,
                    border: `1px solid ${p.estado === "ok" ? C.success + "44" : C.error + "44"}`,
                    color: p.estado === "ok" ? C.success : C.error,
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12,
                  }}>
                    {p.estado === "ok" ? "✅ Cuadra" : `⚠ ${fmt(Math.abs(p.diff))}`}
                  </div>
                  <button className="btn" style={{ padding: "6px 14px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSub, fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif", cursor: "pointer" }}>
                    Ver reporte →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer label */}
      <div style={{ textAlign: "center", padding: "20px", color: C.textMuted, fontSize: 11, fontFamily: "monospace", letterSpacing: 2 }}>
        WIREFRAME · JCA-174 · POLLOS PORTEÑOS · DASHBOARD GERENTE
      </div>
    </div>
  );
}
