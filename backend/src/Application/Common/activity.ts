import { Activity, Notification } from "../../Model";

type Ref = { toString(): string } | string | null | undefined;

/** Record an entry in the activity feed shown on the dashboard. */
export async function logActivity(input: {
  actor: Ref;
  entity: string;
  entityId: string | number | { toString(): string };
  action: string;
  summary: string;
  link?: string;
}) {
  await Activity.create({ ...input, actor: input.actor ?? null, entityId: String(input.entityId) });
}

/** Send an in-app notification. Skips notifying people about their own actions. */
export async function notify(input: { user: Ref; actor?: Ref; title: string; body?: string; link?: string }) {
  if (!input.user || (input.actor && String(input.user) === String(input.actor))) return;
  await Notification.create({ user: input.user, title: input.title, body: input.body, link: input.link });
}
