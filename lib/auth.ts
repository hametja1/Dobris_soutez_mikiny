import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { clearEvents, clientKey, countRecent, recordEvent } from "./ratelimit";

/**
 * Přihlášení správce jedním heslem (proměnná ADMIN_PASSWORD, alespoň 12 znaků).
 * Cookie nese čas vypršení a podpis odvozený z hesla – změnou hesla se všichni odhlásí,
 * ukradená cookie po 14 dnech přestane platit.
 * Neúspěšné pokusy se počítají: 5 za 15 minut z jedné adresy nebo 30 celkem → dočasné zablokování.
 */

const COOKIE = "admin_session";
const MAX_AGE_S = 60 * 60 * 24 * 14; // 14 dní
const MIN_PASSWORD = 12;
const WINDOW_MIN = 15;
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_TOTAL = 30;

function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.length >= MIN_PASSWORD ? p : null;
}

function sign(password: string, expires: number): string {
  return createHmac("sha256", password).update(`mikiny-admin-session-v2.${expires}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isAdminConfigured(): boolean {
  return adminPassword() !== null;
}

export const ADMIN_PASSWORD_MIN_LENGTH = MIN_PASSWORD;

export async function isAdmin(): Promise<boolean> {
  const password = adminPassword();
  if (!password) return false;
  const value = (await cookies()).get(COOKIE)?.value ?? "";
  const [expStr, sig] = value.split(".");
  const expires = Number(expStr);
  if (!sig || !Number.isFinite(expires) || expires < Date.now() / 1000) return false;
  return safeEqual(sig, sign(password, expires));
}

/** Pro stránky a akce správce: nepřihlášeného pošle na přihlášení. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/prihlaseni");
}

export type LoginResult = "ok" | "wrong" | "blocked";

export async function login(candidate: string): Promise<LoginResult> {
  const password = adminPassword();
  if (!password) return "wrong";

  const key = await clientKey();
  const [mine, total] = await Promise.all([
    countRecent("login-fail", key, WINDOW_MIN),
    countRecent("login-fail", null, WINDOW_MIN),
  ]);
  if (mine >= MAX_FAILS_PER_IP || total >= MAX_FAILS_TOTAL) return "blocked";

  if (!safeEqual(candidate, password)) {
    await recordEvent("login-fail", key);
    return "wrong";
  }

  await clearEvents("login-fail", key);
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  (await cookies()).set(COOKIE, `${expires}.${sign(password, expires)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
  return "ok";
}

export async function logout(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
