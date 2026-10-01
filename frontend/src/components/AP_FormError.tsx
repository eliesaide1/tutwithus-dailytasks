export function AP_FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{message}</p>;
}
