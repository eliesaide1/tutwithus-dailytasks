// Account administration (admins only — enforced by the controller).
import { z } from "zod";
import { Department, User, type UserDoc } from "../../Model";
import { isId } from "../../Infrastructure/Database/database";
import { generateTemporaryPassword, hashPassword } from "../../Infrastructure/Security/password";
import { HttpError, notFound } from "../Common/errors";
import { parse, zRef } from "../Common/validation";
import { logActivity } from "../Common/activity";
import { ROLES } from "../Shared/constants";
import { validZone, wouldCreateCycle } from "./helpers";

const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email")),
  title: z.string().trim().min(1, "Job title is required").max(120),
  role: z.enum(ROLES),
  department: zRef,
  manager: zRef,
  timezone: z.string().trim().min(1).refine(validZone, "Unknown time zone."),
  weeklyCapacityHours: z.coerce.number().min(0).max(80),
});

/** Remaining active admins other than `userId`. */
const otherActiveAdmins = (userId: string) => User.countDocuments({ role: "ADMIN", active: true, _id: { $ne: userId } });

async function checkRefs(data: { department: string | null }) {
  if (data.department && !(await Department.exists({ _id: data.department }))) throw new HttpError(400, "Unknown team.");
}

export function listUsers() {
  return User.find()
    .sort({ active: -1, name: 1 })
    .select("name email title role avatarUrl active mustChangePassword lastLoginAt department")
    .populate("department", "name");
}

export async function getUser(id: string) {
  if (!isId(id)) throw notFound("User not found.");
  const user = await User.findById(id);
  if (!user) throw notFound("User not found.");
  return user;
}

/** Creates the account; the temporary password is only ever returned here, once. */
export async function createUser(actor: UserDoc, input: unknown) {
  const { weeklyCapacityHours, ...data } = parse(accountSchema, input);
  await checkRefs(data);
  if (await User.exists({ email: data.email })) throw new HttpError(409, "An account with that email already exists.");

  const password = generateTemporaryPassword();
  const user = await User.create({
    ...data,
    weeklyCapacityMins: Math.round(weeklyCapacityHours * 60),
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
  });
  await logActivity({
    actor: actor.id,
    entity: "User",
    entityId: user.id,
    action: "created",
    summary: `created an account for ${user.name} (${user.title})`,
    link: `/people/${user.id}`,
  });
  return { user, tempPassword: password };
}

export async function updateUser(actor: UserDoc, id: string, input: unknown) {
  if (!isId(id)) throw notFound("User not found.");
  const { weeklyCapacityHours, ...data } = parse(accountSchema, input);
  await checkRefs(data);

  const user = await User.findById(id);
  if (!user) throw notFound("User not found.");
  if (await User.exists({ email: data.email, _id: { $ne: id } })) throw new HttpError(409, "Another account already uses that email.");
  if (user.role === "ADMIN" && data.role !== "ADMIN" && user.active && (await otherActiveAdmins(id)) === 0) {
    throw new HttpError(400, "This is the last active admin. Make someone else an admin first.");
  }
  if (await wouldCreateCycle(id, data.manager)) {
    throw new HttpError(400, "That manager reports to this person (directly or indirectly). Pick someone else.");
  }

  const roleChanged = user.role !== data.role;
  Object.assign(user, data, { weeklyCapacityMins: Math.round(weeklyCapacityHours * 60) });
  await user.save();
  await logActivity({
    actor: actor.id,
    entity: "User",
    entityId: id,
    action: "updated",
    summary: roleChanged ? `changed ${user.name}'s role to ${user.role}` : `updated ${user.name}'s account`,
    link: `/people/${id}`,
  });
  return user;
}

export async function resetPassword(actor: UserDoc, id: string) {
  if (!isId(id)) throw notFound("User not found.");
  const password = generateTemporaryPassword();
  const user = await User.findByIdAndUpdate(id, { passwordHash: await hashPassword(password), mustChangePassword: true }, { new: true });
  if (!user) throw notFound("User not found.");
  await logActivity({
    actor: actor.id,
    entity: "User",
    entityId: user.id,
    action: "updated",
    summary: `reset ${user.name}'s password`,
    link: `/people/${user.id}`,
  });
  return { email: user.email, tempPassword: password };
}

export async function setActive(actor: UserDoc, id: string, input: unknown) {
  if (!isId(id)) throw notFound("User not found.");
  const { active } = parse(z.object({ active: z.boolean() }), input);
  if (!active && id === actor.id) throw new HttpError(400, "You cannot deactivate your own account.");
  const user = await User.findById(id);
  if (!user) throw notFound("User not found.");
  if (!active && user.role === "ADMIN" && (await otherActiveAdmins(id)) === 0) {
    throw new HttpError(400, "This is the last active admin and cannot be deactivated.");
  }
  user.active = active;
  await user.save();
  await logActivity({
    actor: actor.id,
    entity: "User",
    entityId: id,
    action: active ? "reactivated" : "deactivated",
    summary: `${active ? "reactivated" : "deactivated"} ${user.name}'s account`,
    link: `/people/${id}`,
  });
  return { user, message: active ? `${user.name} can sign in again.` : `${user.name} can no longer sign in.` };
}
