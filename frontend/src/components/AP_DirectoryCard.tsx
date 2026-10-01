import { Link } from "react-router";
import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import { whatsappHref } from "@/Shared/SharedFunctions";
import { AP_Avatar } from "./AP_Avatar";
import { AP_Card } from "./AP_Card";
import { AP_DeptCode } from "./AP_DeptCode";

/** A directory row, with the person's local time already worked out. */
export type DirectoryEntry = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  avatarUrl: string | null;
  departmentId: string | null;
  departmentName: string | null;
  departmentColor: string | null;
  managerId: string | null;
  managerName: string | null;
  zone: string;
  localTime: string;
};

/** Contact card for one person in the directory. */
export function AP_DirectoryCard({ person: p }: { person: DirectoryEntry }) {
  return (
    <AP_Card className="relative overflow-hidden p-5">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: p.departmentColor ?? "#cbd5e1" }} />
      <div className="flex items-start gap-3">
        <AP_Avatar name={p.name} src={p.avatarUrl} size={48} />
        <div className="min-w-0 flex-1">
          <Link to={`/people/${p.id}`} className="block truncate font-semibold text-brand-700 hover:underline">
            {p.name}
          </Link>
          <p className="truncate text-sm text-slate-600">{p.title}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {p.departmentName ?? "No team"} <AP_DeptCode departmentId={p.departmentId} />
            {p.managerName && <> · reports to {p.managerName}</>}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-1.5 text-sm">
        <p className="flex items-center gap-2 text-slate-600">
          <Clock className="size-4 text-slate-400" />
          <span className="font-medium text-slate-800">{p.localTime}</span>
          <span className="truncate text-xs text-slate-500">{p.zone}</span>
        </p>
        <a href={`mailto:${p.email}`} className="flex items-center gap-2 truncate text-slate-600 hover:text-brand-700">
          <Mail className="size-4 shrink-0 text-slate-400" /> {p.email}
        </a>
        {p.phone && (
          <a href={`tel:${p.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-brand-700">
            <Phone className="size-4 text-slate-400" /> {p.phone}
          </a>
        )}
        {p.whatsapp && (
          <a href={whatsappHref(p.whatsapp)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-700 hover:underline">
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        )}
      </div>
    </AP_Card>
  );
}
