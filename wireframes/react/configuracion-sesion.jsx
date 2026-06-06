import { useState } from "react";

const C = {
  primary: "#E8620A", primaryDark: "#C4500A", primaryGlow: "#E8620A15",
  bg: "#0D0D0D", surface: "#161616", surfaceHigh: "#1E1E1E",
  border: "#2A2A2A", borderBright: "#383838",
  text: "#FFFFFF", textSub: "#888888", textMuted: "#444444",
  success: "#2ECC71", successDim: "#2ECC7115",
  warning: "#F1C40F", warningDim: "#F1C40F15",
  error: "#E74C3C", errorDim: "#E74C3C15",
};

const CAJEROS = [
  { id: "u1", nombre: "Carlos Mora", email: "carlos@pollos.cr" },
  { id: "u2", nombre: "María Quesada", email: "maria@pollos.cr" },
  { id: "u3", nombre: "Diego Vargas", email: "diego@pollos.cr" },
  { id: "u4", nombre: "Ana Jiménez", email: "ana@pollos.cr" },
];

const PUESTOS = [
  { id: "p1", nombre: "Puesto 1", sucursal: "estadio" },
  { id: "p2", nombre: "Puesto 2", sucursal: "estadio" },
  { id: "p3", nombre: "Caja Restaurante", sucursal: "restaurante" },
];

const CONTEXTOS = {
  estadio: ["gradas", "mesa"],
  restaurante: ["caja"],
};

function fmt(n) { return "₡" + Number(n).toLocaleString("es-CR"); }

function Badge({ children, color }) {
  return (
    <span style={{ padding: "2px 8px", borderRadius: 4, background: color + "20", color, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, border: `1px solid ${color}44` }}>
      {children}
    </span>
  );
}

export default function ConfiguracionSesion() {
  const [tipo, setTipo] = useState("partido");
  const [nombre, setNombre] = useState("");
  const [rival, setRival] = useState("");
  const [fecha, setFecha] = useState("2026-04-12");
  const [horaInicio, setHoraInicio] = useState("19:00");
  const [horaFin, setHoraFin] = useState("22:00");
  const [puestosActivos, setPuestosActivos] = useState({ p1: true, p2: true, p3: false });
  const [asignaciones, setAsignaciones] = useState({});
  const [step, setStep] = useState(0); // 0=sesion, 1=puestos, 2=asignaciones, 3=confirm
  const [saved, setSaved] = useState(false);

  const togglePuesto = (pid) => setPuestosActivos(p => ({ ...p, [pid]: !p[pid] }));

  const setAsignacion = (puestoId, campo, valor) => {
    setAsignaciones(a => ({
      ...a,
      [puestoId]: { ...(a[puestoId] || {}), [campo]: valor }
    }));
  };

  const puestosActivosList = PUESTOS.filter(p => puestosActivos[p.id]);
  const asignacionesCompletas = puestosActivosList.every(p => asignaciones[p.id]?.userId && asignaciones[p.id]?.contexto);

  const steps = ["Sesión", "Puestos", "Asignaciones", "Confirmar"];

  if (saved) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif" }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.successDim, border: `2px solid ${C.success}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>✓</div>
        <div>
          <div style={{ color: C.success, fontWeight: 800, fontSize: 32, letterSpacing: 1 }}>SESIÓN ACTIVADA</div>
          <div style={{ color: C.textSub, fontSize: 14, marginTop: 6 }}>
            {tipo === "partido" ? `vs ${rival}` : nombre} · {fecha}
          </div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, width: 400, textAlign: "left" }}>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 2, marginBottom: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>ASIGNACIONES CREADAS</div>
          {puestosActivosList.map(p => {
            const a = asignaciones[p.id] || {};
            const cajero = CAJEROS.find(c => c.id === a.userId);
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{p.nombre}</div>
                  <div style={{ color: C.textSub, fontSize: 12 }}>{cajero?.nombre}</div>
                </div>
                <Badge color={C.primary}>{a.contexto}</Badge>
              </div>
            );
          })}
        </div>
        <div style={{ color: C.textMuted, fontSize: 11, fontFamily: "monospace" }}>Los cajeros ya pueden hacer login y descargar su asignación</div>
        <button onClick={() => { setSaved(false); setStep(0); setAsignaciones({}); }} style={{ padding: "12px 28px", background: C.primary, border: "none", borderRadius: 10, color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, cursor: "pointer" }}>
          + Nueva sesión
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Barlow', 'Arial', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #E8620A44; border-radius: 2px; }
        input, select { font-family: inherit; }
        button { font-family: inherit; cursor: pointer; }
      `}</style>

      {/* Navbar */}
      <div style={{ height: 58, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.primary, letterSpacing: 1 }}>🍗 POLLOS PORTEÑOS · GERENTE</span>
        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", letterSpacing: 1 }}>WIREFRAME JCA-181 · CONFIGURACIÓN DE SESIÓN</span>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 28, color: C.text, letterSpacing: 1 }}>⚙ CONFIGURAR NUEVA SESIÓN</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>Creá la sesión, asigná los puestos y los vendedores antes de activar.</div>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", gap: 0, marginBottom: 32 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ height: 4, borderRadius: 2, background: i <= step ? C.primary : C.surfaceHigh, transition: "background 0.3s", marginRight: i < steps.length - 1 ? 4 : 0 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: i < step ? C.success : i === step ? C.primary : C.surfaceHigh, border: `1px solid ${i <= step ? "transparent" : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 12, color: i === step ? C.primary : i < step ? C.success : C.textMuted, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 0.5 }}>{s.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* STEP 0: Tipo de sesión */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.text }}>¿Qué tipo de sesión vas a crear?</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { id: "partido", label: "Partido de Fútbol", desc: "Vinculado a un partido de Puntarenas FC", icon: "⚽", sucursal: "Estadio" },
                { id: "turno", label: "Turno de Restaurante", desc: "Apertura por horario en el restaurante", icon: "🍽", sucursal: "Restaurante" },
              ].map(t => (
                <button key={t.id} onClick={() => setTipo(t.id)} style={{ padding: 20, background: tipo === t.id ? C.primaryGlow : C.surface, border: `2px solid ${tipo === t.id ? C.primary : C.border}`, borderRadius: 14, textAlign: "left", transition: "all 0.15s" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{t.icon}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 17, color: C.text, marginBottom: 4 }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}>{t.desc}</div>
                  <Badge color={C.primary}>{t.sucursal}</Badge>
                </button>
              ))}
            </div>

            {tipo === "partido" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>Datos del partido</div>
                {[
                  { label: "RIVAL", value: rival, set: setRival, placeholder: "Ej: Alajuelense" },
                  { label: "FECHA", value: fecha, set: setFecha, type: "date" },
                  { label: "HORA INICIO", value: horaInicio, set: setHoraInicio, type: "time" },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif" }}>{f.label}</div>
                    <input type={f.type || "text"} placeholder={f.placeholder} value={f.value} onChange={e => f.set(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 16, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, outline: "none" }} />
                  </div>
                ))}
              </div>
            )}

            {tipo === "turno" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>Datos del turno</div>
                {[
                  { label: "NOMBRE DEL TURNO", value: nombre, set: setNombre, placeholder: "Ej: Turno mañana" },
                  { label: "FECHA", value: fecha, set: setFecha, type: "date" },
                  { label: "HORA INICIO", value: horaInicio, set: setHoraInicio, type: "time" },
                  { label: "HORA FIN", value: horaFin, set: setHoraFin, type: "time" },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif" }}>{f.label}</div>
                    <input type={f.type || "text"} placeholder={f.placeholder} value={f.value} onChange={e => f.set(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 16, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, outline: "none" }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Puestos activos */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.text }}>¿Qué puestos estarán activos?</div>
            {PUESTOS.filter(p => tipo === "partido" ? p.sucursal === "estadio" : p.sucursal === "restaurante").map(p => (
              <button key={p.id} onClick={() => togglePuesto(p.id)} style={{ padding: "16px 20px", background: puestosActivos[p.id] ? C.primaryGlow : C.surface, border: `2px solid ${puestosActivos[p.id] ? C.primary : C.border}`, borderRadius: 14, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s" }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: C.text }}>{p.nombre}</div>
                  <div style={{ fontSize: 12, color: C.textSub }}>Sucursal: {p.sucursal}</div>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: puestosActivos[p.id] ? C.primary : C.surfaceHigh, border: `2px solid ${puestosActivos[p.id] ? C.primary : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800 }}>
                  {puestosActivos[p.id] ? "✓" : ""}
                </div>
              </button>
            ))}
            {puestosActivosList.length === 0 && (
              <div style={{ padding: 16, background: C.warningDim, border: `1px solid ${C.warning}44`, borderRadius: 10, color: C.warning, fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif" }}>
                ⚠ Seleccioná al menos un puesto para continuar
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Asignaciones */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.text }}>Asignar vendedores a puestos</div>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>Por cada puesto activo, asigná un vendedor y el contexto de venta.</div>
            </div>
            {puestosActivosList.map(p => {
              const a = asignaciones[p.id] || {};
              const contextosDisponibles = CONTEXTOS[p.sucursal] || [];
              const completo = a.userId && a.contexto;
              return (
                <div key={p.id} style={{ background: C.surface, border: `2px solid ${completo ? C.success + "66" : C.border}`, borderRadius: 14, padding: 20, position: "relative", overflow: "hidden" }}>
                  {completo && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: C.success }} />}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: C.text }}>{p.nombre}</div>
                    {completo && <Badge color={C.success}>✓ Completo</Badge>}
                  </div>

                  {/* Vendedor */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif" }}>VENDEDOR</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {CAJEROS.map(c => (
                        <button key={c.id} onClick={() => setAsignacion(p.id, "userId", c.id)} style={{ padding: "9px 14px", background: a.userId === c.id ? C.primaryGlow : C.surfaceHigh, border: `1px solid ${a.userId === c.id ? C.primary : C.border}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ textAlign: "left" }}>
                            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: C.text }}>{c.nombre}</div>
                            <div style={{ fontSize: 11, color: C.textMuted }}>{c.email}</div>
                          </div>
                          {a.userId === c.id && <span style={{ color: C.primary, fontSize: 16 }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contexto */}
                  <div>
                    <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 1.5, marginBottom: 6, fontFamily: "'Barlow Condensed', sans-serif" }}>CONTEXTO DE VENTA</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {contextosDisponibles.map(ctx => (
                        <button key={ctx} onClick={() => setAsignacion(p.id, "contexto", ctx)} style={{ flex: 1, padding: "9px", background: a.contexto === ctx ? C.primary : C.surfaceHigh, border: `1px solid ${a.contexto === ctx ? C.primary : C.border}`, borderRadius: 8, color: a.contexto === ctx ? "#fff" : C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, textTransform: "uppercase" }}>
                          {ctx}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 3: Confirmación */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 20, color: C.text }}>Confirmá antes de activar</div>

            {/* Resumen sesión */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 2, marginBottom: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>SESIÓN</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, color: C.text }}>
                    {tipo === "partido" ? `⚽ vs ${rival || "—"}` : `🍽 ${nombre || "—"}`}
                  </div>
                  <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>{fecha} · {horaInicio}{horaFin ? ` → ${horaFin}` : ""}</div>
                </div>
                <Badge color={tipo === "partido" ? C.primary : "#3498DB"}>{tipo}</Badge>
              </div>
            </div>

            {/* Resumen asignaciones */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 2, marginBottom: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>ASIGNACIONES A CREAR</div>
              {puestosActivosList.map(p => {
                const a = asignaciones[p.id] || {};
                const cajero = CAJEROS.find(c => c.id === a.userId);
                return (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: C.text }}>{p.nombre}</div>
                      <div style={{ fontSize: 12, color: C.textSub }}>{cajero?.nombre || "—"}</div>
                    </div>
                    <Badge color={C.primary}>{a.contexto || "—"}</Badge>
                  </div>
                );
              })}
            </div>

            <div style={{ background: C.warningDim, border: `1px solid ${C.warning}44`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: C.warning, fontFamily: "'Barlow Condensed', sans-serif" }}>
              ⚠ Al activar, los cajeros asignados podrán hacer login y comenzar a vender. Los precios quedan bloqueados.
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: "13px", background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, color: C.textSub, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 17 }}>← Atrás</button>
          )}
          <button
            onClick={() => step < 3 ? setStep(s => s + 1) : setSaved(true)}
            disabled={step === 1 && puestosActivosList.length === 0 || step === 2 && !asignacionesCompletas}
            style={{
              flex: 2, padding: "13px",
              background: (step === 1 && puestosActivosList.length === 0) || (step === 2 && !asignacionesCompletas) ? C.surfaceHigh : step === 3 ? C.success : C.primary,
              border: "none", borderRadius: 10, color: "#fff",
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: 1,
              cursor: (step === 1 && puestosActivosList.length === 0) || (step === 2 && !asignacionesCompletas) ? "not-allowed" : "pointer",
            }}
          >
            {step === 3 ? "🚀 ACTIVAR SESIÓN" : step === 2 ? "Revisar →" : "Siguiente →"}
          </button>
        </div>
      </div>
    </div>
  );
}
