import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: "sm" | "md" | "lg";
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  inputSize?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function Input({ inputSize = "md", className = "", style, ...rest }: InputProps) {
  const szClass = inputSize === "md" ? "input" : `input input-${inputSize}`;
  return <input className={`${szClass} ${className}`} style={{ width: "100%", ...style }} {...rest} />;
}

export function Select({ inputSize = "md", className = "", children, style, ...rest }: SelectProps) {
  const szClass = inputSize === "md" ? "input" : `input input-${inputSize}`;
  return (
    <select className={`${szClass} ${className}`} style={{ width: "100%", ...style }} {...rest}>
      {children}
    </select>
  );
}
