"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { login, logout, requireAdmin } from "@/lib/auth";
import type { Phase } from "@/lib/config";
import { anonymizeAuthors, deleteAllVotes, deleteSubmission, setHidden } from "@/lib/data";
import { query } from "@/lib/db";
import { deleteFile } from "@/lib/storage";
import { pragueLocalToDate } from "@/lib/time";

const PHASES: Phase[] = ["preparation", "submissions", "voting", "results"];

function refreshAll() {
  revalidatePath("/", "layout");
}

export async function loginAction(formData: FormData) {
  const result = await login(String(formData.get("password") ?? "").slice(0, 200));
  redirect(result === "ok" ? "/admin" : `/admin/prihlaseni?chyba=${result === "blocked" ? 2 : 1}`);
}

export async function logoutAction() {
  await logout();
  redirect("/");
}

export async function updateSettingsAction(formData: FormData) {
  await requireAdmin();
  const phase = String(formData.get("phase")) as Phase;
  if (!PHASES.includes(phase)) return;
  const submissionsUntil = pragueLocalToDate(String(formData.get("submissionsUntil") ?? ""));
  const votingUntil = pragueLocalToDate(String(formData.get("votingUntil") ?? ""));
  await query("UPDATE settings SET phase = $1, submissions_until = $2, voting_until = $3 WHERE id = 1", [
    phase,
    submissionsUntil,
    votingUntil,
  ]);
  refreshAll();
  redirect("/admin?ulozeno=1");
}

export async function toggleHiddenAction(formData: FormData) {
  await requireAdmin();
  await setHidden(Number(formData.get("id")), formData.get("hidden") === "1");
  refreshAll();
}

export async function deleteSubmissionAction(formData: FormData) {
  await requireAdmin();
  const fileUrl = await deleteSubmission(Number(formData.get("id")));
  if (fileUrl) await deleteFile(fileUrl);
  refreshAll();
}

export async function deleteAllVotesAction() {
  await requireAdmin();
  await deleteAllVotes();
  refreshAll();
}

export async function anonymizeAction() {
  await requireAdmin();
  await anonymizeAuthors();
  refreshAll();
}
