// Team-wide announcements. Writes are restricted to managers by the controller.
import { z } from "zod";
import { Announcement, Notification, User, type UserDoc } from "../../Model";
import { notFound } from "../Common/errors";
import { parse } from "../Common/validation";
import { logActivity } from "../Common/activity";
import { isId } from "../../Infrastructure/Database/database";

export const listAnnouncements = () => Announcement.find().sort({ pinned: -1, createdAt: -1 }).populate("author", "name title avatarUrl");

const schema = z.object({
  title: z.string().trim().min(3, "Add a title.").max(160),
  body: z.string().trim().min(3, "Write the announcement.").max(5000),
  pinned: z.boolean().optional().default(false),
  notifyAll: z.boolean().optional().default(false),
});

export async function createAnnouncement(user: UserDoc, input: unknown) {
  const { title, body, pinned, notifyAll } = parse(schema, input);
  const a = await Announcement.create({ title, body, pinned, author: user._id });
  if (notifyAll) {
    const people = await User.find({ active: true, _id: { $ne: user._id } }).select("_id");
    await Notification.insertMany(people.map((p) => ({ user: p._id, title: `Announcement: ${title}`, link: "/announcements" })));
  }
  await logActivity({ actor: user.id, entity: "Announcement", entityId: a.id, action: "created", summary: `posted "${title}"`, link: "/announcements" });
  return a;
}

export async function togglePin(id: string) {
  if (!isId(id)) throw notFound();
  const a = await Announcement.findById(id);
  if (!a) throw notFound();
  a.pinned = !a.pinned;
  await a.save();
  return a;
}

export async function deleteAnnouncement(user: UserDoc, id: string) {
  if (!isId(id)) throw notFound();
  const a = await Announcement.findByIdAndDelete(id);
  if (!a) throw notFound();
  await logActivity({ actor: user.id, entity: "Announcement", entityId: a.id, action: "deleted", summary: `deleted announcement "${a.title}"` });
}
