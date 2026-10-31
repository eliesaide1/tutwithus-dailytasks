// How an email looks.
//
// Every message is described as the same handful of blocks — a heading, a line of
// explanation, maybe a quote, some facts, a list, a button — and both the HTML and the
// plain-text part are rendered from that one description. Writing the two by hand is how
// they drift apart, and the plain part is what phones fall back to.
//
// The HTML is deliberately old-fashioned: tables, inline styles, no stylesheet and no
// web fonts. Mail clients are not browsers — Outlook drops flexbox and grid, Gmail strips
// <style> blocks — so the layout has to survive on attributes a 1998 renderer understands.

export type Fact = { label: string; value: string };
export type Row = { title: string; meta?: string };

export type Blocks = {
  /** Big line at the top of the card. */
  heading: string;
  /** One sentence saying what happened and why this arrived. */
  intro: string;
  /** Somebody's words, shown apart from ours. */
  quote?: string;
  facts?: Fact[];
  listTitle?: string;
  list?: Row[];
  action?: { label: string; url: string };
  /** Small print under the button. */
  note?: string;
};

const BRAND = "#0b3b8c";
const INK = "#1e293b";
const MUTED = "#64748b";
const LINE = "#e2e8f0";
const WASH = "#f1f5f9";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The plain-text part. Also what a screen reader or a stripped-down client gets. */
export function renderText(b: Blocks) {
  const out = [b.intro];
  if (b.quote) out.push(`"${b.quote.trim()}"`);
  if (b.facts?.length) out.push(b.facts.map((f) => `${f.label}: ${f.value}`).join("\n"));
  if (b.list?.length) {
    out.push(`${b.listTitle ?? "Details"}:\n${b.list.map((r) => `  • ${r.title}${r.meta ? ` — ${r.meta}` : ""}`).join("\n")}`);
  }
  if (b.action) out.push(`${b.action.label}: ${b.action.url}`);
  if (b.note) out.push(b.note);
  return `${out.join("\n\n")}\n\n—\nTutWithUs Team Portal`;
}

export function renderHtml(b: Blocks) {
  const parts: string[] = [];

  parts.push(
    `<h1 style="margin:0 0 14px;font-size:18px;line-height:1.35;font-weight:700;color:${BRAND}">${esc(b.heading)}</h1>`,
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${INK}">${esc(b.intro)}</p>`,
  );

  if (b.quote) {
    parts.push(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px">` +
        `<tr><td style="border-left:3px solid ${BRAND};background:${WASH};padding:10px 14px;` +
        `font-size:14px;line-height:1.6;color:${INK}">${esc(b.quote.trim()).replace(/\n/g, "<br>")}</td></tr></table>`,
    );
  }

  if (b.facts?.length) {
    const rows = b.facts
      .map(
        (f) =>
          `<tr><td style="padding:3px 12px 3px 0;font-size:13px;color:${MUTED};white-space:nowrap">${esc(f.label)}</td>` +
          `<td style="padding:3px 0;font-size:13px;color:${INK};font-weight:600">${esc(f.value)}</td></tr>`,
      )
      .join("");
    parts.push(`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">${rows}</table>`);
  }

  if (b.list?.length) {
    const rows = b.list
      .map(
        (r, i) =>
          `<tr><td style="padding:9px 0;${i ? `border-top:1px solid ${LINE};` : ""}font-size:14px;line-height:1.5;color:${INK}">` +
          `${esc(r.title)}${r.meta ? `<br><span style="font-size:12px;color:${MUTED}">${esc(r.meta)}</span>` : ""}` +
          `</td></tr>`,
      )
      .join("");
    parts.push(
      `<p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${MUTED}">` +
        `${esc(b.listTitle ?? "Details")}</p>` +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px">${rows}</table>`,
    );
  }

  if (b.action) {
    // A table-wrapped anchor, because Outlook ignores padding on an inline element.
    parts.push(
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 6px"><tr>` +
        `<td style="border-radius:8px;background:${BRAND}">` +
        `<a href="${esc(b.action.url)}" style="display:inline-block;padding:11px 20px;font-size:14px;font-weight:600;` +
        `color:#ffffff;text-decoration:none">${esc(b.action.label)}</a></td></tr></table>` +
        `<p style="margin:0 0 4px;font-size:12px;color:${MUTED};word-break:break-all">${esc(b.action.url)}</p>`,
    );
  }

  if (b.note) parts.push(`<p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:${MUTED}">${esc(b.note)}</p>`);

  return (
    `<div style="margin:0;padding:24px 12px;background:${WASH}">` +
    `<table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">` +
    `<tr><td style="padding:0 0 12px;font-size:15px;font-weight:700;color:${BRAND};` +
    `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">TutWithUs</td></tr>` +
    `<tr><td style="background:#ffffff;border:1px solid ${LINE};border-radius:12px;padding:22px 24px;` +
    `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">${parts.join("")}</td></tr>` +
    `<tr><td style="padding:12px 2px 0;font-size:11px;line-height:1.5;color:${MUTED};` +
    `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">` +
    `Sent by the TutWithUs Team Portal because of something that happened on a request you are part of.</td></tr>` +
    `</table></div>`
  );
}
