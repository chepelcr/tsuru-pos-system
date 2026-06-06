/* Config sesión — gerente desktop, crear partido y asignar puestos */

const ConfigSesion = ({ onExit, onNav }) => {
  const [tab, setTab] = useState("partido");
  const [sesion, setSesion] = useState({
    type: "partido",
    rival: "Saprissa",
    date: "2026-04-19",
    time: "19:00",
    sucursal: "estadio",
  });
  const [puestos, setPuestos] = useState([
    { id: "pst-1", name: "Puesto 1", location: "Gradas sur", cajero: "u1", cocinero: "u3" },
    { id: "pst-2", name: "Puesto 2", location: "Palcos", cajero: "u2", cocinero: "u4" },
    { id: "pst-3", name: "Caja Restaurante", location: "Centro", cajero: "", cocinero: "" },
  ]);
  const [openModal, setOpenModal] = useState(null);

  const handleNav = (id) => { if (id !== "config") onNav && onNav(id); };

  const assigned = puestos.filter(p => p.cajero).length;

  return (
    <div data-screen-label="Configurar sesion">
      <DashboardShell active="config" onNav={handleNav}>
        <div style={{ padding: "24px 24px 40px", maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 className="t-h1" style={{ marginBottom: 6 }}>Configurar sesión</h1>
              <p className="t-body" style={{ color: "hsl(var(--muted-foreground))" }}>Creá un nuevo partido o día operativo y asigná cajeros y cocineros a cada puesto.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" icon="arrowLeft" onClick={onExit}>Hub</Button>
              <Button variant="primary" icon="check" disabled={assigned < puestos.length}>Activar sesión</Button>
            </div>
          </div>

          <div className="tabs" style={{ marginBottom: 18 }}>
            <button className="tab" aria-selected={tab === "partido"} onClick={() => setTab("partido")}><Icon name="calendar" size={13} /> Datos del partido</button>
            <button className="tab" aria-selected={tab === "puestos"} onClick={() => setTab("puestos")}><Icon name="store" size={13} /> Puestos y asignaciones</button>
            <button className="tab" aria-selected={tab === "inventario"} onClick={() => setTab("inventario")}><Icon name="box" size={13} /> Inventario inicial</button>
          </div>

          {tab === "partido" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
              <Card style={{ padding: 24 }}>
                <CardTitle>Información de la sesión</CardTitle>
                <CardDescription style={{ marginBottom: 20 }}>Los cajeros verán este contexto al abrir turno.</CardDescription>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label className="label">Tipo de sesión</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[{ id: "partido", i: "trending", l: "Partido", d: "Ventas en estadio" }, { id: "regular", i: "store", l: "Día regular", d: "Operación restaurante" }].map(o => (
                        <button key={o.id} onClick={() => setSesion(s => ({ ...s, type: o.id }))}
                          className={sesion.type === o.id ? "card card-primary" : "card"}
                          style={{ padding: 14, textAlign: "left", display: "flex", gap: 12, alignItems: "center", border: sesion.type === o.id ? "2px solid hsl(var(--primary))" : "1px solid hsl(var(--border))", background: sesion.type === o.id ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))" }}>
                          <div className={`icon-pill ${sesion.type === o.id ? "" : "icon-pill-muted"}`}><Icon name={o.i} size={16} /></div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{o.l}</div>
                            <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{o.d}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {sesion.type === "partido" && <>
                    <div>
                      <label className="label">Equipo rival</label>
                      <input className="input" value={sesion.rival} onChange={e => setSesion(s => ({ ...s, rival: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Hora del partido</label>
                      <input className="input" type="time" value={sesion.time} onChange={e => setSesion(s => ({ ...s, time: e.target.value }))} />
                    </div>
                  </>}
                  <div>
                    <label className="label">Fecha</label>
                    <input className="input" type="date" value={sesion.date} onChange={e => setSesion(s => ({ ...s, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Sucursal</label>
                    <select className="input" value={sesion.sucursal} onChange={e => setSesion(s => ({ ...s, sucursal: e.target.value }))}>
                      <option value="estadio">Estadio 'Lito' Pérez</option>
                      <option value="restaurante">Restaurante Puntarenas</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card style={{ padding: 22 }}>
                <CardTitle>Vista previa</CardTitle>
                <CardDescription style={{ marginBottom: 16 }}>Así la verán los cajeros</CardDescription>
                <Card style={{ padding: 16, background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.02))", borderColor: "hsl(var(--primary) / 0.3)" }}>
                  <Badge variant="primary-soft" style={{ marginBottom: 10 }}>{sesion.type === "partido" ? "Partido" : "Día regular"}</Badge>
                  <div className="t-h2" style={{ marginBottom: 6, fontSize: 24 }}>{sesion.type === "partido" ? `vs ${sesion.rival}` : "Operación regular"}</div>
                  <div className="t-sm" style={{ color: "hsl(var(--muted-foreground))", marginBottom: 14 }}>
                    {new Date(sesion.date).toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })}{sesion.type === "partido" ? ` · ${sesion.time}` : ""}
                  </div>
                  <div className="separator" style={{ marginBottom: 12 }}></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div className="t-label" style={{ fontSize: 10 }}>Puestos</div>
                      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)" }}>{puestos.length}</div>
                    </div>
                    <div>
                      <div className="t-label" style={{ fontSize: 10 }}>Asignados</div>
                      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-display)" }}>{assigned}/{puestos.length}</div>
                    </div>
                  </div>
                </Card>
              </Card>
            </div>
          )}

          {tab === "puestos" && (
            <Card style={{ padding: 0 }}>
              <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid hsl(var(--border))" }}>
                <div>
                  <CardTitle>Puestos y asignaciones</CardTitle>
                  <CardDescription>{assigned}/{puestos.length} puestos con cajero asignado</CardDescription>
                </div>
                <Button variant="outline" icon="plus" size="sm">Nuevo puesto</Button>
              </div>
              <div style={{ padding: "0 24px" }}>
                {puestos.map((p, i) => {
                  const cajero = CAJEROS.find(c => c.id === p.cajero);
                  const cocinero = CAJEROS.find(c => c.id === p.cocinero);
                  return (
                    <div key={p.id} style={{ padding: "18px 0", borderBottom: i < puestos.length - 1 ? "1px solid hsl(var(--border))" : "none", display: "grid", gridTemplateColumns: "1fr 1.2fr 1.2fr auto", gap: 20, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="icon-pill icon-pill-lg"><Icon name="store" size={18} /></div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                          <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{p.location}</div>
                        </div>
                      </div>
                      <div>
                        <div className="t-label" style={{ fontSize: 10, marginBottom: 4 }}>Cajero</div>
                        {cajero ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 999, background: "hsl(var(--primary))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-display)" }}>{cajero.firstName[0]}{cajero.lastName[0]}</div>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{cajero.firstName} {cajero.lastName}</span>
                          </div>
                        ) : <Badge variant="warning">Sin asignar</Badge>}
                      </div>
                      <div>
                        <div className="t-label" style={{ fontSize: 10, marginBottom: 4 }}>Cocinero</div>
                        {cocinero ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 999, background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-display)" }}>{cocinero.firstName[0]}{cocinero.lastName[0]}</div>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{cocinero.firstName} {cocinero.lastName}</span>
                          </div>
                        ) : <Badge variant="outline">Opcional</Badge>}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button variant="outline" size="sm" icon="edit" onClick={() => setOpenModal(p.id)}>Editar</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {tab === "inventario" && (
            <Card style={{ padding: 0 }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid hsl(var(--border))" }}>
                <CardTitle>Inventario inicial por puesto</CardTitle>
                <CardDescription>Cantidad de cada producto a entregar al abrir turno</CardDescription>
              </div>
              <div style={{ overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "hsl(var(--muted) / 0.4)" }}>
                      <th style={thStyle}>Producto</th>
                      {puestos.map(p => <th key={p.id} style={{ ...thStyle, textAlign: "center" }}>{p.name}</th>)}
                      <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRODUCTS.filter(p => p.isActive).map((p, i) => {
                      const amounts = [40, 60, 30];
                      const total = amounts.reduce((s, a) => s + a, 0);
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 6, background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{p.emoji}</div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                                <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{fmt(p.price)}</div>
                              </div>
                            </div>
                          </td>
                          {puestos.map((_, pi) => (
                            <td key={pi} style={{ ...tdStyle, textAlign: "center" }}>
                              <input className="input input-sm t-num" style={{ width: 70, margin: "0 auto", textAlign: "center", fontWeight: 700, fontFamily: "var(--font-display)" }} defaultValue={amounts[pi]} />
                            </td>
                          ))}
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, fontFamily: "var(--font-display)" }} className="t-num">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </DashboardShell>
    </div>
  );
};

const thStyle = { padding: "12px 16px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "hsl(var(--muted-foreground))", textAlign: "left", fontFamily: "var(--font-display)" };
const tdStyle = { padding: "14px 16px", fontSize: 13 };

Object.assign(window, { ConfigSesion });
