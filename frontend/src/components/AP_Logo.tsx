// TutWithUs wordmark: graduation cap over a play triangle, navy + yellow.
export function AP_LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 6 2 15l22 9 22-9z" fill="#0b2f6b" />
      <path d="M12 21v8c0 2 5 5 12 5s12-3 12-5v-8l-12 5z" fill="#0b2f6b" opacity=".85" />
      <path d="M17 24v20l17-10z" fill="#f5bd1f" />
      <rect x="5" y="16" width="2" height="14" fill="#0b2f6b" />
    </svg>
  );
}

export function AP_Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <AP_LogoMark />
      <span className={`text-lg font-extrabold tracking-tight ${inverted ? "text-white" : "text-brand-700"}`}>
        Tut<span className="font-medium">With</span>
        <span className="text-accent-500">Us</span>
      </span>
    </span>
  );
}
