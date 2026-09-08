import React from "react";
import { SelectField, type SelectFieldOption } from "./SelectField";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: "sm" | "md" | "lg";
}

/**
 * Minimal `<select>`-shaped change event. `Select` renders a listbox, not a
 * native element, so there is no real DOM event — but every call site reads
 * `e.target.value`, so that is the shape we keep.
 */
export interface SelectChangeEvent {
  target: { value: string; name?: string };
}

interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  inputSize?: "sm" | "md" | "lg";
  children: React.ReactNode;
  value?: string | number | null;
  /**
   * Kept `<select>`-shaped on purpose: every existing call site passes a
   * handler reading `e.target.value`, so the compat layer below synthesises
   * that rather than forcing 40+ files to change signature.
   */
  onChange?: (e: SelectChangeEvent) => void;
}

export function Input({ inputSize = "md", className = "", style, ...rest }: InputProps) {
  const szClass = inputSize === "md" ? "input" : `input input-${inputSize}`;
  return <input className={`${szClass} w-full ${className}`} style={style} {...rest} />;
}

/** Read `<option>` / `<optgroup>` children into SelectField's options array. */
function optionsFromChildren(children: React.ReactNode): SelectFieldOption[] {
  const out: SelectFieldOption[] = [];

  const walk = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;

      if (child.type === "optgroup") {
        walk((child.props as { children?: React.ReactNode }).children);
        return;
      }
      if (child.type !== "option") return;

      const props = child.props as {
        value?: string | number;
        disabled?: boolean;
        children?: React.ReactNode;
      };
      const label = React.Children.toArray(props.children)
        .filter((n) => typeof n === "string" || typeof n === "number")
        .join("");

      out.push({
        // An <option> with no value attribute falls back to its text, exactly
        // as the DOM does.
        value: props.value !== undefined ? String(props.value) : label,
        label,
        disabled: props.disabled,
      });
    });
  };

  walk(children);
  return out;
}

/**
 * The app-wide select. Renders the token-styled {@link SelectField} listbox
 * while keeping the native `<select>` call signature — `<option>` children and
 * an `onChange` receiving `e.target.value` — so every existing consumer gets
 * the styled list without being rewritten.
 *
 * A native `<option>` cannot be styled beyond background and colour (the popup
 * is drawn by the OS), which is why this is a custom listbox rather than more
 * CSS. See SelectField's doc comment.
 */
export function Select({
  inputSize = "md",
  className = "",
  children,
  value,
  onChange,
  name,
  id,
  disabled,
  ...rest
}: SelectProps) {
  const options = React.useMemo(() => optionsFromChildren(children), [children]);

  // Honour a base class the caller already chose (`pp-input`, `client-input`)
  // instead of stacking `.input` on top of it and fighting for the same
  // properties. Everything else in className is passed through as modifiers.
  const baseMatch = className.match(/\b(pp-input|client-input|input-search|input)\b/);
  const baseClass = baseMatch
    ? [baseMatch[0], inputSize !== "md" ? `input-${inputSize}` : ""].filter(Boolean).join(" ")
    : undefined;
  const rest_class = baseMatch
    ? className.replace(baseMatch[0], "").replace(/\s+/g, " ").trim()
    : className;

  return (
    <SelectField
      id={id}
      name={name}
      value={value === undefined || value === null ? null : String(value)}
      options={options}
      disabled={disabled}
      inputSize={inputSize}
      baseClass={baseClass}
      className={rest_class}
      aria-label={rest["aria-label"]}
      aria-labelledby={rest["aria-labelledby"]}
      onChange={(next) => onChange?.({ target: { value: next, name } })}
    />
  );
}
