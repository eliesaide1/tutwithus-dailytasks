import { Link } from "react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { whatsappHref } from "@/Shared/SharedFunctions";
import { AP_Avatar } from "./AP_Avatar";
import { AP_Card } from "./AP_Card";
import type { DirectoryEntry } from "./AP_DirectoryCard";
import { AP_DeptCode } from "./AP_DeptCode";

/** Compact table view of the directory. */
export function AP_DirectoryTable({ people }: { people: DirectoryEntry[] }) {
  return (
    <AP_Card className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Manager</th>
            <th className="px-4 py-3">Local time</th>
            <th className="px-4 py-3">Contact</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {people.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link to={`/people/${p.id}`} className="flex items-center gap-3">
                  <AP_Avatar name={p.name} src={p.avatarUrl} size={32} />
                  <span>
                    <span className="block font-medium text-brand-700">{p.name}</span>
                    <span className="block text-xs text-slate-500">{p.title}</span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3">
                {p.departmentName ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ background: p.departmentColor ?? "#cbd5e1" }} />
                    {p.departmentName}
                    <AP_DeptCode departmentId={p.departmentId} />
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {p.managerId ? (
                  <Link to={`/people/${p.managerId}`} className="hover:underline">
                    {p.managerName}
                  </Link>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium">{p.localTime}</span> <span className="text-xs text-slate-500">{p.zone}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <a href={`mailto:${p.email}`} className="text-slate-500 hover:text-brand-700" aria-label={`Email ${p.name}`} title={p.email}>
                    <Mail className="size-4" />
                  </a>
                  {p.phone && (
                    <a href={`tel:${p.phone}`} className="text-slate-500 hover:text-brand-700" aria-label={`Call ${p.name}`} title={p.phone}>
                      <Phone className="size-4" />
                    </a>
                  )}
                  {p.whatsapp && (
                    <a href={whatsappHref(p.whatsapp)} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-800" aria-label={`WhatsApp ${p.name}`}>
                      <MessageCircle className="size-4" />
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AP_Card>
  );
}
