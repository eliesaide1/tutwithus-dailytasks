import { useEffect, useRef, type ReactNode } from "react";
import { CircleAlert, X } from "lucide-react";
import type { AlertButton } from "@/Shared/SharedService";
import { AP_Button } from "./AP_Button";

/** Centered alert dialog with an optional title, a message and one or more buttons. */
export function AP_Alert({
  isVisible,
  hideAlert,
  title,
  buttons,
  children,
}: {
  isVisible: boolean;
  hideAlert: () => void;
  title?: string;
  buttons: AlertButton[];
  children: ReactNode;
}) {
  const firstButton = useRef<HTMLButtonElement>(null);
  const hasCancel = buttons.some((b) => b.title.toLowerCase() === "cancel");

  useEffect(() => {
    if (!isVisible) return;
    firstButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hideAlert();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isVisible, hideAlert]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && hideAlert()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title ? "ap-alert-title" : undefined}
        aria-describedby="ap-alert-message"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl ring-1 ring-slate-200"
      >
        {!hasCancel && (
          <button
            type="button"
            onClick={hideAlert}
            className="absolute top-3 right-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        )}
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <CircleAlert className="size-6" />
        </span>
        {title && (
          <h2 id="ap-alert-title" className="mt-3 text-lg font-semibold text-brand-800">
            {title}
          </h2>
        )}
        <div id="ap-alert-message" className={`${title ? "mt-1" : "mt-3"} text-sm whitespace-pre-line text-slate-700`}>
          {children}
        </div>
        <div className="mt-6 flex flex-col gap-2">
          {buttons.map((b, i) => (
            <AP_Button
              key={`${b.title}-${i}`}
              ref={i === 0 ? firstButton : undefined}
              variant={b.variant ?? (i === 0 ? "primary" : "secondary")}
              className="w-full"
              onClick={() => {
                b.press?.();
                hideAlert();
              }}
            >
              {b.title}
            </AP_Button>
          ))}
        </div>
      </div>
    </div>
  );
}
