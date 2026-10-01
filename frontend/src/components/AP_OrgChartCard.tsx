import { Link } from "react-router";
import { ChevronDown, ChevronUp, UserRound } from "lucide-react";
import { cn } from "@/Shared/format";
import type { OrgPerson } from "@/Shared/Types";
import { AP_Avatar } from "./AP_Avatar";
import { AP_DeptCode } from "./AP_DeptCode";

/** One person on the org chart: photo, name, title, team colour and a toggle for direct reports. */
export function AP_OrgChartCard({
  person,
  reportCount,
  open,
  highlighted,
  onToggle,
  onOpen,
}: {
  person: OrgPerson;
  reportCount: number;
  open: boolean;
  highlighted: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      id={`org-${person.id}`}
      className={cn(
        "relative w-40 overflow-hidden rounded-lg border bg-white text-center shadow-xs transition-shadow hover:shadow-md",
        highlighted ? "border-accent-500 ring-4 ring-accent-400/60" : "border-slate-200",
        open && reportCount > 0 && !highlighted && "border-brand-500",
      )}
    >
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: person.departmentColor ?? "#cbd5e1" }}
        aria-hidden="true"
      />
      <Link
        to={`/people/${person.id}`}
        onClick={(e) => {
          e.preventDefault();
          onOpen();
        }}
        draggable={false}
        className="block px-2 pt-4 pb-2"
        title={person.departmentName ?? undefined}
      >
        <span className="mx-auto mb-1.5 flex justify-center">
          {person.avatarUrl ? (
            <AP_Avatar name={person.name} src={person.avatarUrl} size={44} />
          ) : (
            <span className="flex size-11 items-center justify-center rounded-md bg-slate-500 text-white">
              <UserRound className="size-7" />
            </span>
          )}
        </span>
        <span className="block truncate text-xs font-semibold text-brand-700">{person.name}</span>
        <span className="block truncate text-[11px] text-slate-500">{person.title}</span>
        <AP_DeptCode departmentId={person.departmentId} className="mt-1 justify-center" />
      </Link>
      {reportCount > 0 ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-end gap-0.5 border-t border-slate-100 px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-50"
          aria-label={`${open ? "Hide" : "Show"} ${reportCount} direct reports`}
          aria-expanded={open}
        >
          {reportCount}
          {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>
      ) : (
        <span className="block h-[21px] border-t border-transparent" />
      )}
    </div>
  );
}
