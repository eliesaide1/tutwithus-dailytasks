import { Link } from "react-router";
import type { TeamsResponse } from "@/Shared/Types";
import { AP_Avatar } from "./AP_Avatar";
import { AP_Card } from "./AP_Card";
import { AP_DeptCode } from "./AP_DeptCode";

/** Team summary card: colour, lead, member avatars, member and open-task counts. */
export function AP_TeamCard({ team: t }: { team: TeamsResponse["teams"][number] }) {
  return (
    <Link to={`/teams/${t.id}`} className="group">
      <AP_Card className="relative h-full overflow-hidden p-5 transition-shadow group-hover:shadow-md">
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: t.color }} />
        <h2 className="flex items-center gap-2 font-semibold text-brand-800">
          <span className="group-hover:underline">{t.name}</span>
          <AP_DeptCode departmentId={t.id} />
        </h2>
        {t.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{t.description}</p>}
        <div className="mt-4 flex items-center gap-2.5">
          {t.lead ? (
            <>
              <AP_Avatar name={t.lead.name} src={t.lead.avatarUrl} size={32} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">{t.lead.name}</span>
                <span className="block truncate text-xs text-slate-500">Lead · {t.lead.title}</span>
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-400">No lead</span>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex -space-x-2">
            {t.members.slice(0, 6).map((m) => (
              <AP_Avatar key={m.id} name={m.name} src={m.avatarUrl} size={28} className="ring-2 ring-white" />
            ))}
            {t.members.length > 6 && (
              <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 ring-2 ring-white">
                +{t.members.length - 6}
              </span>
            )}
          </div>
          <div className="text-right text-xs text-slate-500">
            <span className="font-semibold text-slate-800">{t.members.length}</span> {t.members.length === 1 ? "member" : "members"}
            {t.openTasks !== null && (
              <>
                {" · "}
                <span className="font-semibold text-slate-800">{t.openTasks}</span> open tasks
              </>
            )}
          </div>
        </div>
      </AP_Card>
    </Link>
  );
}
