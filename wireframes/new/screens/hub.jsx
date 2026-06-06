/* Hub — landing screen with navigation to all 8 screens */

const Hub = ({ onNav }) => {
  const sections = [
    {
      title: "Operación — Cajero",
      subtitle: "Flujos que un cajero usa durante el partido",
      role: "cajero",
      screens: [
        { id: "apertura", title: "Apertura de inventario", description: "Conteo inicial antes de abrir ventas.", icon: "unlock", device: "Móvil", tag: "Inicio turno" },
        { id: "pos", title: "POS cajero", description: "Cobro rápido con offline y múltiples pagos.", icon: "cash", device: "Móvil", tag: "En vivo", featured: true },
        { id: "cierre", title: "Cierre de caja", description: "Cuadre de stock y efectivo al cerrar.", icon: "lock", device: "Móvil", tag: "Fin turno" },
      ],
    },
    {
      title: "Gestión — Gerente",
      subtitle: "Herramientas para controlar el negocio en tiempo real",
      role: "gerente",
      screens: [
        { id: "dashboard", title: "Panel gerente", description: "Vista en vivo de ingresos, puestos y ventas.", icon: "chart", device: "Desktop", tag: "Tiempo real", featured: true },
        { id: "dashmobile", title: "Panel gerente · móvil", description: "Resumen compacto desde el estadio.", icon: "smartphone", device: "Móvil", tag: "En camino" },
        { id: "config", title: "Configurar sesión", description: "Crear partido y asignar cajeros por puesto.", icon: "settings", device: "Desktop", tag: "Pre-partido" },
        { id: "productos", title: "Gestión de productos", description: "Catálogo maestro, precios y categorías.", icon: "package", device: "Desktop", tag: "Catálogo" },
        { id: "reporte", title: "Reporte de partido", description: "Cierre financiero y top productos.", icon: "trending", device: "Desktop", tag: "Post-partido" },
      ],
    },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Navbar */}
      <header className="nav-bar">
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge variant="primary-soft" style={{ gap: 6 }}>
              <span className="status-dot status-dot-live" style={{ width: 6, height: 6 }}></span>
              Partido en vivo
            </Badge>
            <div className="separator-v" style={{ height: 24 }}></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 999, background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13 }}>LS</div>
              <div style={{ display: "none" }} className="hide-mobile">
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>Luis Solano</div>
                <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Gerente</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Welcome card */}
        <div className="card fade-up" style={{ padding: 28, marginBottom: 32, background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))", borderColor: "hsl(var(--primary) / 0.25)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: 999, background: "hsl(var(--primary) / 0.08)", pointerEvents: "none" }}></div>
          <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 620 }}>
              <div className="t-label" style={{ color: "hsl(var(--primary))", marginBottom: 10 }}>Rediseño hi-fi · 8 pantallas</div>
              <h1 className="t-h1" style={{ marginBottom: 10, fontSize: "clamp(32px, 4vw, 44px)" }}>
                Vender rápido en el estadio, <span style={{ color: "hsl(var(--primary))" }}>controlarlo</span> en vivo.
              </h1>
              <p className="t-body" style={{ color: "hsl(var(--muted-foreground))", maxWidth: 540 }}>
                Sistema POS para Pollos Porteños con dos perfiles: cajero en puesto (móvil) y gerente con panel en tiempo real. Tocá cualquier tarjeta para entrar al flujo.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Button variant="primary" size="lg" icon="cash" onClick={() => onNav("pos")}>Abrir POS</Button>
              <Button variant="outline" size="lg" icon="chart" onClick={() => onNav("dashboard")}>Panel gerente</Button>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 40 }}>
          {[
            { label: "Pantallas", value: "8", hint: "Flujos hi-fi", icon: "layers" },
            { label: "Perfiles", value: "2", hint: "Cajero · Gerente", icon: "users" },
            { label: "Dispositivos", value: "Móvil + Desktop", hint: "Responsive nativo", icon: "smartphone" },
            { label: "Sistema", value: "Shadcn-style", hint: "Tokens + Barlow", icon: "sparkles" },
          ].map((s) => (
            <Card key={s.label} style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div className="t-label">{s.label}</div>
                <div className="icon-pill" style={{ width: 28, height: 28 }}><Icon name={s.icon} size={14} /></div>
              </div>
              <div className="t-h3" style={{ marginBottom: 4, fontSize: 22 }}>{s.value}</div>
              <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{s.hint}</div>
            </Card>
          ))}
        </div>

        {/* Sections */}
        {sections.map((section) => (
          <section key={section.title} style={{ marginBottom: 44 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 className="t-h2" style={{ marginBottom: 4 }}>{section.title}</h2>
                <p className="t-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{section.subtitle}</p>
              </div>
              <Badge variant="outline">{section.screens.length} pantallas</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {section.screens.map((s) => (
                <Card key={s.id} hoverable onClick={() => onNav(s.id)} as="button"
                  style={{ padding: 22, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 14, minHeight: 200, font: "inherit" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className={`icon-pill icon-pill-lg ${s.featured ? "" : "icon-pill-muted"}`}>
                      <Icon name={s.icon} size={22} strokeWidth={1.75} />
                    </div>
                    <Badge variant={s.featured ? "primary-soft" : "outline"}>{s.device}</Badge>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="t-h4" style={{ marginBottom: 6, fontSize: 17 }}>{s.title}</div>
                    <div className="t-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{s.description}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid hsl(var(--border))" }}>
                    <span className="t-xs" style={{ color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{s.tag}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: "hsl(var(--primary))" }}>
                      Abrir <Icon name="arrowRight" size={14} />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ))}

        {/* Design system footer */}
        <Card style={{ padding: 24, marginTop: 8, background: "hsl(var(--muted) / 0.3)" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div className="icon-pill icon-pill-lg">
              <Icon name="sparkles" size={22} />
            </div>
            <div style={{ flex: "1 1 300px" }}>
              <div className="t-h4" style={{ marginBottom: 6 }}>Sistema de diseño</div>
              <div className="t-sm" style={{ color: "hsl(var(--muted-foreground))", lineHeight: 1.6 }}>
                Tipografía <strong style={{ color: "hsl(var(--foreground))" }}>Barlow Condensed</strong> para display y números, <strong style={{ color: "hsl(var(--foreground))" }}>Barlow</strong> para UI. Paleta warm-paper con acento naranja Pollos (#E8620A). Componentes shadcn-style sobre tokens HSL. Tocá el ícono de tweaks en la esquina para alternar tema claro/oscuro.
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

Object.assign(window, { Hub });
