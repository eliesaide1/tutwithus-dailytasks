/** A small labelled number on the profile's Work card. */
export function AP_ProfileStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-semibold ${tone ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}
