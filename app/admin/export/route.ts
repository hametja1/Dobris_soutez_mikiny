import { isAdmin } from "@/lib/auth";
import { getResults, listAllSubmissions } from "@/lib/data";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV pro Excel (středník jako oddělovač, UTF-8 s BOM, aby se správně zobrazila diakritika). */
export async function GET() {
  if (!(await isAdmin())) return new Response("Nepřihlášen", { status: 401 });

  const [submissions, results] = await Promise.all([listAllSubmissions(), getResults(true)]);
  const scores = new Map(results.map((r) => [r.id, r]));

  const header = ["Číslo", "Jméno", "Oddíl", "Kontakt", "Popis", "Skrytý", "Pro", "Proti", "Body", "Soubor", "Odevzdáno"];
  const lines = submissions.map((s) => {
    const r = scores.get(s.id);
    return [
      s.number,
      s.authorName,
      s.troop,
      s.contact,
      s.description,
      s.hidden ? "ano" : "ne",
      r?.plus ?? 0,
      r?.minus ?? 0,
      r?.score ?? 0,
      s.fileUrl,
      s.createdAt.toISOString(),
    ]
      .map(csvCell)
      .join(";");
  });

  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="soutez-mikiny.csv"',
    },
  });
}
