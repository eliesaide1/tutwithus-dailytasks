import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/Shared/format";

/** Password field with an eye button to show or hide what was typed. */
export function AP_PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input type={visible ? "text" : "password"} className={cn("field pr-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-400 hover:text-slate-700 focus-visible:text-brand-700 focus-visible:outline-none"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
