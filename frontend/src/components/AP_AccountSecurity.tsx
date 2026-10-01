import { useState } from "react";
import { KeyRound, UserCheck, UserX } from "lucide-react";
import { ResetUserPassword, SetUserActive } from "@/Shared/SharedService";
import type { AccountUser } from "@/Shared/Types";
import { useMe } from "@/hooks/useAuth";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useInvalidatePeople } from "@/hooks/usePeople";
import { AP_Button } from "./AP_Button";
import { AP_Card } from "./AP_Card";
import { AP_CardHeader } from "./AP_CardHeader";
import { AP_TempPassword } from "./AP_TempPassword";

/** Reset password and activate / deactivate an account (admins). */
export function AP_AccountSecurity({ user }: { user: AccountUser }) {
  const me = useMe();
  const isSelf = me.id === user.id;
  const invalidate = useInvalidatePeople();
  const [reset, setReset] = useState<{ email: string; tempPassword: string } | null>(null);

  const resetPw = useApiMutation(() => ResetUserPassword(user.id), {
    onSuccess: (res) => {
      setReset(res);
      void invalidate();
    },
  });
  const toggle = useApiMutation(
    (active: boolean) => SetUserActive(user.id, active),
    { onSuccess: () => invalidate() },
  );

  return (
    <AP_Card>
      <AP_CardHeader title="Security" />
      <div className="space-y-5 p-5">
        <div>
          {reset ? (
            <AP_TempPassword message={`New temporary password for ${user.name}.`} email={reset.email} password={reset.tempPassword} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">Generate a new temporary password. They must change it at next sign-in.</p>
              <AP_Button
                type="button"
                variant="secondary"
                disabled={resetPw.isPending}
                onClick={() => {
                  if (confirm(`Reset ${user.name}'s password? Their current password stops working.`)) resetPw.mutate(undefined);
                }}
              >
                <KeyRound className="size-4" /> Reset password
              </AP_Button>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {user.active
                ? "Deactivated people cannot sign in and are hidden from the org chart. Their tasks and history are kept."
                : "This account is deactivated."}
            </p>
            {user.active ? (
              <AP_Button
                type="button"
                variant="danger"
                disabled={toggle.isPending || isSelf}
                title={isSelf ? "You cannot deactivate yourself" : undefined}
                onClick={() => {
                  if (confirm(`Deactivate ${user.name}? They will not be able to sign in.`)) toggle.mutate(false);
                }}
              >
                <UserX className="size-4" /> Deactivate
              </AP_Button>
            ) : (
              <AP_Button type="button" disabled={toggle.isPending} onClick={() => toggle.mutate(true)}>
                <UserCheck className="size-4" /> Reactivate
              </AP_Button>
            )}
          </div>
          {toggle.data && <p className="mt-2 text-sm text-emerald-700">{toggle.data.message}</p>}
        </div>
      </div>
    </AP_Card>
  );
}
