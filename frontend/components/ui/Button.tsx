import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-soft/90 shadow-lg shadow-accent/20",
  secondary: "bg-surface-2 text-slate-100 border border-line hover:border-accent/60",
  ghost: "bg-transparent text-slate-300 hover:bg-surface-2",
  danger: "bg-rose/15 text-rose border border-rose/30 hover:bg-rose/25",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors
        disabled:opacity-45 disabled:cursor-not-allowed select-none
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = "Button";