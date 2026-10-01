import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const ROUNDS = 10;

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** Readable one-time password for new accounts and resets, e.g. "Twu-k3Jd9xQa2m". */
export function generateTemporaryPassword() {
  return `Twu-${randomBytes(9).toString("base64url").slice(0, 10)}`;
}
