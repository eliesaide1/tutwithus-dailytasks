// Stateless session: a signed JWT in an httpOnly cookie.
import type { CookieOptions } from "express";
import { SignJWT, jwtVerify } from "jose";
import { config } from "../Config/config";

export const SESSION_COOKIE = "twu_session";
const SESSION_DAYS = 14;
const key = new TextEncoder().encode(config.jwtSecret);

export async function signSession(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key);
}

export async function verifySession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? { userId: payload.sub, issuedAt: payload.iat ?? 0 } : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: config.isProd,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
};
