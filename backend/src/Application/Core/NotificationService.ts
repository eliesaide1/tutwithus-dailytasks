// In-app notifications for the signed-in user.
import { Notification, type UserDoc } from "../../Model";
import { notFound } from "../Common/errors";
import { isId } from "../../Infrastructure/Database/database";

export const unreadCount = (user: UserDoc) => Notification.countDocuments({ user: user.id, read: false });

export const listNotifications = (user: UserDoc) => Notification.find({ user: user.id }).sort({ createdAt: -1 }).limit(100);

export async function markRead(user: UserDoc, id: string) {
  if (!isId(id)) throw notFound();
  const n = await Notification.findOneAndUpdate({ _id: id, user: user.id }, { read: true }, { new: true });
  if (!n) throw notFound();
  return n;
}

export async function markAllRead(user: UserDoc) {
  await Notification.updateMany({ user: user.id, read: false }, { read: true });
}
