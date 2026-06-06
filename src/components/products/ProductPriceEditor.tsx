import { Icon } from "@/components/ui";

const fmt = (n: number) => "₡" + Math.round(Number(n) || 0).toLocaleString("es-CR");

interface ProductPriceEditorProps {
  productId: string;
  price: number;
  editing: boolean;
  inputValue: string;
  align?: "left" | "right";
  onStartEdit: (id: string, currentPrice: number) => void;
  onInputChange: (v: string) => void;
  onSave: (id: string, price: number) => void;
  onCancel: () => void;
}

export function ProductPriceEditor({
  productId,
  price,
  editing,
  inputValue,
  align = "left",
  onStartEdit,
  onInputChange,
  onSave,
  onCancel,
}: ProductPriceEditorProps) {
  if (editing) {
    return (
      <div
        className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}
      >
        <input
          type="number"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          autoFocus
          className="pp-input pp-input-sm w-[90px]"
        />
        <button
          className="btn btn-success btn-xs"
          onClick={() => onSave(productId, Number(inputValue))}
        >
          <Icon name="check" size={12} />
        </button>
        <button className="btn btn-ghost btn-xs" onClick={onCancel}>
          <Icon name="close" size={12} />
        </button>
      </div>
    );
  }

  return (
    <button
      className={`font-bold font-display text-primary bg-transparent border-0 cursor-pointer ${
        align === "left" ? "text-xl" : "text-[13px]"
      }`}
      onClick={() => onStartEdit(productId, price)}
    >
      {fmt(price)}
    </button>
  );
}
