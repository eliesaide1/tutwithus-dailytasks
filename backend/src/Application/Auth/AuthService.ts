// Sign-in and password management.
import { z } from "zod";
import { User, type UserDoc } from "../../Model";
import { HttpError } from "../Common/errors";
import { parse } from "../Common/validation";
import { permissionsOf } from "../Common/permissions";
import { logActivity } from "../Common/activity";
import { hashPassword, verifyPassword } from "../../Infrastructure/Security/password";

/** Public shape of the signed-in user, including permission flags for the UI. */
export function sessionUser(u: UserDoc) {
  return {
    id: u.id as string,
    email: u.email,
    name: u.name,
    title: u.title,
    role: u.role,
    avatarUrl: u.avatarUrl ?? null,
    timezone: u.timezone,
    mustChangePassword: u.mustChangePassword,
    department: u.department ? String(u.department) : null,
    permissions: permissionsOf(u),
  };
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your email."),
  password: z.string().min(1, "Enter your password."),
});

/** Checks the credentials and records the sign-in. Returns the user; the controller issues the session. */
export async function login(input: unknown) {
  const { email, password } = parse(loginSchema, input);
  const user = await User.findOne({ email });
  const ok = user && user.active && (await verifyPassword(password, user.passwordHash));
  if (!ok) throw new HttpError(401, "Incorrect email or password.", "BAD_CREDENTIALS");

  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z
      .string()
      .min(10, "Use at least 10 characters.")
      .regex(/[A-Za-z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "The new passwords don't match." })
  .refine((v) => v.next !== v.current, { message: "Choose a password different from the current one." });

export async function changePassword(user: UserDoc, input: unknown) {
  const body = parse(passwordSchema, input);
  if (!(await verifyPassword(body.current, user.passwordHash))) {
    throw new HttpError(400, "Your current password is incorrect.");
  }
  user.passwordHash = await hashPassword(body.next);
  user.mustChangePassword = false;
  await user.save();
  await logActivity({ actor: user.id, entity: "User", entityId: user.id, action: "updated", summary: "changed their password" });
  return sessionUser(user);
}
