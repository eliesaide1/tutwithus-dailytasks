import { AP_Button } from "./AP_Button";

/** Expand / collapse every <details> inside the element with `targetId`. */
export function AP_TreeToggle({ targetId }: { targetId: string }) {
  const toggle = (open: boolean) =>
    document.querySelectorAll<HTMLDetailsElement>(`#${targetId} details`).forEach((d) => (d.open = open));
  return (
    <div className="flex gap-1">
      <AP_Button type="button" variant="ghost" size="sm" onClick={() => toggle(true)}>
        Expand all
      </AP_Button>
      <AP_Button type="button" variant="ghost" size="sm" onClick={() => toggle(false)}>
        Collapse all
      </AP_Button>
    </div>
  );
}
