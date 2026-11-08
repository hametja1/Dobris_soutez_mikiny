import Link from "next/link";
import { CONTEST, MAX_SUBMISSIONS_PER_AUTHOR, PHASE_LABELS } from "@/lib/config";
import { countSubmissions } from "@/lib/data";
import { formatDateTime, getSettings, isSubmittingOpen, isVotingOpen } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();
  const count = await countSubmissions();
  const submitting = isSubmittingOpen(settings);
  const voting = isVotingOpen(settings);

  return (
    <>
      <h1>{CONTEST.title}</h1>
      <p className="lead">
        Hledáme návrh potisku na střediskovou mikinu. Zapojit se může každý člen střediska – děti, roveři i
        vedoucí. Autor vítězného návrhu dostane {CONTEST.prize}.
      </p>

      <section className="card status" aria-live="polite">
        <div>
          <span className="muted small">Právě probíhá</span>
          <strong>{PHASE_LABELS[settings.phase]}</strong>
          {settings.phase === "submissions" && (
            <span className="muted small">
              Odevzdaných návrhů: {count}
              {settings.submissionsUntil && ` · návrhy přijímáme do ${formatDateTime(settings.submissionsUntil)}`}
            </span>
          )}
          {settings.phase === "voting" && settings.votingUntil && (
            <span className="muted small">Hlasovat lze do {formatDateTime(settings.votingUntil)}</span>
          )}
        </div>
        <div className="btn-row">
          {submitting && <Link className="btn" href="/odevzdat">Odevzdat návrh</Link>}
          {voting && <Link className="btn" href="/hlasovani">Jít hlasovat</Link>}
          {settings.phase === "results" && <Link className="btn" href="/vysledky">Zobrazit výsledky</Link>}
        </div>
      </section>

      <h2>Pravidla v kostce</h2>
      <div className="rules">
        <div className="card">
          <h3>Návrh</h3>
          <ul>
            <li>Nejvýše 3 barvy, ideální je jednobarevný potisk.</li>
            <li>Tisk sítotiskem nebo DTF, výšivka se nepoužije.</li>
            <li>Umístění: hruď, záda, rukáv nebo jejich kombinace.</li>
            <li>Vyhněte se drobným detailům a tenkým linkám.</li>
            <li>Barvy spíš přírodní, ne křiklavé.</li>
          </ul>
        </div>
        <div className="card">
          <h3>Odevzdání</h3>
          <ul>
            <li>Obrázek (JPG, PNG, WEBP) nebo PDF, klidně fotka ruční kresby.</li>
            <li>Každý autor nejvýše {MAX_SUBMISSIONS_PER_AUTHOR} návrhy.</li>
            <li>Jméno a kontakt uvidí jen organizátor, v galerii je návrh jen pod číslem.</li>
            <li>Nic není povinné: logo, lilie ani název střediska.</li>
          </ul>
        </div>
        <div className="card">
          <h3>Hlasování</h3>
          <ul>
            <li>Každý má 2 hlasy pro a 1 hlas proti.</li>
            <li>Oba hlasy pro můžete dát i jednomu návrhu.</li>
            <li>Hlas proti je dobrovolný, jen spolu s oběma hlasy pro a jinému návrhu.</li>
            <li>Z jednoho zařízení lze hlasovat jednou. Hlasovat smíte i pro svůj návrh.</li>
            <li>Při rovnosti bodů rozhodne středisková rada.</li>
          </ul>
        </div>
      </div>

      <h2>Inspirace</h2>
      <p>
        Středisko spojuje oddíly z Dobříše a Nového Knína, krajinu Brd a odkaz prof. Miroslava Oliče, ředitele
        dobříšského gymnázia, který sám skautoval a učil i v Novém Kníně. Návrh ale prosíme nevažte na konkrétní
        oddíly – mikina má zůstat aktuální, i když se oddíly v čase mění.
      </p>
      <p className="muted small">
        Odevzdáním návrhu souhlasíte, že ho středisko smí použít a upravit pro svůj merch. Vítězný návrh se může
        s autorem ještě dopracovat.
      </p>
    </>
  );
}
