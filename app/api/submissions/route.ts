import { NextResponse } from "next/server";
import { ALLOWED_TYPES, LIMITS, MAX_FILE_BYTES, MAX_SUBMISSIONS_PER_AUTHOR, MAX_SUBMISSIONS_PER_IP_HOUR, MAX_SUBMISSIONS_TOTAL, TROOPS } from "@/lib/config";
import { authorKey, countByAuthor, countAllSubmissions, createSubmission } from "@/lib/data";
import { clientKey, countRecent, recordEvent } from "@/lib/ratelimit";
import { sanitizeUpload } from "@/lib/sanitize";
import { getSettings, isSubmittingOpen } from "@/lib/settings";
import { deleteFile, saveFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function text(form: FormData, key: string, max: number): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const settings = await getSettings();
  if (!isSubmittingOpen(settings)) return fail("Odevzdávání návrhů teď není otevřené.", 403);

  // Ochrana proti zahlcení: nejvýše N nahrání za hodinu z jedné adresy a strop pro celou soutěž.
  const ipKey = await clientKey();
  if ((await countRecent("submission", ipKey, 60)) >= MAX_SUBMISSIONS_PER_IP_HOUR) {
    return fail("Z tohoto připojení bylo odesláno příliš mnoho návrhů. Zkuste to prosím později.", 429);
  }
  if ((await countAllSubmissions()) >= MAX_SUBMISSIONS_TOTAL) {
    return fail("Soutěž už dosáhla maximálního počtu návrhů. Ozvěte se prosím organizátorovi.", 403);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Soubor je příliš velký nebo se nepodařilo odeslat formulář.");
  }

  const authorName = text(form, "authorName", LIMITS.name);
  const troop = text(form, "troop", 60);
  const contact = text(form, "contact", LIMITS.contact);
  const description = text(form, "description", LIMITS.description) || null;
  const consent = form.get("consent") === "on";
  const file = form.get("file");

  if (authorName.length < 3) return fail("Vyplňte prosím jméno a příjmení.");
  if (!(TROOPS as readonly string[]).includes(troop)) return fail("Vyberte prosím oddíl.");
  if (contact.length < 5) return fail("Vyplňte prosím kontakt (e-mail nebo telefon).");
  if (!consent) return fail("Pro odevzdání je potřeba souhlasit s pravidly soutěže.");
  if (!(file instanceof File) || file.size === 0) return fail("Přiložte prosím soubor s návrhem.");

  if (file.size > MAX_FILE_BYTES) return fail("Soubor je příliš velký, maximum je 4 MB.");
  // Skutečný typ podle obsahu souboru + odstranění metadat (GPS, jméno autora…).
  const clean = await sanitizeUpload(new Uint8Array(await file.arrayBuffer()));
  if (!clean) return fail("Nahrajte prosím obrázek (JPG, PNG, WEBP) nebo PDF bez hesla.");
  const extension = ALLOWED_TYPES[clean.type];

  const key = authorKey(authorName);
  const used = await countByAuthor(key);
  if (used >= MAX_SUBMISSIONS_PER_AUTHOR) {
    return fail(`Pod tímto jménem už je odevzdáno ${MAX_SUBMISSIONS_PER_AUTHOR} návrhů, víc není možné.`);
  }

  const fileUrl = await saveFile(clean.data, clean.type, extension);
  try {
    const number = await createSubmission({ authorName, troop, contact, description, fileUrl, contentType: clean.type });
    await recordEvent("submission", ipKey);
    return NextResponse.json({ ok: true, number, remaining: MAX_SUBMISSIONS_PER_AUTHOR - used - 1 });
  } catch (err) {
    console.error(err);
    await deleteFile(fileUrl);
    return fail("Návrh se nepodařilo uložit, zkuste to prosím znovu.", 500);
  }
}
