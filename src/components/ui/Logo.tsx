interface LogoProps {
  size?: number;
  showWord?: boolean;
  orgName?: string;
}

export function Logo({ size = 32, showWord = true, orgName }: LogoProps) {
  const initials = orgName
    ? orgName
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "JM";

  const displayName = orgName ?? "JMarkets POS";

  return (
    <div className="inline-flex items-center gap-2.5">
      <div
        className="bg-primary text-primary-foreground flex items-center justify-center font-display font-extrabold flex-shrink-0"
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.25),
          fontSize: Math.round(size * 0.52),
          letterSpacing: 0.5,
        }}
      >
        {initials}
      </div>
      {showWord && (
        <div className="flex flex-col leading-none">
          <span className="font-display font-extrabold text-[15px] tracking-wider uppercase text-foreground">
            {displayName}
          </span>
          <span className="text-[10px] text-muted-foreground tracking-wider uppercase mt-0.5 font-display font-semibold">
            Punto de venta
          </span>
        </div>
      )}
    </div>
  );
}
