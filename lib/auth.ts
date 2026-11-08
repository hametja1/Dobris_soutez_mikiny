import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jednoduché přihlášení správce jedním heslem (proměnná ADMIN_PASSWORD).
 * Cookie obsahuje podpis odvozený z hesla – změnou hesla se všichni odhlásí.
 */

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dní

function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.length >= 6 ? p : null;
}

function sessionToken(password: string): string {
  return createHmac("sha256", password).update("mikiny-admin-session-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isAdminConfigured(): boolean {
  return adminPassword() !== null;
}

export async function isAdmin(): Promise<boolean> {
  const password = adminPassword();
  if (!password) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  return Boolean(value && safeEqual(value, sessionToken(password)));
}

/** Pro stránky a akce správce: nepřihlášeného pošle na přihlášení. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/prihlaseni");
}

export async function login(candidate: string): Promise<boolean> {
  const password = adminPassword();
  if (!password || !safeEqual(candidate, password)) return false;
  (await cookies()).set(COOKIE, sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return true;
}

export async function logout(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
