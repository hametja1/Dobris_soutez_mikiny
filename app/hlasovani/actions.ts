"use server";

import { cookies } from "next/headers";
import { listPublicSubmissions, saveVote, validateVote, hasVoted } from "@/lib/data";
import { getSettings, isVotingOpen } from "@/lib/settings";

const VOTER_COOKIE = "voter_id";

export type VoteResult = { ok: true } | { ok: false; error: string; alreadyVoted?: boolean };

/**
 * Uloží hlas. Zařízení se pozná podle náhodného ID, které si prohlížeč uloží
 * do localStorage a zároveň do cookie. Je to ochrana proti omylu, ne proti podvodu.
 */
export async function castVote(input: {
  deviceId: string;
  plus: [number, number];
  minus: number | null;
}): Promise<VoteResult> {
  const settings = await getSettings();
  if (!isVotingOpen(settings)) return { ok: false, error: "Hlasování teď neprobíhá." };

  const jar = await cookies();
  const cookieId = jar.get(VOTER_COOKIE)?.value;
  const clientId = typeof input.deviceId === "string" && /^[a-zA-Z0-9-]{16,64}$/.test(input.deviceId) ? input.deviceId : null;
  const deviceId = cookieId ?? clientId;
  if (!deviceId) return { ok: false, error: "Nepodařilo se rozpoznat zařízení, obnovte prosím stránku." };

  if (await hasVoted(deviceId)) {
    return { ok: false, error: "Z tohoto zařízení už byl hlas odeslán.", alreadyVoted: true };
  }

  const submissions = await listPublicSubmissions();
  const vote = {
    plus: [Number(input.plus?.[0]), Number(input.plus?.[1])] as [number, number],
    minus: input.minus === null || input.minus === undefined ? null : Number(input.minus),
  };
  const error = validateVote(vote, new Set(submissions.map((s) => s.id)));
  if (error) return { ok: false, error };

  const saved = await saveVote(deviceId, vote);
  jar.set(VOTER_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  if (!saved) return { ok: false, error: "Z tohoto zařízení už byl hlas odeslán.", alreadyVoted: true };
  return { ok: true };
}
