import { FormLabel } from "@/components/ui";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function FormField({ label, required, error, children, style, className }: FormFieldProps) {
  return (
    <div className={className} style={style}>
      <FormLabel required={required}>{label}</FormLabel>
      {children}
      {error && (
        <span className="block text-xs text-destructive mt-1">{error}</span>
      )}
    </div>
  );
}
