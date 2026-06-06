import { Icon } from "@/components/ui";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = "Buscar…", isLoading, style, className }: SearchInputProps) {
  return (
    <div className={`relative ${className ?? ""}`} style={style}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground flex items-center">
        {isLoading ? (
          <Icon name="refresh" size={14} className="animate-spin" />
        ) : (
          <Icon name="search" size={14} />
        )}
      </div>
      <input
        className="input w-full pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
