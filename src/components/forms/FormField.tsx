import { FormLabel } from "@/components/ui";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function FormField({ label, htmlFor, required, error, children, style, className }: FormFieldProps) {
  return (
    <div className={className} style={style}>
      <FormLabel htmlFor={htmlFor} required={required}>{label}</FormLabel>
      {children}
      {error && (
        <span id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="block text-xs text-destructive mt-1">{error}</span>
      )}
    </div>
  );
}
