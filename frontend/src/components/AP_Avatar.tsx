import { cn, initials } from "@/Shared/format";

export function AP_Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) };
  if (src) {
    return <img src={src} alt={name} style={style} className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span
      style={style}
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
