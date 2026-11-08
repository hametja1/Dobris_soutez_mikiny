import Link from "next/link";
import { getResults } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import ResultsList from "@/components/ResultsList";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const settings = await getSettings();

  if (settings.phase !== "results") {
    return (
      <>
        <h1>Výsledky</h1>
        <div className="notice">
          <p>Výsledky zveřejníme po skončení hlasování.</p>
          {settings.phase === "voting" && <Link href="/hlasovani">Ještě jste nehlasovali? Jít hlasovat.</Link>}
        </div>
      </>
    );
  }

  const results = await getResults();
  const winnerTied = results.length > 1 && results[0].tied;

  return (
    <>
      <h1>Výsledky</h1>
      <p className="lead">
        Body = hlasy pro minus hlasy proti.
        {winnerTied && " Na prvním místě je remíza – vítěze vybere středisková rada."}
      </p>
      <ResultsList results={results} />
    </>
  );
}
