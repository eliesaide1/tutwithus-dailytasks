// Small helpers shared by screens.

/** Collect a <form>'s fields into a plain object (checkboxes -> boolean, multi-selects / repeated names -> arrays). */
export function formValues(form: HTMLFormElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const fd = new FormData(form);
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key).filter((v): v is string => typeof v === "string");
    const el = form.elements.namedItem(key);
    // A checkbox with an explicit value (value="<id>") is part of a list, even when only one exists.
    const isListCheckbox = el instanceof HTMLInputElement && el.type === "checkbox" && el.value !== "on";
    const isCheckbox = el instanceof HTMLInputElement && el.type === "checkbox" && !isListCheckbox;
    const isMulti = isListCheckbox || (el instanceof HTMLSelectElement && el.multiple) || el instanceof RadioNodeList;
    out[key] = isCheckbox ? all.length === 1 : isMulti || all.length > 1 ? all : all[0];
  }
  // Unchecked single checkboxes are absent from FormData: report them as false.
  for (const el of Array.from(form.elements)) {
    if (el instanceof HTMLInputElement && el.type === "checkbox" && el.name && !(el.name in out)) {
      const sameName = form.querySelectorAll(`input[type=checkbox][name="${CSS.escape(el.name)}"]`).length;
      out[el.name] = sameName > 1 || el.value !== "on" ? [] : false;
    }
  }
  return out;
}

/** Minutes -> hours with one decimal, e.g. 90 -> "1.5". */
export function hours(mins: number | null | undefined) {
  if (!mins) return "0";
  const h = mins / 60;
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

/** wa.me links need digits only. */
export function whatsappHref(number: string) {
  return `https://wa.me/${number.replace(/[^\d]/g, "")}`;
}

const TITLE_ABBREVIATIONS: Record<string, string> = {
  CEO: "Chief Executive Officer",
  CTO: "Chief Technology Officer",
  COO: "Chief Operating Officer",
  CMO: "Chief Marketing Officer",
  CFO: "Chief Financial Officer",
};

/** "CTO" -> "Chief Technology Officer"; other job titles are returned unchanged. */
export function fullTitle(title: string) {
  return TITLE_ABBREVIATIONS[title.trim().toUpperCase()] ?? title;
}

/** "Chief Technology Officer" -> "CTO" (short form for dropdowns); other titles unchanged. */
export function shortTitle(title: string) {
  const t = title.trim();
  const hit = Object.entries(TITLE_ABBREVIATIONS).find(([, full]) => full.toLowerCase() === t.toLowerCase());
  return hit ? hit[0] : t;
}

/** "Elie Saide (CTO)" — how people are listed in assignee dropdowns. */
export function personWithTitle(p: { name: string; title?: string | null }) {
  return p.title ? `${p.name} (${shortTitle(p.title)})` : p.name;
}
