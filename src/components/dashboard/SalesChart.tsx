export function SalesChart() {
  const data = [0, 4, 12, 25, 35, 48, 62, 75, 85, 92, 100, 95, 88, 76, 65];
  const max = 100;
  const w = 520, h = 180;
  const points = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - (v / max) * h,
  ]);
  const pathLine = "M " + points.map((p) => `${p[0]} ${p[1]}`).join(" L ");
  const pathArea = pathLine + ` L ${w} ${h} L 0 ${h} Z`;

  return (
    <div className="w-full overflow-hidden bg-muted/30 rounded-lg p-3">
      <svg viewBox={`0 0 ${w} ${h + 30}`} className="w-full h-auto block">
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t, i) => (
          <line key={i} x1="0" x2={w} y1={t * h} y2={t * h} stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="2 3" />
        ))}
        <path d={pathArea} fill="url(#salesGradient)" />
        <path d={pathLine} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) =>
          i === points.length - 3 ? (
            <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="2" />
          ) : null
        )}
        {["18:00", "19:00", "20:00", "21:00"].map((lbl, i) => (
          <text key={lbl} x={(i / 3) * w} y={h + 20} fontSize="11" fill="hsl(var(--muted-foreground))" textAnchor={i === 0 ? "start" : i === 3 ? "end" : "middle"} fontFamily="var(--font-sans)">
            {lbl}
          </text>
        ))}
      </svg>
    </div>
  );
}
