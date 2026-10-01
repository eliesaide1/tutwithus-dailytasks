import { type ComponentProps } from "react";
import { Link } from "react-router";
import { cn } from "@/Shared/format";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./AP_Button";

export function AP_LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={cn(buttonClass(variant, size), className)} {...props} />;
}
