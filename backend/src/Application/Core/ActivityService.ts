// Activity feed: the team-wide log of who changed what.
import { Activity } from "../../Model";
import { isId } from "../../Infrastructure/Database/database";

export async function listActivity(filters: { entity?: unknown; user?: unknown }) {
  const filter: Record<string, unknown> = {};
  if (typeof filters.entity === "string" && filters.entity) filter.entity = filters.entity;
  if (isId(filters.user)) filter.actor = filters.user;
  const [items, entities] = await Promise.all([
    Activity.find(filter).sort({ createdAt: -1 }).limit(200).populate("actor", "name avatarUrl").lean(),
    Activity.distinct("entity"),
  ]);
  return { items: items.map(toActivityRow), entities: entities.sort() };
}

type ActivityLean = {
  _id: unknown;
  summary: string;
  link?: string | null;
  entity: string;
  createdAt: Date;
  actor?: unknown;
};

export function toActivityRow(a: ActivityLean) {
  const actor = a.actor as { name: string; avatarUrl?: string } | null | undefined;
  return {
    id: String(a._id),
    summary: a.summary,
    link: a.link ?? null,
    entity: a.entity,
    createdAt: a.createdAt,
    actor: actor ? { name: actor.name, avatarUrl: actor.avatarUrl ?? null } : null,
  };
}
