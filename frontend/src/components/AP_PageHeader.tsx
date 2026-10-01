import { type ReactNode } from "react";

export function AP_PageHeader({
  title,
  description,
  actions,
  count,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  count?: number;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-800">
          {title}
          {count !== undefined && <span className="ml-2 text-lg font-medium text-slate-400">({count})</span>}
        </h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
