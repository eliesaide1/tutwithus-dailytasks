import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { LoginService } from "@/Shared/SharedService";
import { useMeQuery, useSetMe } from "@/hooks/useAuth";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { AP_Logo } from "@/components/AP_Logo";
import { AP_Button } from "@/components/AP_Button";
import { AP_Field } from "@/components/AP_Field";
import { AP_Input } from "@/components/AP_Input";
import { AP_PasswordInput } from "@/components/AP_PasswordInput";

export default function LoginScreen() {
  useDocumentTitle("Sign in");
  const { data: current } = useMeQuery();
  const setMe = useSetMe();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [pending, setPending] = useState(false);

  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (current) return <Navigate to={current.mustChangePassword ? "/account?first=1" : safeNext} replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    try {
      const { user } = await LoginService({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
      setMe(user);
      navigate(user.mustChangePassword ? "/account?first=1" : safeNext, { replace: true });
    } catch {
      // Wrong email/password or server down: SharedService already showed the alert.
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen">
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-800 p-12 text-white lg:flex">
        <AP_Logo inverted />
        <div>
          <p className="text-4xl leading-tight font-bold">
            The right team
            <br />
            makes the <span className="text-accent-400">difference.</span>
          </p>
          <p className="mt-4 max-w-md text-brand-100">
            Tasks, schedules and the org chart in one place, without sending PDFs around.
          </p>
        </div>
        <p className="text-xs text-brand-200">TutWithUs · Internal team portal</p>
        <div className="absolute -right-24 -bottom-24 size-96 rounded-full bg-accent-500/10" />
      </section>
      <section className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <AP_Logo />
          </div>
          <h1 className="text-2xl font-bold text-brand-800">Sign in</h1>
          <p className="mt-1 mb-6 text-sm text-slate-500">Use the account your admin created for you.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <AP_Field label="Email">
              <AP_Input name="email" type="email" autoComplete="email" required autoFocus />
            </AP_Field>
            <AP_Field label="Password">
              <AP_PasswordInput name="password" autoComplete="current-password" required />
            </AP_Field>
            <AP_Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </AP_Button>
          </form>
        </div>
      </section>
    </main>
  );
}
