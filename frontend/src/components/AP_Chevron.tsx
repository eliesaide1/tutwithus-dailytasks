/**
 * The open/closed arrow on a <details> row: points right when collapsed, down when open.
 *
 * Written as an inline SVG rather than a lucide icon so its size is fixed by the width
 * and height attributes — a flex row can't stretch it into a line if a utility class
 * fails to apply.
 *
 * Put `className="group"` on the <details> and this follows its state on its own, with
 * no React state to keep in sync.
 */
export function AP_Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 text-slate-400 transition-[rotate] duration-150 group-open:rotate-90 ${className}`}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
