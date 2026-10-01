import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ROLE_LABELS } from "@/Shared/constants";
import { zoneLabel } from "@/Shared/time";
import { ChangePasswordService } from "@/Shared/SharedService";
import { useMe, useSetMe } from "@/hooks/useAuth";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_Badge } from "@/components/AP_Badge";
import { AP_Button } from "@/components/AP_Button";
import { AP_Card } from "@/components/AP_Card";
import { AP_CardHeader } from "@/components/AP_CardHeader";
import { AP_Field } from "@/components/AP_Field";
import { AP_PageHeader } from "@/components/AP_PageHeader";
import { AP_PasswordInput } from "@/components/AP_PasswordInput";

export default function AccountScreen() {
  useDocumentTitle("Account");
  const user = useMe();
  const setMe = useSetMe();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const wasForced = user.mustChangePassword;

  const change = useApiMutation(ChangePasswordService);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    change.mutate(
      { current: String(fd.get("current") ?? ""), next: String(fd.get("next") ?? ""), confirm: String(fd.get("confirm") ?? "") },
      {
        onSuccess: ({ user: updated }) => {
          setMe(updated);
          form.reset();
          if (wasForced) navigate("/", { replace: true });
          else setDone(true);
        },
      },
    );
  }

  return (
    <div className="max-w-3xl">
      <AP_PageHeader title="Account" description="Your sign-in details and password." />
      {user.mustChangePassword && (
        <p className="mb-6 rounded-xl bg-accent-100 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Welcome! You are using a temporary password. Please choose your own password to continue.
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <AP_Card>
          <AP_CardHeader title="Your account" />
          <dl className="space-y-3 px-5 py-4 text-sm">
            <Row label="Name" value={user.name} />
            <Row label="Email" value={user.email} />
            <Row label="Title" value={user.title} />
            <Row label="Access" value={<AP_Badge tone="blue">{ROLE_LABELS[user.role]}</AP_Badge>} />
            <Row label="Time zone" value={zoneLabel(user.timezone)} />
          </dl>
          {!user.mustChangePassword && (
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              Edit your phone, photo and time zone on{" "}
              <Link to={`/people/${user.id}/edit`} className="font-medium text-brand-600 hover:underline">
                your profile
              </Link>
              .
            </p>
          )}
        </AP_Card>
        <AP_Card>
          <AP_CardHeader title="Change password" />
          <form onSubmit={onSubmit} className="space-y-4 px-5 py-4">
            <AP_Field label="Current password">
              <AP_PasswordInput name="current" autoComplete="current-password" required />
            </AP_Field>
            <AP_Field label="New password" hint="At least 10 characters, with letters and numbers.">
              <AP_PasswordInput name="next" autoComplete="new-password" required minLength={10} />
            </AP_Field>
            <AP_Field label="Confirm new password">
              <AP_PasswordInput name="confirm" autoComplete="new-password" required />
            </AP_Field>
            {done && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Password updated.</p>}
            <AP_Button type="submit" disabled={change.isPending}>
              {change.isPending ? "Saving…" : "Update password"}
            </AP_Button>
          </form>
        </AP_Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
