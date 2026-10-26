// Outgoing email over SMTP (Titan business email, smtp.titan.email).
//
// Optional in exactly the way object storage is: with no SMTP_* variables set,
// isEmailConfigured() is false, nothing is sent, and every endpoint still works. A portal
// that refuses to approve a task because a mailbox password expired would be worse than
// one that quietly stops emailing.
//
// Sending never throws either. Approving a task is the real work; the email is a courtesy
// on top of an in-app notification that has already been written.
import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../Config/config";

let transport: Transporter | null = null;

export const isEmailConfigured = () => Boolean(config.smtp);

function transporter() {
  const s = config.smtp;
  if (!s) throw new Error("Email is not configured (SMTP_* environment variables).");
  transport ??= nodemailer.createTransport({
    host: s.host,
    port: s.port,
    // 465 is implicit TLS; 587 starts plain and upgrades with STARTTLS.
    secure: s.port === 465,
    auth: { user: s.user, pass: s.pass },
  });
  return transport;
}

export type Mail = {
  to: string | string[];
  subject: string;
  /** Plain-text body. The HTML part is generated from it, so write it readably. */
  text: string;
};

/**
 * Sends one message. Returns whether it went out, so callers can log without branching
 * on configuration themselves. Recipients that are empty are skipped rather than sent
 * to an empty address list.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  const to = (Array.isArray(mail.to) ? mail.to : [mail.to]).filter(Boolean);
  if (!to.length) return false;
  if (!isEmailConfigured()) return false;

  try {
    await transporter().sendMail({
      from: config.smtp!.from,
      to,
      subject: mail.subject,
      text: mail.text,
      html: htmlFrom(mail.text),
    });
    return true;
  } catch (e) {
    // Logged, never thrown: the action that triggered this has already succeeded.
    console.error(`Email "${mail.subject}" to ${to.join(", ")} failed:`, e);
    return false;
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Plain text -> a simple HTML part. Blank lines become paragraphs and bare URLs become
 * links, which is all these messages need; anything richer would be a template system
 * nobody asked for.
 */
function htmlFrom(text: string) {
  const paragraphs = escapeHtml(text)
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>'))
    .map((block) => `<p style="margin:0 0 14px">${block}</p>`)
    .join("");
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.55;color:#1e293b">${paragraphs}</div>`;
}
