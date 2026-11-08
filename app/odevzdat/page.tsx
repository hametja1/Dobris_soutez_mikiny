import Link from "next/link";
import { MAX_SUBMISSIONS_PER_AUTHOR, TROOPS } from "@/lib/config";
import { formatDateTime, getSettings, isSubmittingOpen } from "@/lib/settings";
import SubmitForm from "./SubmitForm";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const settings = await getSettings();

  if (!isSubmittingOpen(settings)) {
    return (
      <>
        <h1>Odevzdání návrhu</h1>
        <div className="notice">
          {settings.phase === "preparation" && <p>Soutěž ještě nebyla zahájena. Odevzdávat bude možné brzy.</p>}
          {settings.phase === "submissions" && <p>Termín pro odevzdání návrhů už vypršel.</p>}
          {(settings.phase === "voting" || settings.phase === "results") && (
            <p>Odevzdávání návrhů je uzavřené.</p>
          )}
          <Link href="/">Zpět na pravidla</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Odevzdání návrhu</h1>
      <p className="lead">
        Každý autor může odevzdat nejvýše {MAX_SUBMISSIONS_PER_AUTHOR} návrhy. Jméno a kontakt uvidí jen
        organizátor, v galerii pro hlasování bude návrh jen pod číslem.
        {settings.submissionsUntil && ` Návrhy přijímáme do ${formatDateTime(settings.submissionsUntil)}.`}
      </p>
      <SubmitForm troops={[...TROOPS]} />
    </>
  );
}
