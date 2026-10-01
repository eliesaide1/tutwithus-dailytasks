import { Link } from "react-router";
import { ROLE_LABELS, type Role } from "@/Shared/constants";
import { formatAge } from "@/Shared/format";
import type { AdminUser } from "@/Shared/Types";
import { AP_Avatar } from "./AP_Avatar";
import { AP_Badge } from "./AP_Badge";
import { AP_Card } from "./AP_Card";
import { AP_DeptCode } from "./AP_DeptCode";

const roleTone = { ADMIN: "purple", MANAGER: "blue", MEMBER: "slate" } as const;

/** Accounts list for admins: role, status (active / temporary password / deactivated) and last sign-in. */
export function AP_AdminUsersTable({ users }: { users: AdminUser[] }) {
  return (
    <AP_Card className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-3">Person</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last sign-in</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => (
            <tr key={u.id} className={u.active ? "hover:bg-slate-50" : "bg-slate-50/60 text-slate-400"}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <AP_Avatar name={u.name} src={u.avatarUrl} size={32} className={u.active ? undefined : "opacity-50"} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">{u.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {u.title} · {u.email}
                    </span>
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                {u.department ? (
                  <span className="inline-flex items-center gap-1.5">
                    {u.department.name} <AP_DeptCode departmentId={u.department.id} />
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <AP_Badge tone={roleTone[u.role as Role] ?? "slate"}>{ROLE_LABELS[u.role as Role] ?? u.role}</AP_Badge>
              </td>
              <td className="px-4 py-3">
                {!u.active ? (
                  <AP_Badge tone="red">Deactivated</AP_Badge>
                ) : u.mustChangePassword ? (
                  <AP_Badge tone="amber">Temporary password</AP_Badge>
                ) : (
                  <AP_Badge tone="green">Active</AP_Badge>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{u.lastLoginAt ? formatAge(u.lastLoginAt) : "Never"}</td>
              <td className="px-4 py-3 text-right">
                <Link to={`/admin/users/${u.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AP_Card>
  );
}
