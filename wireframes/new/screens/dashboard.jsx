/* Dashboard Gerente — desktop, vista en vivo */

const DashboardShell = ({ children, active = "dashboard", onNav }) => {
  const navItems = [
    { id: "dashboard", icon: "chart", label: "Panel" },
    { id: "config", icon: "settings", label: "Sesiones" },
    { id: "productos", icon: "package", label: "Productos" },
    { id: "reporte", icon: "trending", label: "Reportes" },
  ];
  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "240px 1fr" }}>
      <aside className="sidebar" style={{ position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column", padding: 16 }}>
        <div style={{ padding: "4px 8px 20px", borderBottom: "1px solid hsl(var(--sidebar-border))", marginBottom: 14 }}>
          <Logo />
        </div>
        <div className="t-label" style={{ padding: "8px 10px 6px" }}>Navegación</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(item => (
            <button key={item.id} className={`sidebar-item ${active === item.id ? "active" : ""}`} onClick={() => onNav && onNav(item.id)}>
              <Icon name={item.icon} size={16} /> {item.label}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }}></div>
        <div className="separator" style={{ margin: "12px 0" }}></div>
        <button className="sidebar-item"><Icon name="logOut" size={16} /> Salir</button>
      </aside>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <header className="nav-bar" style={{ padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Badge variant="success" style={{ gap: 6 }}><span className="status-dot status-dot-live" style={{ width: 6, height: 6 }}></span>En vivo</Badge>
            <div>
              <div className="t-label" style={{ fontSize: 10 }}>Sesión activa</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{SESION_ACTIVA.name} · {SESION_ACTIVA.sucursal}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button variant="outline" size="sm" icon="refresh">Sincronizar</Button>
            <Button variant="primary" size="sm" icon="sparkles">Configurar sesión</Button>
            <div className="separator-v" style={{ height: 24 }}></div>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: "hsl(var(--primary))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>LS</div>
          </div>
        </header>
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
};

const DashboardDesktop = ({ onExit, onNav }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 5000); return () => clearInterval(i); }, []);

  const ventas = 487500 + (tick % 5) * 2500;
  const ordenes = 142 + (tick % 5);

  const handleNav = (id) => {
    if (id === "dashboard") return;
    onNav && onNav(id);
  };

  const feed = [
    { id: 1, puesto: "Puesto 1", cajero: "Carlos M.", items: "Hamburguesa × 2, Coca × 2", total: 7000, method: "cash", time: Date.now() - 1000 * 30 },
    { id: 2, puesto: "Puesto 2", cajero: "María Q.", items: "Empanada × 3, Fanta × 1", total: 4600, method: "card", time: Date.now() - 1000 * 95 },
    { id: 3, puesto: "Puesto 1", cajero: "Carlos M.", items: "Cantón × 1, Platanitos × 2", total: 3400, method: "sinpe", time: Date.now() - 1000 * 150 },
    { id: 4, puesto: "Caja Rest.", cajero: "Diego V.", items: "Hamburguesa × 1, Fresco × 1", total: 3400, method: "cash", time: Date.now() - 1000 * 220 },
    { id: 5, puesto: "Puesto 2", cajero: "María Q.", items: "Empanada × 2, Coca × 1", total: 3400, method: "cash", time: Date.now() - 1000 * 290 },
  ];

  return (
    <div data-screen-label="Panel gerente">
      <DashboardShell active="dashboard" onNav={handleNav}>
        <div style={{ padding: "24px 24px 40px", maxWidth: 1500, margin: "0 auto" }}>
          {/* Welcome */}
          <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 className="t-h1" style={{ marginBottom: 6 }}>Buenas, Luis</h1>
              <p className="t-body" style={{ color: "hsl(var(--muted-foreground))" }}>El partido va por el minuto 68. 3 puestos activos, 4 cajeros en turno.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" icon="arrowLeft" onClick={onExit}>Hub</Button>
              <Button variant="outline" icon="download">Exportar</Button>
            </div>
          </div>

          {/* KPI grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Ventas del partido", value: fmt(ventas), icon: "dollar", color: "primary", delta: "+12% vs anterior" },
              { label: "Órdenes", value: fmtNum(ordenes), icon: "cart", color: "info", delta: "Promedio: ₡3,431" },
              { label: "Ticket promedio", value: fmt(Math.round(ventas / ordenes)), icon: "chart", color: "success", delta: "+₡320" },
              { label: "Puestos activos", value: "3/3", icon: "store", color: "warning", delta: "Todos sincronizados" },
            ].map(k => (
              <Card key={k.label} style={{ padding: 18 }} hoverable>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="t-label">{k.label}</div>
                  <div className={`icon-pill ${k.color === "primary" ? "" : `icon-pill-${k.color}`}`} style={{ width: 34, height: 34 }}>
                    <Icon name={k.icon} size={16} />
                  </div>
                </div>
                <div className="t-stat-xl" style={{ fontSize: 32, marginBottom: 4 }}>{k.value}</div>
                <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{k.delta}</div>
              </Card>
            ))}
          </div>

          {/* Main 2-col */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14, marginBottom: 20 }}>
            {/* Sales timeline */}
            <Card style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <CardTitle>Ventas por hora</CardTitle>
                  <CardDescription>Hoy · {SESION_ACTIVA.name}</CardDescription>
                </div>
                <div className="tabs">
                  <button className="tab" aria-selected="false">Hoy</button>
                  <button className="tab" aria-selected="true">Partido</button>
                  <button className="tab" aria-selected="false">Semana</button>
                </div>
              </div>
              <SalesChart />
            </Card>

            {/* Puestos list */}
            <Card style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <CardTitle>Puestos en vivo</CardTitle>
                  <CardDescription>Estado de cada caja</CardDescription>
                </div>
                <Badge variant="success">3 activos</Badge>
              </div>
              {[
                { name: "Puesto 1", loc: "Gradas sur", cajero: "Carlos M.", sales: 182500, orders: 48, state: "online" },
                { name: "Puesto 2", loc: "Palcos", cajero: "María Q.", sales: 165000, orders: 42, state: "online" },
                { name: "Caja Restaurante", loc: "Centro", cajero: "Diego V.", sales: 140000, orders: 52, state: "syncing" },
              ].map((p, i) => (
                <div key={i} style={{ padding: "14px 0", borderBottom: i < 2 ? "1px solid hsl(var(--border))" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className={`status-dot status-dot-${p.state === "online" ? "success" : "warning"}`}></span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                        <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{p.cajero} · {p.loc}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="t-num" style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)" }}>{fmt(p.sales)}</div>
                      <div className="t-xs t-num" style={{ color: "hsl(var(--muted-foreground))" }}>{p.orders} órdenes</div>
                    </div>
                  </div>
                  <div className="progress progress-thin">
                    <div className="progress-bar" style={{ width: `${(p.sales / 200000) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Bottom row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14 }}>
            {/* Top products */}
            <Card style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <CardTitle>Top productos</CardTitle>
                  <CardDescription>Más vendidos hoy</CardDescription>
                </div>
                <Button variant="ghost" size="xs" iconRight="arrowRight">Ver todos</Button>
              </div>
              {[
                { p: PRODUCTS[1], qty: 42, rev: 50400 },
                { p: PRODUCTS[0], qty: 28, rev: 70000 },
                { p: PRODUCTS[4], qty: 35, rev: 35000 },
                { p: PRODUCTS[3], qty: 18, rev: 32400 },
                { p: PRODUCTS[2], qty: 12, rev: 9600 },
              ].map((t, i) => {
                const max = 50;
                return (
                  <div key={t.p.id} style={{ padding: "12px 0", borderBottom: i < 4 ? "1px solid hsl(var(--border))" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{t.p.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{t.p.name}</div>
                        <div className="t-xs t-num" style={{ color: "hsl(var(--muted-foreground))" }}>{t.qty} unidades · {fmt(t.rev)}</div>
                      </div>
                      <div className="t-label" style={{ fontSize: 14, color: "hsl(var(--primary))", fontWeight: 800 }}>#{i + 1}</div>
                    </div>
                    <div className="progress progress-thin">
                      <div className="progress-bar" style={{ width: `${(t.qty / max) * 100}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* Live feed */}
            <Card style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <CardTitle>Feed de ventas</CardTitle>
                  <CardDescription>En tiempo real</CardDescription>
                </div>
                <Badge variant="primary-soft"><span className="status-dot status-dot-live" style={{ width: 6, height: 6 }}></span> Live</Badge>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {feed.map((f, i) => (
                  <div key={f.id} className="fade-up" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < feed.length - 1 ? "1px solid hsl(var(--border))" : "none" }}>
                    <div className={`icon-pill ${f.method === "cash" ? "icon-pill-success" : f.method === "card" ? "icon-pill-info" : ""}`} style={{ width: 34, height: 34 }}>
                      <Icon name={f.method === "cash" ? "cash" : f.method === "card" ? "card" : "smartphone"} size={15} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{f.puesto}</span>
                        <span className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>· {f.cajero}</span>
                      </div>
                      <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.items}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="t-num" style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)", color: "hsl(var(--primary))" }}>{fmt(f.total)}</div>
                      <div className="t-xs t-num" style={{ color: "hsl(var(--muted-foreground))" }}>{fmtAgo(f.time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </DashboardShell>
    </div>
  );
};

/* Mini area chart */
const SalesChart = () => {
  const data = [0, 4, 12, 25, 35, 48, 62, 75, 85, 92, 100, 95, 88, 76, 65];
  const max = 100;
  const w = 520, h = 200;
  const points = data.map((v, i) => [i / (data.length - 1) * w, h - (v / max) * h]);
  const pathLine = "M " + points.map(p => `${p[0]} ${p[1]}`).join(" L ");
  const pathArea = pathLine + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
        <div>
          <div className="t-stat-xl" style={{ fontSize: 38 }}>{fmt(487500)}</div>
          <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Pico entre 19:30 — 20:15</div>
        </div>
        <Badge variant="success">↗ +22% vs último partido</Badge>
      </div>
      <div style={{ width: "100%", overflow: "hidden", background: "hsl(var(--muted) / 0.3)", borderRadius: 8, padding: 12 }}>
        <svg viewBox={`0 0 ${w} ${h + 30}`} style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
              <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((t, i) => <line key={i} x1="0" x2={w} y1={t * h} y2={t * h} stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="2 3" />)}
          <path d={pathArea} fill="url(#ga)" />
          <path d={pathLine} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => i === points.length - 3 ? <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="2" /> : null)}
          {["18:00", "19:00", "20:00", "21:00"].map((lbl, i) => (
            <text key={lbl} x={(i / 3) * w} y={h + 20} fontSize="11" fill="hsl(var(--muted-foreground))" textAnchor={i === 0 ? "start" : i === 3 ? "end" : "middle"} fontFamily="var(--font-sans)">{lbl}</text>
          ))}
        </svg>
      </div>
    </div>
  );
};

Object.assign(window, { DashboardDesktop, DashboardShell });
