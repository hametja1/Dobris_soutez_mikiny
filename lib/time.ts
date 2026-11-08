/** Převody mezi vstupem <input type="datetime-local"> (pražský čas) a Date. */

const TZ = "Europe/Prague";

function pragueOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - at.getTime();
}

/** "2026-12-01T18:00" (pražský čas) → Date, prázdný řetězec → null. */
export function pragueLocalToDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const naive = new Date(`${value}:00Z`);
  let result = new Date(naive.getTime() - pragueOffsetMs(naive));
  result = new Date(naive.getTime() - pragueOffsetMs(result)); // zpřesnění kolem změny času
  return result;
}

/** Date → "2026-12-01T18:00" v pražském čase pro předvyplnění formuláře. */
export function dateToPragueLocal(date: Date | null): string {
  if (!date) return "";
  const local = new Date(date.getTime() + pragueOffsetMs(date));
  return local.toISOString().slice(0, 16);
}
