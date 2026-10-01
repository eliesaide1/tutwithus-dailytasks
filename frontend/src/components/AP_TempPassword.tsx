import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Shows a one-time temporary password with a copy button. */
export function AP_TempPassword({ message, email, password }: { message: string; email: string; password: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="font-semibold text-emerald-700">{message}</p>
      <p className="mt-1 text-sm text-slate-600">
        Share these sign-in details privately. The password is shown only once and must be changed at first sign-in.
      </p>
      <div className="mt-4 rounded-lg bg-slate-50 p-4 font-mono text-sm ring-1 ring-slate-200">
        <p>
          <span className="text-slate-500">Email: </span>
          {email}
        </p>
        <p className="mt-1 flex items-center gap-2">
          <span className="text-slate-500">Password: </span>
          <span className="font-semibold">{password}</span>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(`Email: ${email}\nTemporary password: ${password}`);
              setCopied(true);
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 font-sans text-xs text-brand-700 hover:bg-brand-50"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </p>
      </div>
    </div>
  );
}
