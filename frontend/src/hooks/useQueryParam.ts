import { useSearchParams } from "react-router";

/** Read/write a single search param (e.g. ?week=, ?user=). Setting "" removes it. */
export function useQueryParam(name: string, fallback = "") {
  const [params, setParams] = useSearchParams();
  const value = params.get(name) ?? fallback;
  const set = (v: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v) next.set(name, v);
        else next.delete(name);
        return next;
      },
      { replace: true },
    );
  return [value, set] as const;
}
