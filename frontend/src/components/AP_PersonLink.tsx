import { Link } from "react-router";
import type { PersonRef } from "@/Shared/Types";
import { AP_Avatar } from "./AP_Avatar";

/** Avatar + name + title linking to the person's profile. */
export function AP_PersonLink({ p }: { p: PersonRef }) {
  return (
    <Link to={`/people/${p.id}`} className="flex items-center gap-2.5 rounded-lg hover:bg-slate-50">
      <AP_Avatar name={p.name} src={p.avatarUrl} size={32} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-brand-700">{p.name}</span>
        <span className="block truncate text-xs text-slate-500">{p.title}</span>
      </span>
    </Link>
  );
}
