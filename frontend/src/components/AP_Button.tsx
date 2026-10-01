import { type ComponentProps } from "react";
import { cn } from "@/Shared/format";

export type ButtonSize = "sm" | "md";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 shadow-sm",
  accent: "bg-accent-500 text-brand-900 hover:bg-accent-400 shadow-sm",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-xs",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
};
const sizes: Record<ButtonSize, string> = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm" };

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    sizes[size],
  );
}

export function AP_Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={cn(buttonClass(variant, size), className)} {...props} />;
}
