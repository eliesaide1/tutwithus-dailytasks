/**
 * The open/closed arrow on a <details> row: points right when collapsed, down when open.
 *
 * Written as an inline SVG so its geometry comes from attributes, not utility classes.
 *
 * The rotation class is passed in rather than baked in, and must be a *named* group
 * (`group-open/req:rotate-90`). A bare `group-open:` matches any open `.group` ancestor,
 * so in a nested tree every arrow inherits its parents' open state and points down even
 * when its own row is shut.
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
      className={`shrink-0 text-slate-400 transition-[rotate] duration-150 ${className}`}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
