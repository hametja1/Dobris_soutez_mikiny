import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { query } from "./db";

/**
 * Jednoduché omezení četnosti (přihlášení správce, nahrávání návrhů).
 * Ukládá jen otisk (hash) IP adresy, ne adresu samotnou, a staré záznamy maže.
 */

export type RateKind = "login-fail" | "submission";

export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`mikiny-rate:${ip}`).digest("hex").slice(0, 32);
}

/** Počet událostí za posledních `minutes` minut – pro jednu adresu, nebo (key = null) celkem. */
export async function countRecent(kind: RateKind, key: string | null, minutes: number): Promise<number> {
  const rows = await query<{ n: string }>(
    `SELECT count(*) AS n FROM rate_events
     WHERE kind = $1 AND ($2::text IS NULL OR key = $2) AND at > now() - make_interval(mins => $3)`,
    [kind, key, minutes],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function recordEvent(kind: RateKind, key: string): Promise<void> {
  await query("INSERT INTO rate_events (kind, key) VALUES ($1, $2)", [kind, key]);
  if (Math.random() < 0.05) await query("DELETE FROM rate_events WHERE at < now() - interval '2 days'");
}

export async function clearEvents(kind: RateKind, key: string): Promise<void> {
  await query("DELETE FROM rate_events WHERE kind = $1 AND key = $2", [kind, key]);
}
