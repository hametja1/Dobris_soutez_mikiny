import Link from "next/link";
import { listPublicSubmissions } from "@/lib/data";
import { formatDateTime, getSettings, isVotingOpen } from "@/lib/settings";
import VotingBoard from "./VotingBoard";

export const dynamic = "force-dynamic";

export default async function VotingPage() {
  const settings = await getSettings();

  if (!isVotingOpen(settings)) {
    return (
      <>
        <h1>Hlasování</h1>
        <div className="notice">
          {(settings.phase === "preparation" || settings.phase === "submissions") && (
            <p>Hlasování ještě nezačalo. Galerie návrhů se zobrazí, až skončí odevzdávání.</p>
          )}
          {settings.phase === "voting" && <p>Termín hlasování už vypršel. Výsledky budou brzy zveřejněny.</p>}
          {settings.phase === "results" && (
            <p>
              Hlasování skončilo. <Link href="/vysledky">Podívejte se na výsledky.</Link>
            </p>
          )}
        </div>
      </>
    );
  }

  const submissions = await listPublicSubmissions();

  return (
    <>
      <h1>Hlasování</h1>
      <p className="lead">
        Dejte 2 hlasy pro – dvěma různým návrhům, nebo oba jednomu. Pokud chcete, přidejte i 1 hlas proti
        návrhu, který se vám nelíbí. Z jednoho zařízení lze hlasovat jen jednou.
        {settings.votingUntil && ` Hlasovat můžete do ${formatDateTime(settings.votingUntil)}.`}
      </p>
      {submissions.length < 2 ? (
        <div className="notice">V soutěži zatím nejsou alespoň dva návrhy.</div>
      ) : (
        <VotingBoard submissions={submissions} />
      )}
    </>
  );
}
