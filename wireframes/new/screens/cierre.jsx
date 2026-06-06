/* Cierre de caja — cajero móvil, cuadre final */

const CierreCaja = ({ onExit }) => {
  const [step, setStep] = useState(1); // 1 = conteo final, 2 = efectivo, 3 = resumen
  const [finalCounts, setFinalCounts] = useState(() => {
    const init = {};
    PRODUCTS.filter(p => p.isActive).forEach(p => { init[p.id] = ""; });
    return init;
  });
  const [cashCount, setCashCount] = useState({ b20000: "", b10000: "", b5000: "", b2000: "", b1000: "", c500: "", c100: "" });

  const activeProducts = PRODUCTS.filter(p => p.isActive);

  // Simulated expected end counts (opening - sold)
  const opening = { p1: 40, p2: 60, p3: 15, p4: 25, p5: 50, p6: 40, p8: 20 };
  const sold = { p1: 28, p2: 42, p3: 12, p4: 18, p5: 35, p6: 24, p8: 12 };
  const expected = {};
  activeProducts.forEach(p => { expected[p.id] = (opening[p.id] || 0) - (sold[p.id] || 0); });

  const cashTotal = (Number(cashCount.b20000) || 0) * 20000 + (Number(cashCount.b10000) || 0) * 10000 + (Number(cashCount.b5000) || 0) * 5000 + (Number(cashCount.b2000) || 0) * 2000 + (Number(cashCount.b1000) || 0) * 1000 + (Number(cashCount.c500) || 0) * 500 + (Number(cashCount.c100) || 0) * 100;
  const expectedCash = 25000 + (28 * 2500 + 42 * 1200 + 12 * 800 + 18 * 1800 + 35 * 1000 + 24 * 1000 + 12 * 900) * 0.62; // some % in cash
  const cashDiff = cashTotal - expectedCash;

  const filledProducts = Object.values(finalCounts).filter(v => v !== "" && v !== null).length;

  // Faltantes
  const faltantes = activeProducts.filter(p => {
    const actual = Number(finalCounts[p.id]) || 0;
    return finalCounts[p.id] !== "" && actual < expected[p.id];
  });

  return (
    <div data-screen-label="Cierre de caja" style={{ maxWidth: 440, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", background: "hsl(var(--background))" }}>
      <div className="nav-bar" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onExit} aria-label="Volver"><Icon name="arrowLeft" size={18} /></button>
        <div style={{ flex: 1 }}>
          <div className="t-label" style={{ fontSize: 10 }}>Cierre de turno</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Paso {step} de 3</div>
        </div>
        <Badge variant="warning"><Icon name="lock" size={10} /> Cerrando</Badge>
      </div>

      {/* Steps indicator */}
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: n <= step ? "hsl(var(--primary))" : "hsl(var(--muted))" }}></div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <div className="t-xs" style={{ color: step >= 1 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))", fontWeight: step === 1 ? 700 : 500 }}>Inventario</div>
          <div className="t-xs" style={{ color: step >= 2 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))", fontWeight: step === 2 ? 700 : 500 }}>Efectivo</div>
          <div className="t-xs" style={{ color: step >= 3 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))", fontWeight: step === 3 ? 700 : 500 }}>Resumen</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "14px 16px 100px", overflowY: "auto" }}>
        {step === 1 && (
          <>
            <Card style={{ padding: 14, marginBottom: 14, background: "hsl(var(--info) / 0.08)", borderColor: "hsl(var(--info) / 0.3)" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <Icon name="info" size={18} style={{ color: "hsl(var(--info))", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, color: "hsl(var(--info))" }}>Contá lo que te queda</div>
                  <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>El sistema compara con lo esperado (inventario inicial − vendido).</div>
                </div>
              </div>
            </Card>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeProducts.map(p => {
                const val = finalCounts[p.id];
                const actual = Number(val) || 0;
                const exp = expected[p.id] || 0;
                const diff = actual - exp;
                const hasValue = val !== "" && val !== null;
                const isMatch = hasValue && diff === 0;
                const isMissing = hasValue && diff < 0;
                return (
                  <Card key={p.id} style={{ padding: 12, borderColor: isMatch ? "hsl(var(--success) / 0.4)" : isMissing ? "hsl(var(--destructive) / 0.4)" : "hsl(var(--border))" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: "hsl(var(--muted))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{p.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                        <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Esperado: <strong className="t-num" style={{ color: "hsl(var(--foreground))" }}>{exp}</strong> · Vendido: <span className="t-num">{sold[p.id] || 0}</span></div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <input className="t-num" type="number" value={val} onChange={e => setFinalCounts(c => ({ ...c, [p.id]: e.target.value }))}
                          style={{ width: 60, textAlign: "center", fontSize: 18, fontWeight: 800, background: "hsl(var(--muted))", border: "none", outline: "none", borderRadius: 8, padding: "8px 0", fontFamily: "var(--font-display)" }} placeholder="0" />
                        {hasValue && (
                          <div className="t-xs t-num" style={{ color: diff === 0 ? "hsl(var(--success))" : diff > 0 ? "hsl(var(--warning))" : "hsl(var(--destructive))", fontWeight: 700, marginTop: 2 }}>
                            {diff > 0 ? "+" : ""}{diff}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Card style={{ padding: 16, marginBottom: 14 }}>
              <div className="t-label" style={{ marginBottom: 6 }}>Total esperado en caja</div>
              <div className="t-stat-xl" style={{ fontSize: 36 }}>{fmt(expectedCash)}</div>
              <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))", marginTop: 4 }}>Fondo inicial + ventas en efectivo</div>
            </Card>

            <div className="t-label" style={{ marginBottom: 10 }}>Desglose de efectivo</div>
            <Card style={{ padding: 12 }}>
              {[
                { key: "b20000", label: "Billete 20.000", value: 20000 },
                { key: "b10000", label: "Billete 10.000", value: 10000 },
                { key: "b5000", label: "Billete 5.000", value: 5000 },
                { key: "b2000", label: "Billete 2.000", value: 2000 },
                { key: "b1000", label: "Billete 1.000", value: 1000 },
                { key: "c500", label: "Moneda 500", value: 500 },
                { key: "c100", label: "Moneda 100", value: 100 },
              ].map((denom, i) => (
                <div key={denom.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 6 ? "1px solid hsl(var(--border))" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{denom.label}</div>
                    <div className="t-xs t-num" style={{ color: "hsl(var(--muted-foreground))" }}>× {fmt(denom.value)}</div>
                  </div>
                  <input className="input t-num" type="number" value={cashCount[denom.key]} onChange={e => setCashCount(c => ({ ...c, [denom.key]: e.target.value }))}
                    style={{ width: 70, textAlign: "center", fontWeight: 700, fontFamily: "var(--font-display)" }} placeholder="0" />
                  <div className="t-num" style={{ width: 86, textAlign: "right", fontSize: 13, fontWeight: 700, color: "hsl(var(--muted-foreground))" }}>
                    {(Number(cashCount[denom.key]) || 0) * denom.value > 0 ? fmt((Number(cashCount[denom.key]) || 0) * denom.value) : "—"}
                  </div>
                </div>
              ))}
            </Card>

            <Card style={{ padding: 14, marginTop: 14, background: cashDiff === 0 ? "hsl(var(--success) / 0.08)" : Math.abs(cashDiff) < 1000 ? "hsl(var(--warning) / 0.08)" : "hsl(var(--destructive) / 0.08)", borderColor: cashDiff === 0 ? "hsl(var(--success) / 0.3)" : Math.abs(cashDiff) < 1000 ? "hsl(var(--warning) / 0.3)" : "hsl(var(--destructive) / 0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: "hsl(var(--muted-foreground))" }}>Contado</span>
                <span className="t-num" style={{ fontWeight: 700 }}>{fmt(cashTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 10 }}>
                <span style={{ color: "hsl(var(--muted-foreground))" }}>Esperado</span>
                <span className="t-num" style={{ fontWeight: 700 }}>{fmt(expectedCash)}</span>
              </div>
              <div className="separator" style={{ marginBottom: 10 }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="t-label">{cashDiff > 0 ? "Sobrante" : cashDiff < 0 ? "Faltante" : "Diferencia"}</span>
                <span className="t-stat" style={{ fontSize: 24, color: cashDiff === 0 ? "hsl(var(--success))" : Math.abs(cashDiff) < 1000 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>
                  {cashDiff >= 0 ? "+" : "−"}{fmt(Math.abs(cashDiff))}
                </span>
              </div>
            </Card>
          </>
        )}

        {step === 3 && (
          <>
            <Card style={{ padding: 18, marginBottom: 14, background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))", borderColor: "hsl(var(--primary) / 0.3)" }}>
              <div className="t-label" style={{ color: "hsl(var(--primary))", marginBottom: 6 }}>Turno · {ASIGNACION.puestoName}</div>
              <div className="t-h3" style={{ marginBottom: 4 }}>Resumen final</div>
              <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Carlos M. · 19:00 → {fmtTime(Date.now())}</div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <Card style={{ padding: 14 }}>
                <div className="t-label">Ventas</div>
                <div className="t-stat" style={{ fontSize: 22, color: "hsl(var(--success))" }}>{fmt(171000)}</div>
                <div className="t-xs" style={{ color: "hsl(var(--muted-foreground))" }}>42 órdenes</div>
              </Card>
              <Card style={{ padding: 14 }}>
                <div className="t-label">Efectivo</div>
                <div className="t-stat" style={{ fontSize: 22 }}>{fmt(cashTotal)}</div>
                <div className="t-xs t-num" style={{ color: cashDiff >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))" }}>{cashDiff >= 0 ? "+" : "−"}{fmt(Math.abs(cashDiff))}</div>
              </Card>
            </div>

            <Card style={{ padding: 16, marginBottom: 14 }}>
              <div className="t-label" style={{ marginBottom: 10 }}>Faltantes de producto</div>
              {faltantes.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                  <Icon name="checkCircle" size={18} style={{ color: "hsl(var(--success))" }} />
                  <span className="t-sm" style={{ fontWeight: 600 }}>Todo cuadra perfectamente</span>
                </div>
              ) : (
                faltantes.map(p => {
                  const diff = expected[p.id] - (Number(finalCounts[p.id]) || 0);
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid hsl(var(--border))" }}>
                      <span style={{ fontSize: 18 }}>{p.emoji}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                      <Badge variant="destructive">−{diff}</Badge>
                    </div>
                  );
                })
              )}
            </Card>

            <Card style={{ padding: 14 }}>
              <div className="t-label" style={{ marginBottom: 8 }}>Observaciones (opcional)</div>
              <textarea className="input" placeholder="Notas para el gerente…" style={{ minHeight: 70 }}></textarea>
            </Card>
          </>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "hsl(var(--background) / 0.9)", backdropFilter: "blur(12px)", borderTop: "1px solid hsl(var(--border))", padding: "12px 16px 20px" }}>
        <div style={{ maxWidth: 440, margin: "0 auto", display: "flex", gap: 8 }}>
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} size="lg" style={{ flex: 0.8 }}><Icon name="arrowLeft" size={16} /> Atrás</Button>}
          {step < 3 ? (
            <Button variant="primary" size="lg" onClick={() => setStep(step + 1)} disabled={step === 1 && filledProducts < activeProducts.length} style={{ flex: 1 }}>
              Continuar <Icon name="arrowRight" size={16} />
            </Button>
          ) : (
            <Button variant="primary" size="lg" onClick={onExit} style={{ flex: 1 }}>
              <Icon name="check" size={16} /> Cerrar turno
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { CierreCaja });
