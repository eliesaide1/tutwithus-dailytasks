// Weekly availability windows: each person edits their own; managers edit anyone's.
import { z } from "zod";
import { Availability, User, type UserDoc } from "../../Model";
import { isId } from "../../Infrastructure/Database/database";
import { badRequest, forbidden, notFound } from "../Common/errors";
import { parse } from "../Common/validation";
import { isManager } from "../Common/permissions";
import { logActivity, notify } from "../Common/activity";
import { AVAILABILITY_KINDS, DAYS } from "../Shared/constants";
import { parseMinute } from "../Shared/time";
import { zoneOptions } from "./ScheduleData";

/** "me" resolves to the acting user; others require manager rights. */
function resolveTarget(user: UserDoc, userParam: string) {
  const userId = userParam === "me" ? (user.id as string) : userParam;
  if (!isId(userId)) throw notFound("Person not found.");
  if (userId !== user.id && !isManager(user)) throw forbidden("You can only edit your own availability.");
  return userId;
}

export async function getAvailability(user: UserDoc, userParam: string) {
  const userId = resolveTarget(user, userParam);
  const target = await User.findById(userId).select("name title avatarUrl timezone");
  if (!target) throw notFound("Person not found.");
  const windows = await Availability.find({ user: userId }).sort({ dayOfWeek: 1, startMinute: 1 });
  const team = isManager(user) ? await User.find({ active: true }).sort({ name: 1 }).select("name") : [];
  return {
    user: target,
    zoneLabel: zoneOptions([target]).find((z) => z.value === target.timezone)?.label ?? target.timezone,
    windows,
    team,
  };
}

const windowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    kind: z.enum(AVAILABILITY_KINDS),
    start: z.string().optional().default(""),
    end: z.string().optional().default(""),
    note: z.string().trim().max(200).optional().nullable(),
  })
  .transform((w, ctx) => {
    if (w.kind === "OFF" || w.kind === "UNSPECIFIED") {
      return { dayOfWeek: w.dayOfWeek, kind: w.kind, startMinute: 0, endMinute: 0, note: w.note || null };
    }
    const start = parseMinute(w.start);
    const end = parseMinute(w.end);
    if (start === null || end === null || end <= start) {
      ctx.addIssue({ code: "custom", message: `${DAYS[w.dayOfWeek]}: each window needs a valid start and an end after it (HH:MM).` });
      return z.NEVER;
    }
    return { dayOfWeek: w.dayOfWeek, kind: w.kind, startMinute: start, endMinute: end, note: w.note || null };
  });

/** Replace all of a person's windows. Input: { windows: [{ dayOfWeek, kind, start, end, note }] } */
export async function replaceAvailability(user: UserDoc, userParam: string, input: unknown) {
  const userId = resolveTarget(user, userParam);
  const target = await User.findById(userId).select("name");
  if (!target) throw notFound("This person no longer exists.");

  const { windows } = parse(z.object({ windows: z.array(windowSchema).max(100) }), input);

  // Overlapping windows on the same day are almost always typos.
  const byDay = new Map<number, { startMinute: number; endMinute: number }[]>();
  for (const w of windows) {
    if (w.kind === "OFF" || w.kind === "UNSPECIFIED") continue;
    const list = byDay.get(w.dayOfWeek) ?? [];
    if (list.some((o) => w.startMinute < o.endMinute && o.startMinute < w.endMinute)) {
      throw badRequest(`${DAYS[w.dayOfWeek]}: windows overlap.`);
    }
    list.push(w);
    byDay.set(w.dayOfWeek, list);
  }

  await Availability.deleteMany({ user: userId });
  if (windows.length) await Availability.insertMany(windows.map((w) => ({ ...w, user: userId })));

  await logActivity({
    actor: user.id,
    entity: "User",
    entityId: userId,
    action: "availability",
    summary: userId === user.id ? "updated their availability" : `updated ${target.name}'s availability`,
    link: "/schedule?tab=availability",
  });
  if (userId !== user.id) {
    await notify({ user: userId, actor: user.id, title: `${user.name} updated your availability`, link: "/schedule/availability" });
  }
  return { windows: await Availability.find({ user: userId }).sort({ dayOfWeek: 1, startMinute: 1 }) };
}
