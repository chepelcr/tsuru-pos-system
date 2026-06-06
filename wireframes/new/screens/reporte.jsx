/* Reporte de partido — gerente desktop, cierre financiero */

const ReportePartido = ({ onExit, onNav }) => {
  const handleNav = (id) => { if (id !== "reporte") onNav && onNav(id); };

  const totals = { ventas: 487500, ordenes: 142, ticket: 3433, efectivo: 302250, tarjeta: 136500, sinpe: 48750 };
  const puestos = [
    { name: "Puesto 1", cajero: "Carlos M.", sales: 182500, orders: 48, diff: 0 },
    { name: "Puesto 2", cajero: "María Q.", sales: 165000, orders: 42, diff: -500 },
    { name: "Caja Rest.", cajero: "Diego V.", sales: 140000, orders: 52, diff: +1200 },
  ];
  const top = [
    { p: PRODUCTS[1], qty: 42, rev: 50400 },
    { p: PRODUCTS[0], qty: 28, rev: 70000 },
    { p: PRODUCTS[4], qty: 35, rev: 35000 },
    { p: PRODUCTS[3], qty: 18, rev: 32400 },
    { p: PRODUCTS[2], qty: 12, rev: 9600 },
    { p: PRODUCTS[5], qty: 24, rev: 24000 },
    { p: PRODUCTS[7], qty: 12, rev: 10800 },
  ];

  return (
    <div data-screen-label="Reporte partido">
      <DashboardShell active="reporte" onNav={handleNav}>
        <div style={{ padding: "24px 24px 40px", maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <Badge variant="primary-soft" style={{ marginBottom: 8 }}>Reporte final</Badge>
              <h1 className="t-h1" style={{ marginBottom: 6 }}>{SESION_ACTIVA.name}</h1>
              <p className="t-body" style={{ color: "hsl(var(--muted-foreground))" }}>Sábado 12 de abril · Estadio 'Lito' Pérez · 19:00 → 21:45</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" icon="arrowLeft" onClick={onExit}>Hub</Button>
              <Button variant="outline" icon="print">Imprimir</Button>
              <Button variant="primary" icon="download">Descargar PDF</Button>
            </div>
          </div>

          {/* Hero KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card style={{ padding: 22, background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.02))", borderColor: "hsl(var(--primary) / 0.3)" }}>
              <div className="t-label" style={{ color: "hsl(var(--primary))", marginBottom: 6 }}>Ingreso bruto</div>
              <div className="t-stat-xl" style={{ fontSize: 48, color: "hsl(var(--primary))" }}>{fmt(totals.ventas)}</div>
              <Badge variant="success" style={{ marginTop: 6 }}>↗ +22% vs último</Badge>
            </Card>
            {[
              { l: "Órdenes", v: fmtNum(totals.ordenes), i: "cart", c: "info", s: "promedio 52/hora" },
              { l: "Ticket promedio", v: fmt(totals.ticket), i: "dollar", c: "success", s: "+₡320 vs últ." },
              { l: "Diferencia caja", v: "+₡700", i: "alert", c: "warning", s: "3 puestos cuadrados" },
            ].map(k => (
              <Card key={k.l} style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div className="t-label">{k.l}</div>
                  <div className={`icon-pill ${k.c === "primary" ? "" : `icon-pill-${k.c}`}`} style={{ width: 32, height: 32 }}><Icon name={k.i} size={14} /></div>
                </div>
                <div className="t-stat-xl" style={{ fontSize: 30, marginBottom: 4 }}>{k.v}</div>
                <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{k.s}</div>
              </Card>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            {/* Payment methods */}
            <Card style={{ padding: 22 }}>
              <CardTitle>Métodos de pago</CardTitle>
              <CardDescription style={{ marginBottom: 16 }}>Distribución del total</CardDescription>
              {[
                { l: "Efectivo", v: totals.efectivo, c: "success", i: "cash" },
                { l: "Tarjeta", v: totals.tarjeta, c: "info", i: "card" },
                { l: "SINPE móvil", v: totals.sinpe, c: "primary", i: "smartphone" },
              ].map(m => {
                const pct = (m.v / totals.ventas) * 100;
                return (
                  <div key={m.l} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className={`icon-pill ${m.c === "primary" ? "" : `icon-pill-${m.c}`}`} style={{ width: 26, height: 26 }}><Icon name={m.i} size={12} /></div>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{m.l}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="t-num" style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)" }}>{fmt(m.v)}</div>
                        <div className="t-xs t-num" style={{ color: "hsl(var(--muted-foreground))" }}>{pct.toFixed(0)}%</div>
                      </div>
                    </div>
                    <div className="progress" style={{ height: 8 }}>
                      <div className="progress-bar" style={{ width: `${pct}%`, background: `hsl(var(--${m.c}))` }}></div>
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* Puestos performance */}
            <Card style={{ padding: 22 }}>
              <CardTitle>Rendimiento por puesto</CardTitle>
              <CardDescription style={{ marginBottom: 14 }}>Ventas y cuadre final</CardDescription>
              {puestos.map((p, i) => (
                <div key={p.name} style={{ padding: "12px 0", borderBottom: i < puestos.length - 1 ? "1px solid hsl(var(--border))" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                      <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{p.cajero} · {p.orders} órdenes</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="t-num" style={{ fontSize: 14, fontWeight: 800, fontFamily: "var(--font-display)" }}>{fmt(p.sales)}</div>
                      <Badge variant={p.diff === 0 ? "success" : Math.abs(p.diff) < 1000 ? "warning" : "destructive"} style={{ marginTop: 2 }}>
                        {p.diff === 0 ? "Cuadrado" : (p.diff > 0 ? "+" : "−") + fmt(Math.abs(p.diff))}
                      </Badge>
                    </div>
                  </div>
                  <div className="progress progress-thin"><div className="progress-bar" style={{ width: `${(p.sales / 200000) * 100}%` }}></div></div>
                </div>
              ))}
            </Card>
          </div>

          {/* Top products */}
          <Card style={{ padding: 0 }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <CardTitle>Productos vendidos</CardTitle>
                <CardDescription>Detalle completo del catálogo</CardDescription>
              </div>
              <Button variant="outline" size="sm" icon="download">CSV</Button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "hsl(var(--muted) / 0.4)" }}>
                  <th style={{ ...thStyle, width: 50 }}>#</th>
                  <th style={thStyle}>Producto</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Unidades</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Precio</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Ingreso</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>%</th>
                </tr>
              </thead>
              <tbody>
                {top.map((t, i) => {
                  const pct = (t.rev / totals.ventas) * 100;
                  return (
                    <tr key={t.p.id} style={{ borderBottom: i < top.length - 1 ? "1px solid hsl(var(--border))" : "none" }}>
                      <td style={{ ...tdStyle, fontFamily: "var(--font-display)", fontWeight: 800, color: i < 3 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>#{i + 1}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{t.p.emoji}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{t.p.name}</div>
                            <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{t.p.category?.name}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontFamily: "var(--font-display)" }} className="t-num">{t.qty}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }} className="t-num">{fmt(t.p.price)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontFamily: "var(--font-display)", color: "hsl(var(--primary))" }} className="t-num">{fmt(t.rev)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          <div style={{ width: 60, height: 4, borderRadius: 999, background: "hsl(var(--muted))", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "hsl(var(--primary))" }}></div>
                          </div>
                          <span className="t-num t-xs" style={{ fontWeight: 700, minWidth: 34 }}>{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "hsl(var(--muted) / 0.6)" }}>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, fontWeight: 800 }}>Total</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, fontFamily: "var(--font-display)" }} className="t-num">{top.reduce((s, t) => s + t.qty, 0)}</td>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, fontFamily: "var(--font-display)", color: "hsl(var(--primary))" }} className="t-num">{fmt(top.reduce((s, t) => s + t.rev, 0))}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800 }}>100%</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>
      </DashboardShell>
    </div>
  );
};

Object.assign(window, { ReportePartido });
