/* Gestión de productos — gerente desktop, catálogo maestro */

const Productos = ({ onExit, onNav }) => {
  const [tab, setTab] = useState("productos");
  const [view, setView] = useState("grid"); // grid | table
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState([]);

  const handleNav = (id) => { if (id !== "productos") onNav && onNav(id); };

  const filtered = PRODUCTS.filter(p => (category === "all" || p.categoryId === category) && (!search || p.name.toLowerCase().includes(search.toLowerCase())));

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === filtered.length ? [] : filtered.map(p => p.id));

  return (
    <div data-screen-label="Gestion productos">
      <DashboardShell active="productos" onNav={handleNav}>
        <div style={{ padding: "24px 24px 40px", maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 className="t-h1" style={{ marginBottom: 6 }}>Catálogo</h1>
              <p className="t-body" style={{ color: "hsl(var(--muted-foreground))" }}>Productos y categorías compartidos por todas las sucursales.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" icon="arrowLeft" onClick={onExit}>Hub</Button>
              <Button variant="outline" icon="download">Exportar</Button>
              <Button variant="primary" icon="plus">Nuevo producto</Button>
            </div>
          </div>

          <div className="tabs" style={{ marginBottom: 18 }}>
            <button className="tab" aria-selected={tab === "productos"} onClick={() => setTab("productos")}><Icon name="package" size={13} /> Productos <Badge variant="outline" style={{ marginLeft: 6 }}>{PRODUCTS.length}</Badge></button>
            <button className="tab" aria-selected={tab === "categorias"} onClick={() => setTab("categorias")}><Icon name="grid" size={13} /> Categorías <Badge variant="outline" style={{ marginLeft: 6 }}>{CATEGORIES.length}</Badge></button>
          </div>

          {tab === "productos" && <>
            {/* Toolbar */}
            <Card style={{ padding: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: "1 1 280px" }}>
                  <Icon name="search" size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-foreground))" }} />
                  <input className="input" style={{ paddingLeft: 36 }} placeholder="Buscar por nombre o SKU..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input" value={category} onChange={e => setCategory(e.target.value)} style={{ width: 160 }}>
                  <option value="all">Todas las categorías</option>
                  {CATEGORIES.map(c => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
                </select>
                <div className="tabs">
                  <button className="tab" aria-selected={view === "grid"} onClick={() => setView("grid")}><Icon name="grid" size={12} /> Tarjetas</button>
                  <button className="tab" aria-selected={view === "table"} onClick={() => setView("table")}><Icon name="sort" size={12} /> Tabla</button>
                </div>
              </div>
              {selected.length > 0 && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "hsl(var(--primary) / 0.08)", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="t-sm" style={{ fontWeight: 700 }}>{selected.length} seleccionados</span>
                  <div style={{ flex: 1 }}></div>
                  <Button variant="outline" size="xs" icon="eye">Activar</Button>
                  <Button variant="outline" size="xs" icon="eyeOff">Desactivar</Button>
                  <Button variant="outline" size="xs" icon="trash">Eliminar</Button>
                </div>
              )}
            </Card>

            {/* Grid view */}
            {view === "grid" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                {filtered.map(p => {
                  const lowStock = p.trackInventory && p.stockQuantity <= p.lowStockThreshold;
                  return (
                    <Card key={p.id} hoverable style={{ padding: 0, overflow: "hidden", opacity: p.isActive ? 1 : 0.6 }}>
                      <div style={{ position: "relative" }}>
                        <div className="product-image-placeholder" style={{ fontSize: 56, borderRadius: 0, aspectRatio: "1/1" }}>{p.emoji}</div>
                        <div style={{ position: "absolute", top: 8, left: 8 }}>
                          <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} style={{ width: 18, height: 18, accentColor: "hsl(var(--primary))", cursor: "pointer" }} />
                        </div>
                        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4 }}>
                          {!p.isActive && <Badge variant="secondary">Inactivo</Badge>}
                          {lowStock && <Badge variant="warning">Stock {p.stockQuantity}</Badge>}
                        </div>
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{p.name}</div>
                          <Badge variant="outline" style={{ flexShrink: 0, fontSize: 9 }}>{p.category?.name}</Badge>
                        </div>
                        <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))", marginBottom: 10, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.description}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div className="t-stat" style={{ fontSize: 20, color: "hsl(var(--primary))" }}>{fmt(p.price)}</div>
                          <Button variant="ghost" size="xs" icon="edit" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Table view */}
            {view === "table" && (
              <Card style={{ padding: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "hsl(var(--muted) / 0.4)" }}>
                      <th style={{ ...thStyle, width: 40 }}><input type="checkbox" checked={selected.length === filtered.length} onChange={toggleAll} style={{ accentColor: "hsl(var(--primary))" }} /></th>
                      <th style={thStyle}>Producto</th>
                      <th style={thStyle}>SKU</th>
                      <th style={thStyle}>Categoría</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Precio</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Stock</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>Estado</th>
                      <th style={{ ...thStyle, width: 100 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => {
                      const lowStock = p.trackInventory && p.stockQuantity <= p.lowStockThreshold;
                      return (
                        <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid hsl(var(--border))" : "none" }}>
                          <td style={tdStyle}><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} style={{ accentColor: "hsl(var(--primary))" }} /></td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 6, background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{p.emoji}</div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                                <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{p.description.slice(0, 40)}…</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, fontFamily: "var(--font-mono)", fontSize: 12 }}>{p.sku}</td>
                          <td style={tdStyle}><Badge variant="outline">{p.category?.name}</Badge></td>
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, fontFamily: "var(--font-display)" }} className="t-num">{fmt(p.price)}</td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <span className={"t-num " + (lowStock ? "badge badge-warning" : "")} style={lowStock ? {} : { fontWeight: 700, fontFamily: "var(--font-display)" }}>{p.stockQuantity}</span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Activo" : "Inactivo"}</Badge>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                              <Button variant="ghost" size="xs" icon="edit" />
                              <Button variant="ghost" size="xs" icon="more" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid hsl(var(--border))" }}>
                  <div className="t-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Mostrando <strong className="t-num">{filtered.length}</strong> de <strong className="t-num">{PRODUCTS.length}</strong></div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Button variant="outline" size="sm" icon="chevronsLeft" />
                    <Button variant="outline" size="sm" icon="chevronLeft" />
                    <Button variant="outline" size="sm">1</Button>
                    <Button variant="outline" size="sm" icon="chevronRight" />
                    <Button variant="outline" size="sm" icon="chevronsRight" />
                  </div>
                </div>
              </Card>
            )}
          </>}

          {tab === "categorias" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {CATEGORIES.map(c => {
                const count = PRODUCTS.filter(p => p.categoryId === c.categoryId).length;
                return (
                  <Card key={c.categoryId} hoverable style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ height: 80, background: c.backgroundColor, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                      <Icon name={c.icon || "box"} size={32} strokeWidth={1.5} />
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-display)" }}>{c.name}</div>
                          <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-mono)" }}>/{c.slug}</div>
                        </div>
                        <Badge variant="success">Activa</Badge>
                      </div>
                      <p className="t-sm" style={{ color: "hsl(var(--muted-foreground))", marginBottom: 12 }}>{c.description}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid hsl(var(--border))" }}>
                        <span className="t-xs"><strong className="t-num">{count}</strong> productos</span>
                        <Button variant="ghost" size="xs" icon="edit">Editar</Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
              <button className="card card-hover" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 220, border: "2px dashed hsl(var(--border))", background: "transparent", cursor: "pointer", color: "hsl(var(--muted-foreground))", gap: 10, font: "inherit" }}>
                <div className="icon-pill icon-pill-lg icon-pill-muted"><Icon name="plus" size={22} /></div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Nueva categoría</div>
              </button>
            </div>
          )}
        </div>
      </DashboardShell>
    </div>
  );
};

Object.assign(window, { Productos });
