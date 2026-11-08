/**
 * Nastavení soutěže. Tady se dá upravit vše, co se nemění za běhu
 * (texty, oddíly, limity). Fázi soutěže a termíny přepíná správce v administraci.
 */

export const CONTEST = {
  title: "Soutěž o návrh střediskové mikiny",
  organization: "Středisko prof. Oliče Dobříš",
  prize: "mikinu zdarma", // ve 4. pádě: „dostane …“
};

/** Oddíly, ze kterých si autor vybírá. Poslední položka je pro ostatní. */
export const TROOPS = [
  "Zlatý list",
  "Minnehaha",
  "Koťata",
  "Dráčata",
  "Lampyris",
  "Jiný / vedoucí střediska",
] as const;

/** Kolik návrhů smí odevzdat jeden autor (počítáno podle jména). */
export const MAX_SUBMISSIONS_PER_AUTHOR = 3;

/** Ochrana proti zahlcení otevřeného formuláře. */
export const MAX_SUBMISSIONS_PER_IP_HOUR = 10;
export const MAX_SUBMISSIONS_TOTAL = 300;

/** Max. velikost souboru po případném zmenšení v prohlížeči (Vercel má limit 4,5 MB na požadavek). */
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Délky textových polí. */
export const LIMITS = {
  name: 80,
  contact: 120,
  description: 500,
};

export type Phase = "preparation" | "submissions" | "voting" | "results";

export const PHASE_LABELS: Record<Phase, string> = {
  preparation: "Příprava (soutěž zatím neběží)",
  submissions: "Odevzdávání návrhů",
  voting: "Hlasování",
  results: "Výsledky",
};
