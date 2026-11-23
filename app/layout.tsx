import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { CONTEST, type Phase } from "@/lib/config";
import { getSettings } from "@/lib/settings";
import "./globals.css";

export const metadata: Metadata = {
  title: CONTEST.title,
  description: `${CONTEST.title} – ${CONTEST.organization}`,
  robots: { index: false, follow: false },
};

// Menu závisí na aktuální fázi soutěže, proto se layout vykresluje při každém požadavku.
export const dynamic = "force-dynamic";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2d4a87" };

/** Fáze soutěže pro horní menu; když databáze neodpoví, ukážeme všechny odkazy. */
async function currentPhase(): Promise<Phase | null> {
  try {
    return (await getSettings()).phase;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Skryté stránky zůstávají dostupné na přímou adresu, jen nejsou v menu.
  const phase = await currentPhase();
  const showGallery = phase === null || phase === "submissions";
  const showSubmit = phase !== "voting" && phase !== "results";
  const showVoting = phase !== "submissions" && phase !== "results";

  return (
    <html lang="cs">
      <head>
        {/* Náhradní písmo, dokud nejsou v public/fonts nahrané fonty Junáka (viz app/globals.css). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;700&display=swap" />
      </head>
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="brand">
              <img src="/znak-strediska.png" alt="" width={53} height={58} />
              <span className="brand-text">
                Soutěž o návrh mikiny
                <small>{CONTEST.organization}</small>
              </span>
            </Link>
            <nav className="nav" aria-label="Hlavní navigace">
              <Link href="/">Pravidla</Link>
              {showGallery && <Link href="/navrhy">Návrhy</Link>}
              {showSubmit && <Link href="/odevzdat">Odevzdat návrh</Link>}
              {showVoting && <Link href="/hlasovani">Hlasování</Link>}
              <Link href="/vysledky">Výsledky</Link>
            </nav>
          </div>
        </header>
        <main>
          <div className="wrap">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="wrap">
            <img src="/logo-strediska.png" alt={`SKAUT – ${CONTEST.organization}`} width={86} height={110} />
            <span>Interní soutěž pro členy střediska</span>
            <Link href="/admin">Správa soutěže</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
