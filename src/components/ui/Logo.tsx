import { brandAssets } from "@/lib/brand-assets";

interface LogoProps {
  size?: number;
  showWord?: boolean;
  orgName?: string;
}

export function Logo({ size = 32, showWord = true, orgName }: LogoProps) {
  const wordmarkStyle = {
    height: size * 1.5,
    maxWidth: "none",
    marginLeft: -size * 0.825,
    marginTop: -size * 0.15,
  };
  return (
    <div className="inline-flex min-w-0 flex-col leading-none">
      {showWord ? <>
        <span className="relative block shrink-0 overflow-hidden" style={{ width: size * 3, height: size }}>
          <img src={brandAssets.logoLight} alt="Tsuru" style={wordmarkStyle} className="block w-auto dark:hidden" />
          <img src={brandAssets.logoDark} alt="Tsuru" style={wordmarkStyle} className="hidden w-auto dark:block" />
        </span>
      </> : (
        <img src={brandAssets.symbol} alt="Tsuru" style={{ width: size, height: size }} />
      )}
      {orgName && (
        <span className="max-w-[180px] truncate text-[10px] font-display font-semibold text-muted-foreground" title={orgName}>
          {orgName}
        </span>
      )}
    </div>
  );
}
