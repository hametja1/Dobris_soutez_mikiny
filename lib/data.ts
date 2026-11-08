import { query } from "./db";

/* ---------- Návrhy ---------- */

export type PublicSubmission = {
  id: number;
  number: number;
  fileUrl: string;
  contentType: string;
  description: string | null;
};

export type AdminSubmission = PublicSubmission & {
  authorName: string | null;
  troop: string | null;
  contact: string | null;
  hidden: boolean;
  createdAt: Date;
};

type SubmissionRow = {
  id: number;
  number: number;
  file_url: string;
  content_type: string;
  description: string | null;
  author_name: string | null;
  troop: string | null;
  contact: string | null;
  hidden: boolean;
  created_at: Date;
};

/** Normalizované jméno pro počítání návrhů: bez diakritiky, malá písmena, jedna mezera. */
export function authorKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function countByAuthor(key: string): Promise<number> {
  const rows = await query<{ n: string }>("SELECT count(*) AS n FROM submissions WHERE author_key = $1", [key]);
  return Number(rows[0]?.n ?? 0);
}

export async function createSubmission(input: {
  authorName: string;
  troop: string;
  contact: string;
  description: string | null;
  fileUrl: string;
  contentType: string;
}): Promise<number> {
  // Číslo návrhu = nejvyšší dosavadní + 1. Při souběhu dvou odevzdání zkusíme znovu.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const rows = await query<{ number: number }>(
        `INSERT INTO submissions (number, author_name, author_key, troop, contact, description, file_url, content_type)
         SELECT COALESCE(MAX(number), 0) + 1, $1, $2, $3, $4, $5, $6, $7 FROM submissions
         RETURNING number`,
        [input.authorName, authorKey(input.authorName), input.troop, input.contact, input.description, input.fileUrl, input.contentType],
      );
      return rows[0].number;
    } catch (err) {
      if ((err as { code?: string }).code !== "23505") throw err;
    }
  }
  throw new Error("Nepodařilo se přidělit číslo návrhu.");
}

function toPublic(r: SubmissionRow): PublicSubmission {
  return { id: r.id, number: r.number, fileUrl: r.file_url, contentType: r.content_type, description: r.description };
}

/** Veřejný seznam – bez skrytých návrhů a bez údajů o autorech. */
export async function listPublicSubmissions(): Promise<PublicSubmission[]> {
  const rows = await query<SubmissionRow>(
    "SELECT id, number, file_url, content_type, description FROM submissions WHERE NOT hidden ORDER BY number",
  );
  return rows.map(toPublic);
}

export async function listAllSubmissions(): Promise<AdminSubmission[]> {
  const rows = await query<SubmissionRow>("SELECT * FROM submissions ORDER BY number");
  return rows.map((r) => ({
    ...toPublic(r),
    authorName: r.author_name,
    troop: r.troop,
    contact: r.contact,
    hidden: r.hidden,
    createdAt: r.created_at,
  }));
}

/** Všechny návrhy včetně skrytých – pro strop počtu návrhů. */
export async function countAllSubmissions(): Promise<number> {
  const rows = await query<{ n: string }>("SELECT count(*) AS n FROM submissions");
  return Number(rows[0]?.n ?? 0);
}

export async function countSubmissions(): Promise<number> {
  const rows = await query<{ n: string }>("SELECT count(*) AS n FROM submissions WHERE NOT hidden");
  return Number(rows[0]?.n ?? 0);
}

export async function setHidden(id: number, hidden: boolean): Promise<void> {
  await query("UPDATE submissions SET hidden = $2 WHERE id = $1", [id, hidden]);
}

/** Smaže návrh a vrátí adresu jeho souboru (aby šel smazat i soubor). */
export async function deleteSubmission(id: number): Promise<string | null> {
  const rows = await query<{ file_url: string }>("DELETE FROM submissions WHERE id = $1 RETURNING file_url", [id]);
  return rows[0]?.file_url ?? null;
}

/** Po soutěži: smaže jména a kontakty všech autorů. */
export async function anonymizeAuthors(): Promise<void> {
  await query("UPDATE submissions SET author_name = NULL, contact = NULL, author_key = 'smazano-' || id");
}

/* ---------- Hlasy ---------- */

export type VoteInput = { plus: [number, number]; minus: number | null };

/** Ověří pravidla hlasování: 2 hlasy pro (mohou být stejnému návrhu), 1 volitelný proti jinému návrhu. */
export function validateVote(v: VoteInput, validIds: Set<number>): string | null {
  const [a, b] = v.plus;
  if (!validIds.has(a) || !validIds.has(b)) return "Vyberte prosím dva hlasy pro.";
  if (v.minus !== null) {
    if (!validIds.has(v.minus)) return "Hlas proti míří na neexistující návrh.";
    if (v.minus === a || v.minus === b) return "Hlas proti nemůže dostat návrh, kterému dáváte hlas pro.";
  }
  return null;
}

export async function hasVoted(deviceId: string): Promise<boolean> {
  const rows = await query("SELECT 1 FROM votes WHERE device_id = $1", [deviceId]);
  return rows.length > 0;
}

/** Uloží hlas. Vrátí false, pokud z tohoto zařízení už hlas existuje. */
export async function saveVote(deviceId: string, v: VoteInput): Promise<boolean> {
  const rows = await query(
    `INSERT INTO votes (device_id, plus1, plus2, minus) VALUES ($1, $2, $3, $4)
     ON CONFLICT (device_id) DO NOTHING RETURNING id`,
    [deviceId, v.plus[0], v.plus[1], v.minus],
  );
  return rows.length > 0;
}

export async function countVotes(): Promise<number> {
  const rows = await query<{ n: string }>("SELECT count(*) AS n FROM votes");
  return Number(rows[0]?.n ?? 0);
}

export async function deleteAllVotes(): Promise<void> {
  await query("DELETE FROM votes");
}

/* ---------- Výsledky ---------- */

export type ResultRow = PublicSubmission & {
  plus: number;
  minus: number;
  score: number;
  rank: number;
  tied: boolean;
  hidden: boolean;
};

export async function getResults(includeHidden = false): Promise<ResultRow[]> {
  const rows = await query<SubmissionRow & { plus: string; minus: string }>(
    `SELECT s.*,
       (SELECT count(*) FROM votes v WHERE v.plus1 = s.id) + (SELECT count(*) FROM votes v WHERE v.plus2 = s.id) AS plus,
       (SELECT count(*) FROM votes v WHERE v.minus = s.id) AS minus
     FROM submissions s
     ${includeHidden ? "" : "WHERE NOT s.hidden"}`,
  );
  const list = rows
    .map((r) => {
      const plus = Number(r.plus);
      const minus = Number(r.minus);
      return { ...toPublic(r), plus, minus, score: plus - minus, rank: 0, tied: false, hidden: r.hidden };
    })
    .sort((x, y) => y.score - x.score || y.plus - x.plus || x.number - y.number);

  // Pořadí: stejný počet bodů = stejné místo (remízu rozhoduje středisková rada).
  list.forEach((r, i) => {
    r.rank = i > 0 && list[i - 1].score === r.score ? list[i - 1].rank : i + 1;
  });
  const anyVotes = list.some((r) => r.plus > 0 || r.minus > 0);
  list.forEach((r) => {
    r.tied = anyVotes && r.rank === 1 && list.filter((o) => o.rank === 1).length > 1;
  });
  return list;
}
