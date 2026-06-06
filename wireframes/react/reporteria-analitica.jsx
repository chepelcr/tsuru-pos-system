/**
 * WIREFRAME — Módulo de Reportería Analítica (React Web)
 * Issues: JCA-213 (epic), JCA-214 (filtros), JCA-215 (productos),
 *         JCA-216 (sucursal/contexto), JCA-217 (vendedor),
 *         JCA-218 (por sesión), JCA-219 (exportar), JCA-220 (backend)
 *
 * Carpeta en repo: wireframes/react/reporteria-analitica.jsx
 */

import { useState, useMemo } from "react";

const C = {
  primary: "#E8620A", primaryDark: "#C4500A", primaryGlow: "#E8620A15",
  bg: "#0D0D0D", surface: "#161616", surfaceHigh: "#1E1E1E",
  border: "#2A2A2A", borderBright: "#383838",
  text: "#FFFFFF", textSub: "#888888", textMuted: "#444444",
  success: "#2ECC71", successDim: "#2ECC7115",
  warning: "#F1C40F", warningDim: "#F1C40F15",
  error: "#E74C3C", errorDim: "#E74C3C15",
  sinpe: "#3498DB", card: "#27AE60",
};

function fmt(n) { return "₡" + Number(n).toLocaleString("es-CR"); }
function fmtK(n) { return n >= 1000000 ? "₡" + (n / 1000000).toFixed(1) + "M" : n >= 1000 ? "₡" + (n / 1000).toFixed(0) + "k" : fmt(n); }

// ─── MOCK DATA ───
const PRODUCTOS_DATA = [
  { id: 1, name: "Hamburguesa", emoji: "🍔", cat: "Comida", unidades: 284, total: 710000, sesiones: 8 },
  { id: 2, name: "Coca Cola",   emoji: "🥤", cat: "Bebida", unidades: 241, total: 241000, sesiones: 8 },
  { id: 3, name: "Empanada",    emoji: "🥟", cat: "Comida", unidades: 198, total: 237600, sesiones: 7 },
  { id: 4, name: "Cantón",      emoji: "🌮", cat: "Comida", unidades: 142, total: 255600, sesiones: 6 },
  { id: 5, name: "Platanitos",  emoji: "🍟", cat: "Comida", unidades: 136, total: 108800, sesiones: 8 },
  { id: 6, name: "Fanta Colita",emoji: "🧃", cat: "Bebida", unidades: 119, total: 119000, sesiones: 7 },
  { id: 7, name: "Fresco Natural",emoji:"🍹", cat: "Bebida", unidades: 98,  total: 88200,  sesiones: 6 },
  { id: 8, name: "Agua",        emoji: "💧", cat: "Bebida", unidades: 76,  total: 45600,  sesiones: 5 },
];

const SESIONES_DATA = [
  { id: "s1", nombre: "vs Saprissa",    tipo: "partido", sucursal: "Estadio",     fecha: "06 Abr",  total: 338000, ventas: 87, estado: "diff" },
  { id: "s2", nombre: "Turno mañana",   tipo: "turno",   sucursal: "Restaurante", fecha: "05 Abr",  total: 124500, ventas: 43, estado: "ok"   },
  { id: "s3", nombre: "vs Alajuelense", tipo: "partido", sucursal: "Estadio",     fecha: "29 Mar",  total: 387500, ventas: 98, estado: "ok"   },
  { id: "s4", nombre: "Turno tarde",    tipo: "turno",   sucursal: "Restaurante", fecha: "28 Mar",  total: 98200,  ventas: 36, estado: "ok"   },
  { id: "s5", nombre: "vs Herediano",   tipo: "partido", sucursal: "Estadio",     fecha: "15 Mar",  total: 412000, ventas: 104,estado: "diff" },
  { id: "s6", nombre: "Turno mañana",   tipo: "turno",   sucursal: "Restaurante", fecha: "14 Mar",  total: 87400,  ventas: 31, estado: "ok"   },
];

const VENDEDORES_DATA = [
  { id: "u1", nombre: "Carlos Mora",    rol: "cajero",  ventas: 186, total: 423000, ticket: 2274, metodo: "Efectivo",  sesiones: 8 },
  { id: "u2", nombre: "María Quesada", rol: "cajero",  ventas: 162, total: 381500, ticket: 2355, metodo: "SINPE",     sesiones: 7 },
  { id: "u3", nombre: "Diego Vargas",  rol: "cajero",  ventas: 98,  total: 212400, ticket: 2167, metodo: "Efectivo",  sesiones: 5 },
  { id: "u4", nombre: "Ana Jiménez",   rol: "cajero",  ventas: 87,  total: 198700, ticket: 2284, metodo: "Tarjeta",   sesiones: 4 },
  { id: "u5", nombre: "JP Campos",     rol: "gerente", ventas: 23,  total: 51900,  ticket: 2257, metodo: "Efectivo",  sesiones: 3 },
];

const CONTEXTOS_DATA = [
  { sucursal: "Estadio",     contexto: "gradas", total: 824000, ventas: 312, ticket: 2641 },
  { sucursal: "Estadio",     contexto: "mesa",   total: 487500, ventas: 198, ticket: 2462 },
  { sucursal: "Restaurante", contexto: "caja",   total: 310100, ventas: 110, ticket: 2819 },
];

// ─── SUBCOMPONENTS ───

function FilterChip({ label, onRemove }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: C.primary + "20", border: `1px solid ${C.primary}55`, borderRadius: 20 }}>
      <span style={{ fontSize: 12, color: C.primary, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{label}</span>
      <button onClick={onRemove} style={{ background: "none", border: "none", color: C.primary, fontSize: 14, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
    </div>
  );
}

function KPICard({ label, value, sub, color = C.primary }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", flex: 1 }}>
      <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 2, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 32, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.textSub, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function SortHeader({ col, label, sortCol, sortDir, onSort }) {
  const active = sortCol === col;
  return (
    <th onClick={() => onSort(col)} style={{ padding: "10px 14px", fontSize: 10, color: active ? C.primary : C.textMuted, letterSpacing: 1.5, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textAlign: "left", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
      {label} {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </th>
  );
}

// ─── VIEWS ───

function ViewProductos({ filters }) {
  const [sortCol, setSortCol] = useState("unidades");
  const [sortDir, setSortDir] = useState("desc");
  const [drillId, setDrillId] = useState(null);

  const sorted = useMemo(() => {
    return [...PRODUCTOS_DATA].sort((a, b) => {
      const mult = sortDir === "asc" ? 1 : -1;
      return (a[sortCol] > b[sortCol] ? 1 : -1) * mult;
    });
  }, [sortCol, sortDir]);

  const maxUnits = Math.max(...PRODUCTOS_DATA.map(p => p.unidades));
  const totalGlobal = PRODUCTOS_DATA.reduce((s, p) => s + p.total, 0);

  const onSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const drillProduct = PRODUCTOS_DATA.find(p => p.id === drillId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPIs */}
      <div style={{ display: "flex", gap: 14 }}>
        <KPICard label="TOTAL RECAUDADO" value={fmtK(totalGlobal)} sub="en el período filtrado" />
        <KPICard label="UNIDADES VENDIDAS" value={PRODUCTOS_DATA.reduce((s, p) => s + p.unidades, 0)} sub="todos los productos" color={C.success} />
        <KPICard label="PRODUCTO ESTRELLA" value="🍔 Hamburguesa" sub="284 unidades vendidas" color={C.warning} />
        <KPICard label="CATEGORÍA LÍDER" value="🍟 Comida" sub="64% de las unidades" color={C.sinpe} />
      </div>

      {/* Tabla */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.text }}>🏆 VENTAS POR PRODUCTO</span>
          <span style={{ fontSize: 11, color: C.textSub }}>Click en fila → drill-down</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.surfaceHigh }}>
                <SortHeader col="name"     label="PRODUCTO"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <SortHeader col="unidades" label="UNIDADES"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <SortHeader col="total"    label="MONTO"      sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <th style={{ padding: "10px 14px", fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontFamily: "'Barlow Condensed', sans-serif", textAlign: "left" }}>% DEL TOTAL</th>
                <th style={{ padding: "10px 14px", fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontFamily: "'Barlow Condensed', sans-serif", textAlign: "left" }}>TENDENCIA</th>
                <SortHeader col="sesiones" label="SESIONES"  sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <>
                  <tr key={p.id} onClick={() => setDrillId(drillId === p.id ? null : p.id)}
                    style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: drillId === p.id ? C.primaryGlow : "transparent" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{p.emoji}</span>
                        <div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: C.textMuted }}>{p.cat}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: C.text }}>{p.unidades}</div>
                      <div style={{ height: 3, width: 80, background: C.surfaceHigh, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(p.unidades / maxUnits) * 100}%`, background: i === 0 ? C.primary : i < 3 ? C.primaryDark : C.surfaceBorder || "#333", borderRadius: 2 }} />
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.primary }}>{fmt(p.total)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ height: 6, width: 60, background: C.surfaceHigh, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(p.total / totalGlobal) * 100}%`, background: C.primary, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, color: C.textSub, fontFamily: "monospace" }}>{((p.total / totalGlobal) * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: 16, color: i % 3 === 0 ? C.success : i % 3 === 1 ? C.warning : C.primary }}>
                        {i % 3 === 0 ? "↑" : i % 3 === 1 ? "→" : "↑"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, color: C.textSub }}>{p.sesiones}</td>
                  </tr>
                  {/* Drill-down */}
                  {drillId === p.id && drillProduct && (
                    <tr key={`drill-${p.id}`}>
                      <td colSpan={6} style={{ background: C.surfaceHigh, padding: "14px 20px" }}>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 14, color: C.primary, marginBottom: 10 }}>
                          DRILL-DOWN: {drillProduct.emoji} {drillProduct.name}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                          {[
                            { label: "Por contexto", items: [{ k: "Gradas", v: Math.round(drillProduct.unidades * 0.48) }, { k: "Mesa", v: Math.round(drillProduct.unidades * 0.35) }, { k: "Caja", v: Math.round(drillProduct.unidades * 0.17) }] },
                            { label: "Por sucursal", items: [{ k: "Estadio", v: Math.round(drillProduct.unidades * 0.78) }, { k: "Restaurante", v: Math.round(drillProduct.unidades * 0.22) }] },
                            { label: "Por método de pago", items: [{ k: "Efectivo", v: Math.round(drillProduct.total * 0.56) }, { k: "SINPE", v: Math.round(drillProduct.total * 0.28) }, { k: "Tarjeta", v: Math.round(drillProduct.total * 0.16) }] },
                          ].map(g => (
                            <div key={g.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1, marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>{g.label.toUpperCase()}</div>
                              {g.items.map(item => (
                                <div key={item.k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <span style={{ fontSize: 12, color: C.textSub }}>{item.k}</span>
                                  <span style={{ fontSize: 13, color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                                    {typeof item.v === "number" && item.v > 5000 ? fmt(item.v) : item.v + " uds"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ViewSesiones() {
  const [sortCol, setSortCol] = useState("fecha");
  const [sortDir, setSortDir] = useState("desc");

  const onSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const totalGlobal = SESIONES_DATA.reduce((s, p) => s + p.total, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 14 }}>
        <KPICard label="TOTAL PERÍODO" value={fmtK(totalGlobal)} sub="todas las sesiones" />
        <KPICard label="SESIONES" value={SESIONES_DATA.length} sub="partidos + turnos" color={C.sinpe} />
        <KPICard label="MEJOR SESIÓN" value="vs Herediano" sub={fmtK(412000)} color={C.warning} />
        <KPICard label="PROMEDIO POR SESIÓN" value={fmtK(Math.round(totalGlobal / SESIONES_DATA.length))} sub="por partido/turno" color={C.success} />
      </div>

      {/* Gráfica de barras */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 16 }}>📈 TENDENCIA DE RECAUDACIÓN</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
          {SESIONES_DATA.slice().reverse().map((s, i) => {
            const maxV = Math.max(...SESIONES_DATA.map(x => x.total));
            const pct = (s.total / maxV) * 100;
            return (
              <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>{fmtK(s.total)}</div>
                <div style={{ width: "100%", height: `${pct}%`, background: s.tipo === "partido" ? C.primary : C.sinpe, borderRadius: "4px 4px 0 0", minHeight: 4 }} />
                <div style={{ fontSize: 9, color: C.textMuted, textAlign: "center", lineHeight: 1.2 }}>{s.fecha}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          {[{ color: C.primary, label: "Partido" }, { color: C.sinpe, label: "Turno Restaurante" }].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 11, color: C.textSub }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.text }}>📅 DETALLE POR SESIÓN</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.surfaceHigh }}>
              {["SESIÓN", "TIPO", "SUCURSAL", "FECHA", "TOTAL", "VENTAS", "ESTADO"].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontFamily: "'Barlow Condensed', sans-serif", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SESIONES_DATA.map(s => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                <td style={{ padding: "12px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>
                  {s.tipo === "partido" ? "⚽" : "🍽"} {s.nombre}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ padding: "3px 8px", borderRadius: 4, background: s.tipo === "partido" ? C.primaryGlow : C.sinpe + "20", color: s.tipo === "partido" ? C.primary : C.sinpe, fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                    {s.tipo}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: C.textSub }}>{s.sucursal}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: C.textSub, fontFamily: "monospace" }}>{s.fecha}</td>
                <td style={{ padding: "12px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.primary }}>{fmt(s.total)}</td>
                <td style={{ padding: "12px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, color: C.textSub }}>{s.ventas}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ padding: "3px 8px", borderRadius: 4, background: s.estado === "ok" ? C.successDim : C.warningDim, color: s.estado === "ok" ? C.success : C.warning, fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                    {s.estado === "ok" ? "✅ Cuadra" : "⚠ Diferencia"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ViewVendedores() {
  const totalGlobal = VENDEDORES_DATA.reduce((s, v) => s + v.total, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 14 }}>
        <KPICard label="VENDEDORES ACTIVOS" value={VENDEDORES_DATA.length} sub="en el período" color={C.sinpe} />
        <KPICard label="TOTAL GENERADO" value={fmtK(totalGlobal)} sub="suma de todos" />
        <KPICard label="TOP VENDEDOR" value="Carlos Mora" sub={`${fmtK(423000)} · 186 ventas`} color={C.warning} />
        <KPICard label="TICKET PROMEDIO GLOBAL" value={fmt(Math.round(totalGlobal / VENDEDORES_DATA.reduce((s, v) => s + v.ventas, 0)))} sub="por transacción" color={C.success} />
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.text }}>👤 RENDIMIENTO POR VENDEDOR</span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.surfaceHigh }}>
              {["VENDEDOR", "ROL", "TRANSACCIONES", "TOTAL", "TICKET PROM.", "MÉTODO FAVORITO", "SESIONES"].map(h => (
                <th key={h} style={{ padding: "10px 14px", fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontFamily: "'Barlow Condensed', sans-serif", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VENDEDORES_DATA.map((v, i) => (
              <tr key={v.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: i === 0 ? C.primary : C.surfaceHigh, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: i === 0 ? "#fff" : C.textSub }}>
                      {i === 0 ? "🥇" : i + 1}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>{v.nombre}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>userId: {v.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ padding: "3px 8px", borderRadius: 4, background: v.rol === "gerente" ? C.warningDim : C.primaryGlow, color: v.rol === "gerente" ? C.warning : C.primary, fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{v.rol}</span>
                </td>
                <td style={{ padding: "12px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: C.text }}>{v.ventas}</td>
                <td style={{ padding: "12px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.primary }}>{fmt(v.total)}</td>
                <td style={{ padding: "12px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, color: C.textSub }}>{fmt(v.ticket)}</td>
                <td style={{ padding: "12px 14px", fontSize: 13, color: C.textSub }}>{v.metodo}</td>
                <td style={{ padding: "12px 14px", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, color: C.textSub }}>{v.sesiones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ViewContextos() {
  const totalGlobal = CONTEXTOS_DATA.reduce((s, c) => s + c.total, 0);
  const maxTotal = Math.max(...CONTEXTOS_DATA.map(c => c.total));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 14 }}>
        <KPICard label="TOTAL GLOBAL" value={fmtK(totalGlobal)} sub="todas las sucursales" />
        <KPICard label="MEJOR CONTEXTO" value="🏟 Gradas" sub={fmtK(824000)} color={C.primary} />
        <KPICard label="TICKET MÁS ALTO" value="🍽 Caja Rest." sub={fmt(2819) + " promedio"} color={C.warning} />
        <KPICard label="SUCURSALES ACTIVAS" value="2" sub="Estadio · Restaurante" color={C.sinpe} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Por sucursal */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 16 }}>🏢 POR SUCURSAL</div>
          {[
            { name: "Estadio", total: 824000 + 487500, ventas: 312 + 198, color: C.primary, icon: "🏟" },
            { name: "Restaurante", total: 310100, ventas: 110, color: C.sinpe, icon: "🍽" },
          ].map(s => (
            <div key={s.name} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: C.textSub }}>{s.ventas} ventas</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: s.color }}>{fmtK(s.total)}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{((s.total / totalGlobal) * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div style={{ height: 8, background: C.surfaceHigh, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(s.total / totalGlobal) * 100}%`, background: s.color, borderRadius: 4, opacity: 0.85 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Por contexto */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 16 }}>📍 POR CONTEXTO</div>
          {CONTEXTOS_DATA.map((c, i) => (
            <div key={c.contexto} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: C.text, textTransform: "capitalize" }}>{c.contexto}</div>
                  <div style={{ fontSize: 12, color: C.textSub }}>{c.sucursal} · {c.ventas} ventas · ticket {fmt(c.ticket)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: [C.primary, "#9B59B6", C.sinpe][i] }}>{fmtK(c.total)}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{((c.total / totalGlobal) * 100).toFixed(1)}%</div>
                </div>
              </div>
              <div style={{ height: 8, background: C.surfaceHigh, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(c.total / maxTotal) * 100}%`, background: [C.primary, "#9B59B6", C.sinpe][i], borderRadius: 4, opacity: 0.85 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ───
const VIEWS = [
  { id: "productos", label: "🏆 Por Producto" },
  { id: "sesiones",  label: "📅 Por Sesión"   },
  { id: "vendedores",label: "👤 Por Vendedor"  },
  { id: "contextos", label: "📍 Por Contexto"  },
];

const PRESETS = ["Hoy", "Esta semana", "Este mes", "Temporada"];

export default function ReporteriaAnalitica() {
  const [activeView, setActiveView] = useState("productos");
  const [preset, setPreset]         = useState("Este mes");
  const [sucursal, setSucursal]     = useState("Todas");
  const [tipo, setTipo]             = useState("Todos");
  const [contexto, setContexto]     = useState("Todos");
  const [vendedor, setVendedor]     = useState("Todos");
  const [activeFilters, setActiveFilters] = useState([]);

  const addFilter = (label) => {
    if (!activeFilters.includes(label)) setActiveFilters(f => [...f, label]);
  };
  const removeFilter = (label) => setActiveFilters(f => f.filter(x => x !== label));

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Barlow', 'Arial', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #E8620A44; border-radius: 2px; }
        button { cursor: pointer; font-family: inherit; }
        select { font-family: inherit; }
        th { white-space: nowrap; }
        tr:hover td { background: #1a1a1a; }
      `}</style>

      {/* Navbar */}
      <div style={{ height: 58, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.primary, letterSpacing: 1 }}>🍗 POLLOS PORTEÑOS · REPORTERÍA</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "7px 16px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14 }}>
            📊 Exportar Excel
          </button>
          <button style={{ padding: "7px 16px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14 }}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "14px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Período presets */}
          <div style={{ display: "flex", gap: 4 }}>
            {PRESETS.map(p => (
              <button key={p} onClick={() => { setPreset(p); addFilter(p); }} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: preset === p ? C.primary : C.surfaceHigh, color: preset === p ? "#fff" : C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13 }}>{p}</button>
            ))}
            <div style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: 4 }}>
              <input type="date" defaultValue="2026-03-01" style={{ padding: "4px 8px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSub, fontSize: 12, outline: "none" }} />
              <span style={{ color: C.textMuted, fontSize: 12 }}>→</span>
              <input type="date" defaultValue="2026-04-06" style={{ padding: "4px 8px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 6, color: C.textSub, fontSize: 12, outline: "none" }} />
            </div>
          </div>

          <div style={{ width: 1, height: 24, background: C.border }} />

          {/* Dropdowns */}
          {[
            { label: "Sucursal", value: sucursal, set: setSucursal, opts: ["Todas", "Estadio", "Restaurante"] },
            { label: "Tipo",     value: tipo,     set: setTipo,     opts: ["Todos", "Partido", "Turno"] },
            { label: "Contexto", value: contexto, set: setContexto, opts: ["Todos", "Gradas", "Mesa", "Caja"] },
            { label: "Vendedor", value: vendedor, set: setVendedor, opts: ["Todos", "Carlos Mora", "María Quesada", "Diego Vargas", "Ana Jiménez", "JP Campos"] },
          ].map(f => (
            <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{f.label.toUpperCase()}:</span>
              <select value={f.value} onChange={e => { f.set(e.target.value); if (e.target.value !== "Todos" && e.target.value !== "Todas") addFilter(`${f.label}: ${e.target.value}`); }}
                style={{ padding: "5px 10px", background: f.value !== "Todos" && f.value !== "Todas" ? C.primaryGlow : C.surfaceHigh, border: `1px solid ${f.value !== "Todos" && f.value !== "Todas" ? C.primary : C.border}`, borderRadius: 6, color: f.value !== "Todos" && f.value !== "Todas" ? C.primary : C.textSub, fontSize: 13, outline: "none" }}>
                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}

          <button onClick={() => { setSucursal("Todas"); setTipo("Todos"); setContexto("Todos"); setVendedor("Todos"); setActiveFilters([]); }}
            style={{ padding: "5px 12px", background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>
            ✕ Limpiar
          </button>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>Filtros activos:</span>
            {activeFilters.map(f => <FilterChip key={f} label={f} onRemove={() => removeFilter(f)} />)}
          </div>
        )}
      </div>

      {/* View tabs */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 28px", display: "flex" }}>
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setActiveView(v.id)} style={{
            padding: "12px 20px", background: "none", border: "none",
            borderBottom: activeView === v.id ? `2px solid ${C.primary}` : "2px solid transparent",
            color: activeView === v.id ? C.primary : C.textSub,
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 0.5,
            marginBottom: -1,
          }}>{v.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
        {activeView === "productos"  && <ViewProductos filters={{}} />}
        {activeView === "sesiones"   && <ViewSesiones />}
        {activeView === "vendedores" && <ViewVendedores />}
        {activeView === "contextos"  && <ViewContextos />}
      </div>

      <div style={{ textAlign: "center", padding: "16px", color: C.textMuted, fontSize: 11, fontFamily: "monospace", letterSpacing: 2 }}>
        WIREFRAME · JCA-213 al JCA-220 · REPORTERÍA ANALÍTICA (REACT WEB)
      </div>
    </div>
  );
}
