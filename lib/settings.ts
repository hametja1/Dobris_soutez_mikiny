import { query } from "./db";
import type { Phase } from "./config";

export type Settings = {
  phase: Phase;
  submissionsUntil: Date | null;
  votingUntil: Date | null;
};

export async function getSettings(): Promise<Settings> {
  const rows = await query<{ phase: Phase; submissions_until: Date | null; voting_until: Date | null }>(
    "SELECT phase, submissions_until, voting_until FROM settings WHERE id = 1",
  );
  const row = rows[0];
  return {
    phase: row?.phase ?? "preparation",
    submissionsUntil: row?.submissions_until ?? null,
    votingUntil: row?.voting_until ?? null,
  };
}

/** Odevzdávat lze ve fázi „submissions“, a pokud je nastaven termín, jen do něj. */
export function isSubmittingOpen(s: Settings, now = new Date()): boolean {
  return s.phase === "submissions" && (!s.submissionsUntil || now <= s.submissionsUntil);
}

/** Hlasovat lze ve fázi „voting“, a pokud je nastaven termín, jen do něj. */
export function isVotingOpen(s: Settings, now = new Date()): boolean {
  return s.phase === "voting" && (!s.votingUntil || now <= s.votingUntil);
}

export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Prague",
  }).format(d);
}
