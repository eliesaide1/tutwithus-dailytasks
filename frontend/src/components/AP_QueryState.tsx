import { type ReactNode } from "react";
import { AP_Spinner } from "./AP_Spinner";

/** Standard loading / error / empty wrapper for a react-query result. */
export function AP_QueryState({
  isLoading,
  error,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  children: ReactNode;
}) {
  if (isLoading)
    return (
      <div className="flex justify-center py-16">
        <AP_Spinner className="size-7" />
      </div>
    );
  // The reason was already shown in the alert by SharedService; keep a quiet placeholder here.
  if (error)
    return (
      <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
        This couldn&apos;t be loaded.{" "}
        <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">
          Try again
        </button>
      </div>
    );
  return <>{children}</>;
}
