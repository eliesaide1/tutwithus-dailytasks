import { type ComponentProps } from "react";

export function AP_Checkbox({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" className="size-4 rounded border-slate-300 accent-brand-700" {...props} />
      {label}
    </label>
  );
}
