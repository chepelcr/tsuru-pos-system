import { useState } from "react";

const COLORS = {
  primary: "#E8620A",
  primaryDark: "#C4500A",
  bg: "#111111",
  surface: "#1C1C1C",
  surfaceHigh: "#252525",
  border: "#2E2E2E",
  textPrimary: "#FFFFFF",
  textSecondary: "#888888",
  success: "#2ECC71",
  warning: "#F1C40F",
  error: "#E74C3C",
};

const PRODUCTS = [
  { id: 1, name: "Hamburguesa", price: 2500, cat: "Comida", emoji: "🍔", stock: 12 },
  { id: 2, name: "Empanada", price: 1200, cat: "Comida", emoji: "🥟", stock: 20 },
  { id: 3, name: "Platanitos", price: 800, cat: "Comida", emoji: "🍟", stock: 3 },
  { id: 4, name: "Cantón", price: 1800, cat: "Comida", emoji: "🌮", stock: 8 },
  { id: 5, name: "Coca Cola", price: 1000, cat: "Bebida", emoji: "🥤", stock: 15 },
  { id: 6, name: "Fanta Colita", price: 1000, cat: "Bebida", emoji: "🧃", stock: 10 },
  { id: 7, name: "Agua", price: 600, cat: "Bebida", emoji: "💧", stock: 0 },
  { id: 8, name: "Fresco Natural", price: 900, cat: "Bebida", emoji: "🍹", stock: 6 },
];

const PAYMENT_METHODS = ["Efectivo", "SINPE", "Tarjeta"];

function formatCRC(n) {
  return "₡" + n.toLocaleString("es-CR");
}

export default function POSCajero() {
  const [cat, setCat] = useState("Todos");
  const [cart, setCart] = useState({});
  const [screen, setScreen] = useState("pos"); // pos | payment | success
  const [payMethod, setPayMethod] = useState("Efectivo");
  const [received, setReceived] = useState("");
  const [syncStatus, setSyncStatus] = useState("online"); // online | offline | syncing

  const filtered = cat === "Todos" ? PRODUCTS : PRODUCTS.filter((p) => p.cat === cat);

  const addToCart = (p) => {
    if (p.stock === 0) return;
    setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }));
  };

  const removeFromCart = (id) => {
    setCart((c) => {
      const next = { ...c };
      if (next[id] <= 1) delete next[id];
      else next[id]--;
      return next;
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => ({
    ...PRODUCTS.find((p) => p.id === Number(id)),
    qty,
  }));

  const total = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = Object.values(cart).reduce((s, v) => s + v, 0);
  const change = Number(received) - total;

  const handleConfirm = () => {
    setSyncStatus("syncing");
    setTimeout(() => {
      setSyncStatus("online");
      setScreen("success");
    }, 1200);
  };

  const resetAll = () => {
    setCart({});
    setReceived("");
    setPayMethod("Efectivo");
    setScreen("pos");
  };

  const SyncBadge = () => {
    const map = {
      online: { color: COLORS.success, label: "Online", dot: "●" },
      offline: { color: COLORS.error, label: "Offline", dot: "●" },
      syncing: { color: COLORS.warning, label: "Sincronizando...", dot: "◌" },
    };
    const s = map[syncStatus];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: s.color }}>
        <span style={{ fontSize: 9 }}>{s.dot}</span>
        <span style={{ fontFamily: "monospace" }}>{s.label}</span>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0A",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
      padding: 24,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800&family=Barlow:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1C1C1C; }
        ::-webkit-scrollbar-thumb { background: #E8620A44; border-radius: 2px; }
        .prod-btn { transition: all 0.1s; cursor: pointer; user-select: none; }
        .prod-btn:active { transform: scale(0.96); }
        .cat-tab { transition: all 0.15s; cursor: pointer; }
        .action-btn { transition: all 0.12s; cursor: pointer; }
        .action-btn:hover { opacity: 0.9; }
        .action-btn:active { transform: scale(0.97); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.25s ease forwards; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .pulse { animation: pulse 1s infinite; }
      `}</style>

      {/* Phone frame */}
      <div style={{
        width: 390,
        height: 844,
        background: COLORS.bg,
        borderRadius: 44,
        overflow: "hidden",
        boxShadow: "0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px #333, inset 0 0 0 1px #222",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}>

        {/* Status bar */}
        <div style={{
          height: 50,
          background: COLORS.surface,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 16,
              color: COLORS.primary,
              letterSpacing: 1,
            }}>🍗 PUESTO 1</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SyncBadge />
            <div style={{
              fontSize: 12,
              color: COLORS.textSecondary,
              fontFamily: "monospace",
            }}>
              {new Date().toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>

        {/* === POS SCREEN === */}
        {screen === "pos" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Category tabs */}
            <div style={{
              display: "flex",
              gap: 8,
              padding: "10px 16px",
              background: COLORS.surface,
              borderBottom: `1px solid ${COLORS.border}`,
              flexShrink: 0,
            }}>
              {["Todos", "Comida", "Bebida"].map((c) => (
                <button
                  key={c}
                  className="cat-tab"
                  onClick={() => setCat(c)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 6,
                    border: "none",
                    background: cat === c ? COLORS.primary : COLORS.surfaceHigh,
                    color: cat === c ? "#fff" : COLORS.textSecondary,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: 0.5,
                    cursor: "pointer",
                  }}
                >
                  {c === "Comida" ? "🍟 " : c === "Bebida" ? "🥤 " : ""}{c}
                </button>
              ))}
            </div>

            {/* Product grid */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              alignContent: "start",
            }}>
              {filtered.map((p) => {
                const inCart = cart[p.id] || 0;
                const isOut = p.stock === 0;
                const isLow = p.stock > 0 && p.stock <= 3;
                return (
                  <button
                    key={p.id}
                    className="prod-btn"
                    onClick={() => addToCart(p)}
                    style={{
                      background: isOut ? "#1A1A1A" : inCart > 0 ? "#2A1608" : COLORS.surfaceHigh,
                      border: isOut
                        ? `1px solid ${COLORS.border}`
                        : isLow
                        ? `1px solid ${COLORS.warning}44`
                        : inCart > 0
                        ? `1px solid ${COLORS.primary}88`
                        : `1px solid ${COLORS.border}`,
                      borderRadius: 12,
                      padding: "14px 12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 6,
                      cursor: isOut ? "not-allowed" : "pointer",
                      opacity: isOut ? 0.45 : 1,
                      position: "relative",
                      minHeight: 90,
                    }}
                  >
                    {/* Stock badge */}
                    {isLow && !isOut && (
                      <div style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: COLORS.warning + "22",
                        color: COLORS.warning,
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 5px",
                        borderRadius: 4,
                        fontFamily: "monospace",
                      }}>⚠ {p.stock}</div>
                    )}
                    {isOut && (
                      <div style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: COLORS.error + "22",
                        color: COLORS.error,
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "2px 5px",
                        borderRadius: 4,
                      }}>AGOTADO</div>
                    )}
                    {/* Cart count badge */}
                    {inCart > 0 && (
                      <div style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 22,
                        height: 22,
                        background: COLORS.primary,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#fff",
                        fontFamily: "'Barlow Condensed', sans-serif",
                      }}>{inCart}</div>
                    )}
                    <span style={{ fontSize: 28 }}>{p.emoji}</span>
                    <div>
                      <div style={{
                        color: isOut ? COLORS.textSecondary : COLORS.textPrimary,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700,
                        fontSize: 15,
                        lineHeight: 1.1,
                      }}>{p.name}</div>
                      <div style={{
                        color: inCart > 0 ? COLORS.primary : COLORS.textSecondary,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 800,
                        fontSize: 17,
                        marginTop: 3,
                      }}>{formatCRC(p.price)}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Cart bar */}
            <div style={{
              background: COLORS.surface,
              borderTop: `1px solid ${COLORS.border}`,
              padding: "10px 16px",
              flexShrink: 0,
            }}>
              {/* Cart items */}
              {cartItems.length > 0 && (
                <div style={{
                  maxHeight: 120,
                  overflowY: "auto",
                  marginBottom: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}>
                  {cartItems.map((item) => (
                    <div key={item.id} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => removeFromCart(item.id)} style={{
                          width: 22, height: 22,
                          background: COLORS.surfaceHigh,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 4,
                          color: COLORS.textSecondary,
                          fontSize: 14,
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>−</button>
                        <span style={{
                          color: COLORS.textSecondary,
                          fontSize: 13,
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 600,
                          minWidth: 16, textAlign: "center",
                        }}>{item.qty}</span>
                        <button onClick={() => addToCart(item)} style={{
                          width: 22, height: 22,
                          background: COLORS.primary + "33",
                          border: `1px solid ${COLORS.primary}55`,
                          borderRadius: 4,
                          color: COLORS.primary,
                          fontSize: 14,
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>+</button>
                        <span style={{
                          color: COLORS.textPrimary,
                          fontSize: 13,
                          fontFamily: "'Barlow Condensed', sans-serif",
                        }}>{item.emoji} {item.name}</span>
                      </div>
                      <span style={{
                        color: COLORS.primary,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700,
                        fontSize: 14,
                      }}>{formatCRC(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Cobrar button */}
              <button
                className="action-btn"
                onClick={() => cartItems.length > 0 && setScreen("payment")}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: cartItems.length > 0 ? COLORS.primary : COLORS.surfaceHigh,
                  border: "none",
                  borderRadius: 10,
                  color: cartItems.length > 0 ? "#fff" : COLORS.textSecondary,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: 20,
                  letterSpacing: 1,
                  cursor: cartItems.length > 0 ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  {cartItems.length > 0 ? `🛒 ${cartCount} ítem${cartCount > 1 ? "s" : ""}` : "Seleccioná productos"}
                </span>
                {cartItems.length > 0 && (
                  <span style={{ fontSize: 22 }}>{formatCRC(total)}</span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* === PAYMENT SCREEN === */}
        {screen === "payment" && (
          <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 16, overflowY: "auto" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setScreen("pos")} style={{
                background: COLORS.surfaceHigh, border: `1px solid ${COLORS.border}`,
                borderRadius: 8, color: COLORS.textSecondary, fontSize: 18,
                width: 36, height: 36, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>←</button>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800, fontSize: 22, color: COLORS.textPrimary, letterSpacing: 1,
              }}>COBRO</span>
            </div>

            {/* Total grande */}
            <div style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 12,
              padding: 20,
              textAlign: "center",
            }}>
              <div style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 4 }}>TOTAL A COBRAR</div>
              <div style={{
                color: COLORS.primary,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: 48,
                letterSpacing: 1,
              }}>{formatCRC(total)}</div>
            </div>

            {/* Método de pago */}
            <div>
              <div style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8, letterSpacing: 1 }}>MÉTODO DE PAGO</div>
              <div style={{ display: "flex", gap: 8 }}>
                {PAYMENT_METHODS.map((m) => (
                  <button key={m} onClick={() => setPayMethod(m)} style={{
                    flex: 1, padding: "10px 6px",
                    background: payMethod === m ? COLORS.primary : COLORS.surfaceHigh,
                    border: `1px solid ${payMethod === m ? COLORS.primary : COLORS.border}`,
                    borderRadius: 8,
                    color: payMethod === m ? "#fff" : COLORS.textSecondary,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>{m}</button>
                ))}
              </div>
            </div>

            {/* Flujo Efectivo */}
            {payMethod === "Efectivo" && (
              <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1 }}>MONTO RECIBIDO</div>
                <input
                  type="number"
                  placeholder="₡0"
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  style={{
                    background: COLORS.surfaceHigh,
                    border: `1px solid ${received && Number(received) >= total ? COLORS.success : COLORS.border}`,
                    borderRadius: 10,
                    color: COLORS.textPrimary,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 800,
                    fontSize: 32,
                    padding: "14px 16px",
                    outline: "none",
                    width: "100%",
                  }}
                />
                {received && Number(received) >= total && (
                  <div style={{
                    background: COLORS.success + "15",
                    border: `1px solid ${COLORS.success}44`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <span style={{ color: COLORS.success, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16 }}>💵 DEVOLVER</span>
                    <span style={{ color: COLORS.success, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24 }}>{formatCRC(change)}</span>
                  </div>
                )}
                {received && Number(received) < total && (
                  <div style={{ color: COLORS.error, fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif" }}>
                    ⚠ Monto insuficiente — faltan {formatCRC(total - Number(received))}
                  </div>
                )}
              </div>
            )}

            {/* Flujo SINPE */}
            {payMethod === "SINPE" && (
              <div className="fade-in" style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12, padding: 20, textAlign: "center",
              }}>
                <div style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>SINPE MÓVIL — NÚMERO DESTINO</div>
                <div style={{
                  color: COLORS.primary,
                  fontFamily: "monospace",
                  fontWeight: 800,
                  fontSize: 32,
                  letterSpacing: 4,
                  marginBottom: 12,
                }}>8888-8888</div>
                <div style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Pedile al cliente que transfiera {formatCRC(total)} y confirmá cuando lo veas
                </div>
              </div>
            )}

            {/* Flujo Tarjeta */}
            {payMethod === "Tarjeta" && (
              <div className="fade-in" style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12, padding: 20, textAlign: "center",
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
                <div style={{ color: COLORS.textPrimary, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                  Pasá la tarjeta por el datafono
                </div>
                <div style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Monto a cobrar: <span style={{ color: COLORS.primary, fontWeight: 700 }}>{formatCRC(total)}</span>
                </div>
              </div>
            )}

            {/* Resumen orden */}
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12 }}>
              {cartItems.map((item) => (
                <div key={item.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "4px 0",
                  borderBottom: `1px solid ${COLORS.border}`,
                }}>
                  <span style={{ color: COLORS.textSecondary, fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {item.qty}× {item.name}
                  </span>
                  <span style={{ color: COLORS.textPrimary, fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                    {formatCRC(item.price * item.qty)}
                  </span>
                </div>
              ))}
            </div>

            {/* Confirmar */}
            <button
              className="action-btn"
              onClick={handleConfirm}
              disabled={payMethod === "Efectivo" && (!received || Number(received) < total)}
              style={{
                width: "100%", padding: 16,
                background: (payMethod !== "Efectivo" || (received && Number(received) >= total)) ? COLORS.primary : COLORS.surfaceHigh,
                border: "none", borderRadius: 10,
                color: (payMethod !== "Efectivo" || (received && Number(received) >= total)) ? "#fff" : COLORS.textSecondary,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800, fontSize: 20, letterSpacing: 1,
                cursor: (payMethod !== "Efectivo" || (received && Number(received) >= total)) ? "pointer" : "not-allowed",
                marginTop: "auto",
              }}
            >
              {syncStatus === "syncing"
                ? <span className="pulse">⏳ Registrando venta...</span>
                : `✓ CONFIRMAR ${payMethod.toUpperCase()}`
              }
            </button>
          </div>
        )}

        {/* === SUCCESS SCREEN === */}
        {screen === "success" && (
          <div className="fade-in" style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", padding: 32, gap: 20,
          }}>
            <div style={{
              width: 80, height: 80,
              background: COLORS.success + "22",
              border: `2px solid ${COLORS.success}`,
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36,
            }}>✓</div>
            <div style={{
              textAlign: "center",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              <div style={{ color: COLORS.success, fontWeight: 800, fontSize: 28, letterSpacing: 1 }}>
                VENTA REGISTRADA
              </div>
              <div style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 6 }}>
                {payMethod} · {formatCRC(total)}
              </div>
              {payMethod === "Efectivo" && change >= 0 && (
                <div style={{
                  marginTop: 16,
                  background: COLORS.success + "15",
                  border: `1px solid ${COLORS.success}44`,
                  borderRadius: 10, padding: "12px 20px",
                }}>
                  <div style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 2 }}>DEVOLVER AL CLIENTE</div>
                  <div style={{ color: COLORS.success, fontWeight: 800, fontSize: 32 }}>{formatCRC(change)}</div>
                </div>
              )}
            </div>
            <div style={{ color: COLORS.textSecondary, fontSize: 12, fontFamily: "monospace" }}>
              🔄 Sincronizado con servidor
            </div>
            <button
              className="action-btn"
              onClick={resetAll}
              style={{
                width: "100%", padding: 16,
                background: COLORS.primary, border: "none", borderRadius: 10,
                color: "#fff",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800, fontSize: 20, letterSpacing: 1, cursor: "pointer",
                marginTop: 12,
              }}
            >
              ← NUEVA VENTA
            </button>
          </div>
        )}
      </div>

      {/* Label */}
      <div style={{
        position: "fixed", bottom: 24, left: 0, right: 0,
        textAlign: "center",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 13,
        color: "#444",
        letterSpacing: 2,
      }}>
        WIREFRAME · JCA-163 · POLLOS PORTEÑOS POS · CAJERO
      </div>
    </div>
  );
}
