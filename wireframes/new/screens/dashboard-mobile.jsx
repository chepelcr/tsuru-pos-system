/* Dashboard móvil — gerente, resumen compacto */

const DashboardMobile = ({ onExit }) => {
  const [tab, setTab] = useState("resumen");
  return (
    <div data-screen-label="Panel gerente mobile" style={{ maxWidth: 440, margin: "0 auto", minHeight: "100vh", background: "hsl(var(--background))" }}>
      <header className="nav-bar" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onExit}><Icon name="arrowLeft" size={18} /></button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div className="t-label" style={{ fontSize: 10 }}>Panel gerente</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{SESION_ACTIVA.name}</div>
        </div>
        <Badge variant="success" style={{ gap: 4 }}><span className="status-dot status-dot-live" style={{ width: 5, height: 5 }}></span>Live</Badge>
      </header>

      <div style={{ padding: "14px 16px 100px" }}>
        {/* Hero stat */}
        <Card style={{ padding: 18, marginBottom: 14, background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.02))", borderColor: "hsl(var(--primary) / 0.3)", position: "relative", overflow: "hidden" }}>
          <div className="t-label" style={{ color: "hsl(var(--primary))", marginBottom: 6 }}>Ventas del partido</div>
          <div className="t-stat-xl" style={{ fontSize: 42, color: "hsl(var(--primary))" }}>{fmt(487500)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <Badge variant="success">↗ +22%</Badge>
            <span className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>vs último vs Alajuelense</span>
          </div>
        </Card>

        {/* Mini KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { l: "Órdenes", v: "142", icon: "cart", c: "info" },
            { l: "Ticket", v: fmt(3431), icon: "dollar", c: "success" },
            { l: "Puestos", v: "3/3", icon: "store", c: "primary" },
            { l: "Cajeros", v: "4", icon: "users", c: "warning" },
          ].map(k => (
            <Card key={k.l} style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div className="t-label">{k.l}</div>
                <div className={`icon-pill ${k.c === "primary" ? "" : `icon-pill-${k.c}`}`} style={{ width: 26, height: 26 }}><Icon name={k.icon} size={12} /></div>
              </div>
              <div className="t-stat" style={{ fontSize: 22 }}>{k.v}</div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ width: "100%", marginBottom: 14 }}>
          {[{ id: "resumen", l: "Resumen" }, { id: "puestos", l: "Puestos" }, { id: "top", l: "Top" }].map(t => (
            <button key={t.id} className="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} style={{ flex: 1, textAlign: "center" }}>{t.l}</button>
          ))}
        </div>

        {tab === "resumen" && (
          <Card style={{ padding: 16 }}>
            <CardTitle>Últimas 10 ventas</CardTitle>
            <CardDescription style={{ marginBottom: 12 }}>Feed en tiempo real</CardDescription>
            {[
              { p: "Puesto 1", items: "Hamburguesa × 2, Coca × 2", t: 7000, m: "cash", ago: 30 },
              { p: "Puesto 2", items: "Empanada × 3, Fanta × 1", t: 4600, m: "card", ago: 95 },
              { p: "Puesto 1", items: "Cantón × 1, Platanitos × 2", t: 3400, m: "sinpe", ago: 150 },
              { p: "Caja Rest.", items: "Hamburguesa × 1", t: 2500, m: "cash", ago: 220 },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 3 ? "1px solid hsl(var(--border))" : "none" }}>
                <div className={`icon-pill ${f.m === "cash" ? "icon-pill-success" : f.m === "card" ? "icon-pill-info" : ""}`} style={{ width: 30, height: 30 }}>
                  <Icon name={f.m === "cash" ? "cash" : f.m === "card" ? "card" : "smartphone"} size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{f.p}</div>
                  <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.items}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="t-num" style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)" }}>{fmt(f.t)}</div>
                  <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>hace {Math.floor(f.ago / 60)}m</div>
                </div>
              </div>
            ))}
          </Card>
        )}

        {tab === "puestos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { name: "Puesto 1", cajero: "Carlos M.", sales: 182500, orders: 48, state: "online" },
              { name: "Puesto 2", cajero: "María Q.", sales: 165000, orders: 42, state: "online" },
              { name: "Caja Restaurante", cajero: "Diego V.", sales: 140000, orders: 52, state: "syncing" },
            ].map(p => (
              <Card key={p.name} style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`status-dot status-dot-${p.state === "online" ? "success" : "warning"}`}></span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                      <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{p.cajero}</div>
                    </div>
                  </div>
                  <div className="t-num" style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-display)" }}>{fmt(p.sales)}</div>
                </div>
                <div className="progress progress-thin"><div className="progress-bar" style={{ width: `${(p.sales / 200000) * 100}%` }}></div></div>
                <div className="t-xs t-num" style={{ marginTop: 6, color: "hsl(var(--muted-foreground))" }}>{p.orders} órdenes · ticket {fmt(Math.round(p.sales / p.orders))}</div>
              </Card>
            ))}
          </div>
        )}

        {tab === "top" && (
          <Card style={{ padding: 14 }}>
            {[
              { p: PRODUCTS[1], qty: 42 }, { p: PRODUCTS[0], qty: 28 },
              { p: PRODUCTS[4], qty: 35 }, { p: PRODUCTS[3], qty: 18 },
              { p: PRODUCTS[2], qty: 12 },
            ].map((t, i) => (
              <div key={t.p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 4 ? "1px solid hsl(var(--border))" : "none" }}>
                <div className="t-stat" style={{ fontSize: 18, width: 24, color: "hsl(var(--muted-foreground))" }}>#{i + 1}</div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{t.p.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t.p.name}</div>
                  <div className="t-xs t-num" style={{ color: "hsl(var(--muted-foreground))" }}>{t.qty} unidades</div>
                </div>
                <div className="t-num" style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--primary))" }}>{fmt(t.qty * t.p.price)}</div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { DashboardMobile });
