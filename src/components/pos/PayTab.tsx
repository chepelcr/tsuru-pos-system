import { Icon } from "@/components/ui";
import { POS } from "@/theme/pos";

interface PayTabProps {
  icon: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function PayTab({ icon, label, selected, onClick }: PayTabProps) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        border: selected ? `1.5px solid ${POS.rose}` : `1px solid ${POS.border}`,
        background: selected ? POS.roseLight : POS.card,
        color: selected ? POS.rose : POS.muted,
        cursor: "pointer",
        borderRadius: 10,
        transition: "all .15s",
        fontFamily: POS.fontUI,
      }}
    >
      <Icon name={icon} size={20} style={{ color: selected ? POS.rose : POS.muted }} />
      <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
    </button>
  );
}
