/**
 * WIREFRAME — POS Web Cajero (React PWA)
 * Issue: JCA-206
 * Descripción: Versión web mobile-first del POS del cajero.
 *              Funcionalmente idéntico al Flutter (JCA-163).
 *              Fallback para iOS o dispositivos sin app instalada.
 *
 * Carpeta en repo: wireframes/react/pos-cajero-web.jsx
 */

import { useState } from "react";

const C = {
  primary: "#E8620A", primaryDark: "#C4500A",
  bg: "#111111", surface: "#1C1C1C", surfaceHigh: "#242424",
  border: "#2E2E2E", text: "#FFFFFF", textSub: "#888888", textMuted: "#444444",
  success: "#2ECC71", successDim: "#2ECC7115",
  warning: "#F1C40F", warningDim: "#F1C40F15",
  error: "#E74C3C", errorDim: "#E74C3C15",
  sinpe: "#3498DB", card: "#27AE60",
};

const PRODUCTS = [
  { id: 1, name: "Hamburguesa", price: 2500, cat: "Comida", emoji: "🍔", stock: 12 },
  { id: 2, name: "Empanada",    price: 1200, cat: "Comida", emoji: "🥟", stock: 20 },
  { id: 3, name: "Platanitos",  price: 800,  cat: "Comida", emoji: "🍟", stock: 3  },
  { id: 4, name: "Cantón",      price: 1800, cat: "Comida", emoji: "🌮", stock: 8  },
  { id: 5, name: "Coca Cola",   price: 1000, cat: "Bebida", emoji: "🥤", stock: 15 },
  { id: 6, name: "Fanta Colita",price: 1000, cat: "Bebida", emoji: "🧃", stock: 10 },
  { id: 7, name: "Agua",        price: 600,  cat: "Bebida", emoji: "💧", stock: 0  },
  { id: 8, name: "Fresco Natural",price: 900,cat: "Bebida", emoji: "🍹", stock: 6  },
];

// Asignación del cajero — viene de AsignacionLocal descargada al login
const ASIGNACION = {
  id: "asgn-001",
  puesto: "Puesto 1",
  contexto: "gradas",
  sesion: "vs Saprissa",
};

function fmt(n) { return "₡" + Number(n).toLocaleString("es-CR"); }

export default function POSCajeroWeb() {
  const [syncStatus] = useState("online"); // online | offline | syncing
  const [cat, setCat]     = useState("Todos");
  const [cart, setCart]   = useState({});
  const [screen, setScreen] = useState("pos"); // pos | payment | success
  const [payMethod, setPayMethod] = useState("Efectivo");
  const [received, setReceived]   = useState("");

  const filtered   = cat === "Todos" ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat);
  const cartItems  = Object.entries(cart).map(([id, qty]) => ({ ...PRODUCTS.find(p => p.id === Number(id)), qty }));
  const total      = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount  = Object.values(cart).reduce((s, v) => s + v, 0);
  const change     = Number(received) - total;

  const add = (p) => {
    if (p.stock === 0) return;
    setCart(c => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }));
  };
  const remove = (id) => setCart(c => {
    const n = { ...c };
    if (n[id] <= 1) delete n[id]; else n[id]--;
    return n;
  });
  const reset = () => { setCart({}); setReceived(""); setScreen("pos"); };

  const syncMap = {
    online:   { color: "#2ECC71", label: "Online",          dot: "●" },
    offline:  { color: "#E74C3C", label: "Offline",         dot: "●" },
    syncing:  { color: "#F1C40F", label: "Sincronizando...",dot: "◌" },
  };
  const sync = syncMap[syncStatus];

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
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        button { cursor: pointer; font-family: inherit; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      {/* Phone frame */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 390, height: 844,
          background: C.bg, borderRadius: 44, overflow: "hidden",
          boxShadow: "0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px #333, inset 0 0 0 1px #222",
          display: "flex", flexDirection: "column",
        }}>

          {/* Status bar */}
          <div style={{ height: 50, background: C.surface, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, color: C.primary, letterSpacing: 1 }}>
              🍗 POLLOS PORTEÑOS
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: sync.color }}>
              <span style={{ fontSize: 9 }}>{sync.dot}</span>
              <span style={{ fontFamily: "monospace" }}>{sync.label}</span>
            </div>
          </div>

          {/* Context badge */}
          <div style={{ padding: "6px 16px", background: C.primary + "15", borderBottom: `1px solid ${C.primary}22`, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: C.primary, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 1 }}>
              📍 {ASIGNACION.puesto} · {ASIGNACION.contexto.toUpperCase()} · {ASIGNACION.sesion}
            </span>
          </div>

          {/* ── POS SCREEN ── */}
          {screen === "pos" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Category tabs */}
              <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: C.surface, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                {["Todos", "Comida", "Bebida"].map(c => (
                  <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: cat === c ? C.primary : C.surfaceHigh, color: cat === c ? "#fff" : C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14 }}>
                    {c}
                  </button>
                ))}
              </div>

              {/* Product grid */}
              <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignContent: "start" }}>
                {filtered.map(p => {
                  const inCart = cart[p.id] || 0;
                  const isOut  = p.stock === 0;
                  const isLow  = p.stock > 0 && p.stock <= 3;
                  return (
                    <button key={p.id} onClick={() => add(p)} style={{
                      background: isOut ? "#1A1A1A" : inCart > 0 ? "#2A1608" : C.surfaceHigh,
                      border: `1px solid ${isOut ? C.border : isLow ? C.warning + "44" : inCart > 0 ? C.primary + "88" : C.border}`,
                      borderRadius: 12, padding: "14px 10px",
                      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5,
                      opacity: isOut ? 0.4 : 1, position: "relative", minHeight: 90,
                    }}>
                      {isLow && !isOut && (
                        <div style={{ position: "absolute", top: 7, right: 7, background: C.warning + "22", color: C.warning, fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 3 }}>⚠ {p.stock}</div>
                      )}
                      {isOut && (
                        <div style={{ position: "absolute", top: 7, right: 7, background: C.error + "22", color: C.error, fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 3 }}>AGOTADO</div>
                      )}
                      {inCart > 0 && (
                        <div style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>{inCart}</div>
                      )}
                      <span style={{ fontSize: 28 }}>{p.emoji}</span>
                      <div style={{ color: isOut ? C.textSub : C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>{p.name}</div>
                      <div style={{ color: inCart > 0 ? C.primary : C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17 }}>{fmt(p.price)}</div>
                    </button>
                  );
                })}
              </div>

              {/* Cart bar */}
              <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: "10px 14px", flexShrink: 0 }}>
                {cartItems.length > 0 && (
                  <div style={{ maxHeight: 120, overflowY: "auto", marginBottom: 10 }}>
                    {cartItems.map(item => (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button onClick={() => remove(item.id)} style={{ width: 22, height: 22, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 4, color: C.textSub, fontSize: 14 }}>−</button>
                          <span style={{ color: C.textSub, fontSize: 13, minWidth: 16, textAlign: "center" }}>{item.qty}</span>
                          <button onClick={() => add(item)} style={{ width: 22, height: 22, background: C.primary + "33", border: `1px solid ${C.primary}55`, borderRadius: 4, color: C.primary, fontSize: 14 }}>+</button>
                          <span style={{ color: C.text, fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif" }}>{item.emoji} {item.name}</span>
                        </div>
                        <span style={{ color: C.primary, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14 }}>{fmt(item.price * item.qty)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => cartItems.length > 0 && setScreen("payment")} style={{
                  width: "100%", padding: "14px",
                  background: cartItems.length > 0 ? C.primary : C.surfaceHigh, border: "none", borderRadius: 10,
                  color: cartItems.length > 0 ? "#fff" : C.textMuted,
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: 1,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: cartItems.length > 0 ? "pointer" : "not-allowed",
                }}>
                  <span>{cartItems.length > 0 ? `🛒 ${cartCount} ítem${cartCount !== 1 ? "s" : ""}` : "Seleccioná productos"}</span>
                  {cartItems.length > 0 && <span>{fmt(total)}</span>}
                </button>
              </div>
            </div>
          )}

          {/* ── PAYMENT SCREEN ── */}
          {screen === "payment" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 18, gap: 14, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => setScreen("pos")} style={{ width: 34, height: 34, background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, color: C.textSub, fontSize: 16 }}>←</button>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: C.text }}>COBRO</span>
              </div>

              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 2, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>TOTAL A COBRAR</div>
                <div style={{ color: C.primary, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 46 }}>{fmt(total)}</div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {["Efectivo", "SINPE", "Tarjeta"].map(m => (
                  <button key={m} onClick={() => setPayMethod(m)} style={{ flex: 1, padding: "10px 4px", background: payMethod === m ? C.primary : C.surfaceHigh, border: `1px solid ${payMethod === m ? C.primary : C.border}`, borderRadius: 8, color: payMethod === m ? "#fff" : C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13 }}>{m}</button>
                ))}
              </div>

              {payMethod === "Efectivo" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 12, color: C.textSub, letterSpacing: 1, fontFamily: "'Barlow Condensed', sans-serif" }}>MONTO RECIBIDO</div>
                  <input type="number" placeholder="₡0" value={received} onChange={e => setReceived(e.target.value)}
                    style={{ width: "100%", padding: "14px 16px", background: C.surfaceHigh, border: `1px solid ${received && Number(received) >= total ? C.success : C.border}`, borderRadius: 10, color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 32, outline: "none" }} />
                  {received && Number(received) >= total && (
                    <div style={{ background: C.successDim, border: `1px solid ${C.success}44`, borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: C.success, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15 }}>💵 DEVOLVER</span>
                      <span style={{ color: C.success, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24 }}>{fmt(change)}</span>
                    </div>
                  )}
                  {received && Number(received) < total && (
                    <div style={{ color: C.error, fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif" }}>⚠ Faltan {fmt(total - Number(received))}</div>
                  )}
                </div>
              )}

              {payMethod === "SINPE" && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>SINPE MÓVIL — NÚMERO DESTINO</div>
                  <div style={{ color: C.primary, fontFamily: "monospace", fontWeight: 800, fontSize: 32, letterSpacing: 4, marginBottom: 10 }}>8888-8888</div>
                  <div style={{ color: C.textSub, fontSize: 13 }}>Pedile al cliente que transfiera {fmt(total)}</div>
                </div>
              )}

              {payMethod === "Tarjeta" && (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, textAlign: "center" }}>
                  <div style={{ fontSize: 38, marginBottom: 10 }}>💳</div>
                  <div style={{ color: C.text, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16 }}>Pasá la tarjeta por el datafono</div>
                  <div style={{ color: C.textSub, fontSize: 13, marginTop: 6 }}>Monto: <span style={{ color: C.primary, fontWeight: 700 }}>{fmt(total)}</span></div>
                </div>
              )}

              <button
                onClick={() => (payMethod !== "Efectivo" || (received && Number(received) >= total)) && setScreen("success")}
                style={{
                  width: "100%", padding: 16,
                  background: (payMethod !== "Efectivo" || (received && Number(received) >= total)) ? C.primary : C.surfaceHigh,
                  border: "none", borderRadius: 10, color: "#fff",
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: 1,
                  cursor: (payMethod !== "Efectivo" || (received && Number(received) >= total)) ? "pointer" : "not-allowed",
                  marginTop: "auto",
                }}>
                ✓ CONFIRMAR {payMethod.toUpperCase()}
              </button>
            </div>
          )}

          {/* ── SUCCESS SCREEN ── */}
          {screen === "success" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.successDim, border: `2px solid ${C.success}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>✓</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: C.success, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: 1 }}>VENTA REGISTRADA</div>
                <div style={{ color: C.textSub, fontSize: 14, marginTop: 6 }}>{payMethod} · {fmt(total)}</div>
              </div>
              {payMethod === "Efectivo" && change >= 0 && (
                <div style={{ background: C.successDim, border: `1px solid ${C.success}44`, borderRadius: 12, padding: "14px 24px", textAlign: "center" }}>
                  <div style={{ color: C.textSub, fontSize: 12, marginBottom: 2 }}>DEVOLVER AL CLIENTE</div>
                  <div style={{ color: C.success, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 34 }}>{fmt(change)}</div>
                </div>
              )}
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>
                asignacionId: {ASIGNACION.id} · 🔄 sync
              </div>
              <button onClick={reset} style={{ width: "100%", padding: 16, background: C.primary, border: "none", borderRadius: 10, color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: 1 }}>
                ← NUEVA VENTA
              </button>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: "#444", letterSpacing: 2, fontFamily: "monospace" }}>
          WIREFRAME · JCA-206 · POS WEB CAJERO (React PWA)
        </div>
      </div>
    </div>
  );
}
