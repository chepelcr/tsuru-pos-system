import { useState } from "react";

const C = {
  primary: "#E8620A", primaryDark: "#C4500A", primaryGlow: "#E8620A15",
  bg: "#0D0D0D", surface: "#161616", surfaceHigh: "#1E1E1E",
  border: "#2A2A2A", borderBright: "#383838",
  text: "#FFFFFF", textSub: "#888888", textMuted: "#444444",
  success: "#2ECC71", successDim: "#2ECC7115",
  warning: "#F1C40F", warningDim: "#F1C40F15",
  error: "#E74C3C", errorDim: "#E74C3C15",
  sinpe: "#3498DB", card: "#27AE60", cash: "#E8620A",
};

function fmt(n) { return "₡" + Number(n).toLocaleString("es-CR"); }

const INIT_PRODUCTS = [
  { id: 1, name: "Hamburguesa", emoji: "🍔", cat: "Comida", price: 2500, active: true },
  { id: 2, name: "Empanada", emoji: "🥟", cat: "Comida", price: 1200, active: true },
  { id: 3, name: "Platanitos", emoji: "🍟", cat: "Comida", price: 800, active: true },
  { id: 4, name: "Cantón", emoji: "🌮", cat: "Comida", price: 1800, active: true },
  { id: 5, name: "Coca Cola", emoji: "🥤", cat: "Bebida", price: 1000, active: true },
  { id: 6, name: "Fanta Colita", emoji: "🧃", cat: "Bebida", price: 1000, active: true },
  { id: 7, name: "Agua", emoji: "💧", cat: "Bebida", price: 600, active: false },
  { id: 8, name: "Fresco Natural", emoji: "🍹", cat: "Bebida", price: 900, active: true },
];

const REPORTE = {
  partido: "Puntarenas FC vs Saprissa",
  fecha: "06 de Abril, 2026 · 7:00 PM",
  estadio: "Estadio Lito Pérez",
  puestos: [
    {
      name: "Puesto 1", cajero: "Carlos Mora", estado: "diff",
      ventas: [
        { name: "Hamburguesa", emoji: "🍔", qty: 20, unit: 2500 },
        { name: "Empanada", emoji: "🥟", qty: 15, unit: 1200 },
        { name: "Platanitos", emoji: "🍟", qty: 8, unit: 800 },
        { name: "Cantón", emoji: "🌮", qty: 5, unit: 1800 },
        { name: "Coca Cola", emoji: "🥤", qty: 18, unit: 1000 },
        { name: "Fanta Colita", emoji: "🧃", qty: 10, unit: 1000 },
        { name: "Fresco Natural", emoji: "🍹", qty: 6, unit: 900 },
      ],
      efectivo: 120000, sinpe: 45000, card: 28000,
      efectivoDecl: 118000, sinpeDecl: 45000, cardDecl: 28000,
    },
    {
      name: "Puesto 2", cajero: "María Quesada", estado: "ok",
      ventas: [
        { name: "Hamburguesa", emoji: "🍔", qty: 14, unit: 2500 },
        { name: "Empanada", emoji: "🥟", qty: 7, unit: 1200 },
        { name: "Platanitos", emoji: "🍟", qty: 11, unit: 800 },
        { name: "Cantón", emoji: "🌮", qty: 9, unit: 1800 },
        { name: "Coca Cola", emoji: "🥤", qty: 10, unit: 1000 },
        { name: "Fanta Colita", emoji: "🧃", qty: 8, unit: 1000 },
        { name: "Fresco Natural", emoji: "🍹", qty: 3, unit: 900 },
      ],
      efectivo: 98000, sinpe: 32000, card: 15000,
      efectivoDecl: 98000, sinpeDecl: 32000, cardDecl: 15000,
    },
  ],
};

// ─── GESTIÓN DE PRODUCTOS ───
function GestionProductos() {
  const [products, setProducts] = useState(INIT_PRODUCTS);
  const [filterCat, setFilterCat] = useState("Todos");
  const [editId, setEditId] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newProd, setNewProd] = useState({ name: "", cat: "Comida", price: "", emoji: "🆕" });
  const [saved, setSaved] = useState(null);

  const filtered = filterCat === "Todos" ? products : products.filter(p => p.cat === filterCat);

  const savePrice = (id) => {
    setProducts(ps => ps.map(p => p.id === id ? { ...p, price: Number(editPrice) } : p));
    setSaved(id);
    setTimeout(() => setSaved(null), 1500);
    setEditId(null);
  };

  const toggleActive = (id) => setProducts(ps => ps.map(p => p.id === id ? { ...p, active: !p.active } : p));

  const addProduct = () => {
    if (!newProd.name || !newProd.price) return;
    setProducts(ps => [...ps, { ...newProd, id: Date.now(), price: Number(newProd.price), active: true }]);
    setShowModal(false);
    setNewProd({ name: "", cat: "Comida", price: "", emoji: "🆕" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, color: C.text, letterSpacing: 1 }}>🛒 GESTIÓN DE PRODUCTOS</div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{products.filter(p => p.active).length} activos · {products.filter(p => !p.active).length} inactivos</div>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          padding: "10px 20px", background: C.primary, border: "none", borderRadius: 8,
          color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>+ Nuevo Producto</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8 }}>
        {["Todos", "Comida", "Bebida"].map(c => (
          <button key={c} onClick={() => setFilterCat(c)} style={{
            padding: "6px 16px", borderRadius: 6, border: "none",
            background: filterCat === c ? C.primary : C.surfaceHigh,
            color: filterCat === c ? "#fff" : C.textSub,
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>{c}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
          padding: "10px 20px", borderBottom: `1px solid ${C.border}`,
          background: C.surfaceHigh,
        }}>
          {["PRODUCTO", "CATEGORÍA", "PRECIO", "ESTADO", "ACCIÓN"].map(h => (
            <div key={h} style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {filtered.map((p, i) => (
          <div key={p.id} style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
            padding: "12px 20px",
            borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
            alignItems: "center",
            background: saved === p.id ? C.successDim : "transparent",
            transition: "background 0.3s",
            opacity: p.active ? 1 : 0.5,
          }}>
            {/* Nombre */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{p.emoji}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>{p.name}</span>
              {saved === p.id && <span style={{ fontSize: 11, color: C.success }}>✓ Guardado</span>}
            </div>

            {/* Categoría */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 4,
              background: p.cat === "Comida" ? "#E8620A15" : "#3498DB15",
              color: p.cat === "Comida" ? C.primary : C.sinpe,
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12,
              width: "fit-content",
            }}>{p.cat === "Comida" ? "🍟" : "🥤"} {p.cat}</div>

            {/* Precio */}
            {editId === p.id ? (
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="number"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  autoFocus
                  style={{
                    width: 90, padding: "4px 8px",
                    background: C.surfaceHigh, border: `1px solid ${C.primary}`,
                    borderRadius: 6, color: C.text,
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, outline: "none",
                  }}
                />
                <button onClick={() => savePrice(p.id)} style={{ padding: "4px 8px", background: C.primary, border: "none", borderRadius: 6, color: "#fff", fontSize: 12, cursor: "pointer" }}>✓</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => { setEditId(p.id); setEditPrice(p.price); }}>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.primary }}>{fmt(p.price)}</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>✏</span>
              </div>
            )}

            {/* Toggle activo */}
            <div>
              <button onClick={() => toggleActive(p.id)} style={{
                padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                background: p.active ? C.successDim : C.errorDim,
                color: p.active ? C.success : C.error,
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12,
              }}>{p.active ? "● Activo" : "○ Inactivo"}</button>
            </div>

            {/* Eliminar (soft) */}
            <button onClick={() => toggleActive(p.id)} style={{
              padding: "4px 8px", background: "transparent",
              border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.textMuted, fontSize: 12, cursor: "pointer",
            }}>⊘</button>
          </div>
        ))}
      </div>

      {/* Modal nuevo producto */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "#000000CC",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: C.surface, border: `1px solid ${C.borderBright}`,
            borderRadius: 16, padding: 28, width: 420, display: "flex", flexDirection: "column", gap: 16,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: C.text }}>+ Nuevo Producto</div>
            {[
              { label: "Nombre", key: "name", type: "text", placeholder: "Ej: Nachos" },
              { label: "Precio (₡)", key: "price", type: "number", placeholder: "1500" },
              { label: "Emoji", key: "emoji", type: "text", placeholder: "🍿" },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 11, color: C.textSub, marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>{f.label.toUpperCase()}</div>
                <input type={f.type} placeholder={f.placeholder} value={newProd[f.key]}
                  onChange={e => setNewProd(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ width: "100%", padding: "10px 12px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, outline: "none" }}
                />
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: C.textSub, marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>CATEGORÍA</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["Comida", "Bebida"].map(c => (
                  <button key={c} onClick={() => setNewProd(p => ({ ...p, cat: c }))} style={{
                    flex: 1, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer",
                    background: newProd.cat === c ? C.primary : C.surfaceHigh,
                    color: newProd.cat === c ? "#fff" : C.textSub,
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15,
                  }}>{c}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "11px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Cancelar</button>
              <button onClick={addProduct} style={{ flex: 2, padding: "11px", background: C.primary, border: "none", borderRadius: 8, color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>✓ Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REPORTE DE PARTIDO ───
function ReportePartido() {
  const [view, setView] = useState("reporte"); // reporte | print
  const totalGlobal = REPORTE.puestos.reduce((s, p) => s + p.efectivo + p.sinpe + p.card, 0);

  const allVentas = {};
  REPORTE.puestos.forEach(p => p.ventas.forEach(v => {
    if (!allVentas[v.name]) allVentas[v.name] = { ...v, qty: 0 };
    allVentas[v.name].qty += v.qty;
  }));
  const topProducto = Object.values(allVentas).sort((a, b) => b.qty - a.qty)[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, color: C.text, letterSpacing: 1 }}>📋 REPORTE DE PARTIDO</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>{REPORTE.partido} · {REPORTE.fecha}</div>
        </div>
        <button style={{
          padding: "10px 20px", background: C.surfaceHigh, border: `1px solid ${C.border}`,
          borderRadius: 8, color: C.textSub, fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>🖨 Exportar PDF</button>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
        {[
          { label: "TOTAL RECAUDADO", value: fmt(totalGlobal), color: C.primary },
          { label: "TOTAL VENTAS", value: `${REPORTE.puestos.reduce((s, p) => s + p.ventas.reduce((a, v) => a + v.qty, 0), 0)} uds`, color: C.success },
          { label: "ESTRELLA DEL PARTIDO", value: `${topProducto.emoji} ${topProducto.name}`, color: C.warning },
          { label: "ESTADO CIERRES", value: REPORTE.puestos.every(p => p.estado === "ok") ? "✅ Todo cuadra" : "⚠ Diferencia P1", color: REPORTE.puestos.every(p => p.estado === "ok") ? C.success : C.warning },
        ].map(k => (
          <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1.5, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>{k.label}</div>
            <div style={{ color: k.color, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Puestos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {REPORTE.puestos.map(p => {
          const totalP = p.efectivo + p.sinpe + p.card;
          const totalDecl = p.efectivoDecl + p.sinpeDecl + p.cardDecl;
          const diff = totalDecl - totalP;
          return (
            <div key={p.name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: p.estado === "ok" ? C.success : C.warning }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: C.text }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: C.textSub }}>{p.cajero}</div>
                </div>
                <div style={{
                  padding: "4px 10px", borderRadius: 6,
                  background: p.estado === "ok" ? C.successDim : C.warningDim,
                  border: `1px solid ${p.estado === "ok" ? C.success + "44" : C.warning + "44"}`,
                  color: p.estado === "ok" ? C.success : C.warning,
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12,
                }}>
                  {p.estado === "ok" ? "✅ Cuadra" : `⚠ ${fmt(Math.abs(diff))}`}
                </div>
              </div>

              {/* Ventas por producto */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1.5, marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>PRODUCTOS VENDIDOS</div>
                {p.ventas.map(v => (
                  <div key={v.name} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.textSub, fontSize: 12 }}>{v.emoji} {v.name} ×{v.qty}</span>
                    <span style={{ color: C.text, fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>{fmt(v.qty * v.unit)}</span>
                  </div>
                ))}
              </div>

              {/* Métodos */}
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1.5, marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>DESGLOSE POR MÉTODO</div>
                {[
                  { label: "Efectivo", esp: p.efectivo, decl: p.efectivoDecl, icon: "💵" },
                  { label: "SINPE", esp: p.sinpe, decl: p.sinpeDecl, icon: "📱" },
                  { label: "Tarjeta", esp: p.card, decl: p.cardDecl, icon: "💳" },
                ].map(m => (
                  <div key={m.label} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                    <span style={{ color: C.textSub, fontSize: 12 }}>{m.icon} {m.label}</span>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ color: m.esp === m.decl ? C.text : C.warning, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13 }}>{fmt(m.esp)}</span>
                      {m.esp !== m.decl && <span style={{ color: C.warning, fontSize: 10, marginLeft: 4 }}>↔ {fmt(m.decl)}</span>}
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15 }}>TOTAL</span>
                  <span style={{ color: C.primary, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22 }}>{fmt(totalP)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen global */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: C.text, letterSpacing: 1, marginBottom: 16 }}>
          🌐 RESUMEN GLOBAL DEL PARTIDO
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
          {[
            { label: "Total Efectivo", value: fmt(REPORTE.puestos.reduce((s, p) => s + p.efectivo, 0)), icon: "💵", color: C.cash },
            { label: "Total SINPE", value: fmt(REPORTE.puestos.reduce((s, p) => s + p.sinpe, 0)), icon: "📱", color: C.sinpe },
            { label: "Total Tarjeta", value: fmt(REPORTE.puestos.reduce((s, p) => s + p.card, 0)), icon: "💳", color: C.card },
          ].map(m => (
            <div key={m.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{m.icon}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 20, paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: C.textSub, fontFamily: "'Barlow Condensed', sans-serif" }}>
            Generado: {new Date().toLocaleString("es-CR")} · Sistema Pollos Porteños
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 32, color: C.primary }}>{fmt(totalGlobal)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ───
export default function WireframeReactPages() {
  const [activeView, setActiveView] = useState("productos");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Barlow', 'Arial', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #E8620A44; border-radius: 2px; }
        button { font-family: inherit; } input { font-family: inherit; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      {/* Navbar */}
      <div style={{ height: 58, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.primary, letterSpacing: 1 }}>🍗 POLLOS PORTEÑOS · GERENTE</span>
        <div style={{ display: "flex", gap: 0 }}>
          {[
            { id: "productos", label: "🛒 Productos" },
            { id: "reporte", label: "📋 Reporte" },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveView(t.id)} style={{
              padding: "8px 20px", background: "none", border: "none", cursor: "pointer",
              borderBottom: activeView === t.id ? `2px solid ${C.primary}` : "2px solid transparent",
              color: activeView === t.id ? C.primary : C.textSub,
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14,
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", letterSpacing: 1 }}>
          WIREFRAMES JCA-161 + JCA-189
        </div>
      </div>

      <div style={{ padding: "28px", maxWidth: 1300, margin: "0 auto" }}>
        {activeView === "productos" && <GestionProductos />}
        {activeView === "reporte" && <ReportePartido />}
      </div>
    </div>
  );
}
