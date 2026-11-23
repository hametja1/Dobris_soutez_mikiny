import Link from "next/link";
import { listPublicSubmissions } from "@/lib/data";
import { getSettings, isSubmittingOpen } from "@/lib/settings";
import SubmissionGallery from "./SubmissionGallery";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const settings = await getSettings();

  if (settings.phase === "preparation") {
    return (
      <>
        <h1>Návrhy</h1>
        <div className="notice">
          <p>Soutěž ještě nebyla zahájena. Odevzdané návrhy tu uvidíte, jakmile začne odevzdávání.</p>
        </div>
      </>
    );
  }

  const submissions = await listPublicSubmissions();

  return (
    <>
      <h1>Návrhy</h1>
      <p className="lead">
        Návrhy, které už se do soutěže přihlásily. Autory neuvádíme, každý návrh má jen své číslo.
        {settings.phase === "voting" && (
          <>
            {" "}
            <Link href="/hlasovani">Hlasovat můžete na stránce Hlasování.</Link>
          </>
        )}
      </p>
      {submissions.length === 0 ? (
        <div className="notice">
          <p>Zatím nikdo žádný návrh neodevzdal.</p>
          {isSubmittingOpen(settings) && <Link href="/odevzdat">Buďte první – odevzdat návrh.</Link>}
        </div>
      ) : (
        <SubmissionGallery submissions={submissions} />
      )}
    </>
  );
}
