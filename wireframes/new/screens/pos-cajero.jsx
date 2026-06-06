/* POS Cajero — mobile, cobro rápido */

const POSCajero = ({ onExit, onNav }) => {
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [syncState, setSyncState] = useState("online");
  const [payOpen, setPayOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const categories = [{ categoryId: "all", name: "Todo", icon: "grid" }, ...CATEGORIES];

  const filtered = PRODUCTS.filter(p => p.isActive)
    .filter(p => category === "all" || p.categoryId === category)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const addToCart = (p) => {
    setCart(c => {
      const existing = c.find(i => i.id === p.id);
      if (existing) return c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { id: p.id, name: p.name, price: p.price, emoji: p.emoji, qty: 1 }];
    });
    setToast(p.name);
    setTimeout(() => setToast(null), 1200);
  };
  const updateQty = (id, delta) => setCart(c => c.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  const removeItem = (id) => setCart(c => c.filter(i => i.id !== id));
  const clearCart = () => setCart([]);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div data-screen-label="POS Cajero" style={{ maxWidth: 440, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", background: "hsl(var(--background))", position: "relative" }}>
      {/* Top bar */}
      <div className="nav-bar" style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onExit} aria-label="Volver"><Icon name="arrowLeft" size={18} /></button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div className="t-label" style={{ fontSize: 10 }}>{ASIGNACION.puestoName} · {SESION_ACTIVA.name}</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Carlos M. · Cajero</div>
        </div>
        <SyncPill state={syncState} />
      </div>

      {/* Search + categories */}
      <div style={{ padding: "14px 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ position: "relative" }}>
          <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-foreground))" }} />
          <input className="input" style={{ paddingLeft: 38 }} placeholder="Buscar producto…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, margin: "0 -16px", padding: "0 16px 4px" }}>
          {categories.map(c => (
            <button key={c.categoryId} onClick={() => setCategory(c.categoryId)}
              className={category === c.categoryId ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm"}
              style={{ flexShrink: 0 }}>
              <Icon name={c.icon || "grid"} size={14} /> {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div style={{ flex: 1, padding: "8px 16px 120px", overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {filtered.map(p => {
            const lowStock = p.trackInventory && p.stockQuantity <= p.lowStockThreshold;
            return (
              <button key={p.id} onClick={() => addToCart(p)} className="card card-hover"
                style={{ padding: 0, textAlign: "left", display: "flex", flexDirection: "column", cursor: "pointer", font: "inherit" }}>
                <div className="product-image-placeholder" style={{ fontSize: 42, borderRadius: "calc(var(--radius) + 4px) calc(var(--radius) + 4px) 0 0", aspectRatio: "16/10" }}>
                  <span>{p.emoji}</span>
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 2 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.25 }}>{p.name}</div>
                    {lowStock && <Badge variant="warning" style={{ flexShrink: 0, fontSize: 9, padding: "1px 6px" }}>{p.stockQuantity}</Badge>}
                  </div>
                  <div className="t-stat" style={{ fontSize: 20, color: "hsl(var(--primary))", marginTop: 4 }}>{fmt(p.price)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart bar (bottom sheet trigger) */}
      {cart.length > 0 && (
        <div className="fade-up" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "hsl(var(--background) / 0.9)", backdropFilter: "blur(12px)", borderTop: "1px solid hsl(var(--border))", padding: "12px 16px 20px" }}>
          <div style={{ maxWidth: 440, margin: "0 auto" }}>
            <button onClick={() => setPayOpen(true)} className="btn btn-primary btn-xl" style={{ width: "100%", justifyContent: "space-between", height: 56, padding: "0 18px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: "rgba(255,255,255,0.22)", width: 28, height: 28, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{count}</span>
                Ver orden
              </span>
              <span className="t-stat" style={{ fontSize: 22, color: "white" }}>{fmt(total)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart sheet */}
      {payOpen && <CartSheet cart={cart} updateQty={updateQty} removeItem={removeItem} total={total} onClose={() => setPayOpen(false)} onComplete={() => { clearCart(); setPayOpen(false); setToast("Venta registrada"); setTimeout(() => setToast(null), 1500); }} syncState={syncState} />}

      {toast && (
        <div className="fade-in" style={{ position: "fixed", bottom: cart.length ? 100 : 24, left: 16, right: 16, maxWidth: 408, margin: "0 auto", zIndex: 50, background: "hsl(var(--foreground))", color: "hsl(var(--background))", padding: "12px 16px", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}>
          <Icon name="checkCircle" size={18} style={{ color: "hsl(var(--success))" }} /> <span style={{ fontSize: 14, fontWeight: 500 }}>{toast}</span>
        </div>
      )}
    </div>
  );
};

const CartSheet = ({ cart, updateQty, removeItem, total, onClose, onComplete, syncState }) => {
  const [step, setStep] = useState("cart"); // cart | pay | done
  const [method, setMethod] = useState("cash");
  const [cashGiven, setCashGiven] = useState("");
  const [splits, setSplits] = useState([]); // for split pay

  const given = Number(cashGiven) || 0;
  const change = Math.max(0, given - total);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", animation: "fadeIn .2s" }}></div>
      <div className="slide-right" style={{ position: "relative", background: "hsl(var(--card))", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "90vh", display: "flex", flexDirection: "column", animation: "fadeUp .3s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "hsl(var(--muted))", margin: "10px auto 4px" }}></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid hsl(var(--border))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 className="t-h3">{step === "cart" ? "Orden actual" : step === "pay" ? "Cobrar" : "Venta completada"}</h3>
            {step === "pay" && <Badge variant="primary-soft">{fmt(total)}</Badge>}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Cerrar"><Icon name="close" size={18} /></button>
        </div>

        {step === "cart" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
              {cart.map(i => (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid hsl(var(--border))" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{i.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{i.name}</div>
                    <div className="t-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{fmt(i.price)} c/u</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, background: "hsl(var(--muted))", borderRadius: 20, padding: 2 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => updateQty(i.id, -1)} style={{ width: 30, height: 30 }}><Icon name="minus" size={14} /></button>
                    <span style={{ fontSize: 14, fontWeight: 700, minWidth: 22, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{i.qty}</span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => updateQty(i.id, 1)} style={{ width: 30, height: 30 }}><Icon name="plus" size={14} /></button>
                  </div>
                  <div className="t-num" style={{ width: 72, textAlign: "right", fontSize: 14, fontWeight: 700 }}>{fmt(i.price * i.qty)}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 20px 20px", borderTop: "1px solid hsl(var(--border))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <div className="t-label">Total a cobrar</div>
                <div className="t-stat-xl" style={{ fontSize: 34 }}>{fmt(total)}</div>
              </div>
              <Button variant="primary" size="xl" onClick={() => setStep("pay")} style={{ width: "100%" }}>Cobrar {fmt(total)}</Button>
            </div>
          </>
        )}

        {step === "pay" && (
          <div style={{ padding: "20px", overflowY: "auto" }}>
            <div className="t-label" style={{ marginBottom: 10 }}>Método de pago</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
              {[
                { id: "cash", icon: "cash", label: "Efectivo" },
                { id: "card", icon: "card", label: "Tarjeta" },
                { id: "sinpe", icon: "smartphone", label: "SINPE" },
              ].map(m => (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className={method === m.id ? "card card-primary" : "card"}
                  style={{ padding: "14px 10px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, border: method === m.id ? "2px solid hsl(var(--primary))" : "1px solid hsl(var(--border))", background: method === m.id ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))", cursor: "pointer" }}>
                  <Icon name={m.icon} size={22} style={{ color: method === m.id ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</span>
                </button>
              ))}
            </div>

            {method === "cash" && (
              <div style={{ marginBottom: 20 }}>
                <label className="label">Efectivo recibido</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-foreground))", fontWeight: 600 }}>₡</span>
                  <input className="input input-lg" type="number" style={{ paddingLeft: 30, fontSize: 20, fontWeight: 700, fontFamily: "var(--font-display)" }} value={cashGiven} onChange={e => setCashGiven(e.target.value)} placeholder="0" />
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {[1000, 2000, 5000, 10000, 20000].map(v => (
                    <button key={v} onClick={() => setCashGiven(String(v))} className="btn btn-outline btn-xs" style={{ flex: 1 }}>{v/1000}k</button>
                  ))}
                </div>
                {given > 0 && (
                  <Card style={{ marginTop: 14, padding: 14, background: "hsl(var(--muted) / 0.5)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                      <span style={{ color: "hsl(var(--muted-foreground))" }}>Recibido</span>
                      <span className="t-num" style={{ fontWeight: 700 }}>{fmt(given)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                      <span style={{ color: "hsl(var(--muted-foreground))" }}>Total</span>
                      <span className="t-num" style={{ fontWeight: 700 }}>−{fmt(total)}</span>
                    </div>
                    <div className="separator" style={{ margin: "8px 0" }}></div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="t-label" style={{ color: "hsl(var(--success))" }}>Vuelto</span>
                      <span className="t-stat" style={{ color: "hsl(var(--success))" }}>{fmt(change)}</span>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {method === "card" && (
              <Card style={{ padding: 20, marginBottom: 20, textAlign: "center", background: "hsl(var(--muted) / 0.4)" }}>
                <div className="icon-pill icon-pill-lg" style={{ margin: "0 auto 10px", background: "hsl(var(--info) / 0.15)", color: "hsl(var(--info))", width: 56, height: 56 }}>
                  <Icon name="card" size={24} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Pasar tarjeta en el POS</div>
                <div className="t-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Monto a cobrar: {fmt(total)}</div>
              </Card>
            )}

            {method === "sinpe" && (
              <Card style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div className="icon-pill" style={{ background: "hsl(var(--success) / 0.12)", color: "hsl(var(--success))" }}><Icon name="smartphone" size={18} /></div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>SINPE móvil</div>
                    <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Al 8888-1234 · Pollos Porteños S.A.</div>
                  </div>
                </div>
                <label className="label">Últimos 4 dígitos del SMS</label>
                <input className="input input-lg" placeholder="0000" maxLength={4} />
              </Card>
            )}

            <Button variant="primary" size="xl" onClick={() => setStep("done")} style={{ width: "100%" }} disabled={method === "cash" && given < total}>
              <Icon name="check" size={18} /> Confirmar cobro {fmt(total)}
            </Button>
            <button onClick={() => setStep("cart")} className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 8 }}>Volver a la orden</button>
          </div>
        )}

        {step === "done" && (
          <div style={{ padding: "32px 20px 28px", textAlign: "center" }}>
            <div className="icon-pill icon-pill-lg" style={{ margin: "0 auto 18px", background: "hsl(var(--success) / 0.15)", color: "hsl(var(--success))", width: 72, height: 72 }}>
              <Icon name="check" size={32} strokeWidth={3} />
            </div>
            <h3 className="t-h2" style={{ marginBottom: 6 }}>¡Venta registrada!</h3>
            <div className="t-body" style={{ color: "hsl(var(--muted-foreground))", marginBottom: 18 }}>
              Orden #012 · {fmt(total)} en {method === "cash" ? "efectivo" : method === "card" ? "tarjeta" : "SINPE"}
            </div>
            {method === "cash" && given > total && (
              <Card style={{ padding: 14, marginBottom: 20, background: "hsl(var(--success) / 0.08)", borderColor: "hsl(var(--success) / 0.3)" }}>
                <div className="t-label" style={{ color: "hsl(var(--success))" }}>Entregar vuelto</div>
                <div className="t-stat-xl" style={{ color: "hsl(var(--success))" }}>{fmt(given - total)}</div>
              </Card>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Button variant="outline" icon="print">Imprimir</Button>
              <Button variant="primary" onClick={onComplete}>Nueva venta</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { POSCajero });
