import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
import { LogoutService } from "@/Shared/SharedService";
import { useMe, useSetMe } from "@/hooks/useAuth";
import { AP_Avatar } from "./AP_Avatar";

/** Avatar button in the top bar with profile, password and sign-out. */
export function AP_UserMenu() {
  const user = useMe();
  const setMe = useSetMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function logout() {
    await LogoutService().catch(() => undefined);
    qc.clear();
    setMe(null);
    navigate("/login", { replace: true });
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100">
        <AP_Avatar name={user.name} src={user.avatarUrl} size={32} />
        <span className="hidden text-left sm:block">
          <span className="block text-sm leading-tight font-semibold text-slate-800">{user.name}</span>
          <span className="block text-xs leading-tight text-slate-500">{user.title}</span>
        </span>
        <ChevronDown className="size-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg" onClick={() => setOpen(false)}>
          <Link to={`/people/${user.id}`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
            <UserRound className="size-4 text-slate-400" /> My profile
          </Link>
          <Link to="/account" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50">
            <KeyRound className="size-4 text-slate-400" /> Account & password
          </Link>
          <button type="button" onClick={logout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
