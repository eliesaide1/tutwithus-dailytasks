import { useDeptCodes } from "@/hooks/useDeptCodes";
import { cn } from "@/Shared/format";

/** Small badge with the department's project code(s), e.g. "DEV", shown next to its name. */
export function AP_DeptCode({ departmentId, className }: { departmentId: string | null | undefined; className?: string }) {
  const codes = useDeptCodes().codesOf(departmentId);
  if (codes.length === 0) return null;
  return (
    <span className={cn("inline-flex gap-1 align-middle", className)}>
      {codes.map((c) => (
        <span key={c} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-wide text-slate-600 ring-1 ring-slate-200 ring-inset">
          {c}
        </span>
      ))}
    </span>
  );
}
