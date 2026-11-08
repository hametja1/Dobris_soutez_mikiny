import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PHASE_LABELS, type Phase } from "@/lib/config";
import { countVotes, getResults, listAllSubmissions } from "@/lib/data";
import { formatDateTime, getSettings } from "@/lib/settings";
import { dateToPragueLocal } from "@/lib/time";
import ConfirmButton from "@/components/ConfirmButton";
import ResultsList from "@/components/ResultsList";
import {
  anonymizeAction,
  deleteAllVotesAction,
  deleteSubmissionAction,
  logoutAction,
  toggleHiddenAction,
  updateSettingsAction,
} from "./actions";

export const dynamic = "force-dynamic";

const PHASE_HELP: Record<Phase, string> = {
  preparation: "Web ukazuje jen pravidla, nic nelze odevzdat ani hlasovat.",
  submissions: "Lze odevzdávat návrhy. Galerie ještě není vidět.",
  voting: "Odevzdávání je zavřené, galerie je veřejná a lze hlasovat.",
  results: "Hlasování je uzavřené a na webu jsou zveřejněné výsledky.",
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ ulozeno?: string }> }) {
  await requireAdmin();
  const { ulozeno } = await searchParams;
  const [settings, submissions, votes, results] = await Promise.all([
    getSettings(),
    listAllSubmissions(),
    countVotes(),
    getResults(),
  ]);
  const visible = submissions.filter((s) => !s.hidden).length;

  return (
    <>
      <div className="btn-row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Správa soutěže</h1>
        <form action={logoutAction}>
          <button className="btn secondary small-btn" type="submit">Odhlásit</button>
        </form>
      </div>

      <div className="admin-grid" style={{ marginTop: 24 }}>
        <section className="card">
          <h3>Přehled</h3>
          <div className="btn-row" style={{ gap: 32 }}>
            <div><div className="stat">{visible}</div><span className="muted small">zobrazených návrhů</span></div>
            <div><div className="stat">{submissions.length - visible}</div><span className="muted small">skrytých</span></div>
            <div><div className="stat">{votes}</div><span className="muted small">hlasů</span></div>
          </div>
          <p className="small muted" style={{ marginTop: 16 }}>
            Fáze: <b>{PHASE_LABELS[settings.phase]}</b>
            {settings.submissionsUntil && <><br />Odevzdání do: {formatDateTime(settings.submissionsUntil)}</>}
            {settings.votingUntil && <><br />Hlasování do: {formatDateTime(settings.votingUntil)}</>}
          </p>
        </section>

        <section className="card">
          <h3>Fáze a termíny</h3>
          <form action={updateSettingsAction} className="form">
            <fieldset className="phase-options" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="small muted" style={{ marginBottom: 6 }}>Co má web právě dělat</legend>
              {(Object.keys(PHASE_LABELS) as Phase[]).map((p) => (
                <label key={p} title={PHASE_HELP[p]}>
                  <input type="radio" name="phase" value={p} defaultChecked={settings.phase === p} />
                  <span>
                    {PHASE_LABELS[p]}
                    <br />
                    <span className="small muted" style={{ fontWeight: 400 }}>{PHASE_HELP[p]}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="field">
              <label htmlFor="submissionsUntil">Odevzdání návrhů do <span className="muted">(nepovinné)</span></label>
              <input id="submissionsUntil" name="submissionsUntil" type="datetime-local" defaultValue={dateToPragueLocal(settings.submissionsUntil)} />
            </div>
            <div className="field">
              <label htmlFor="votingUntil">Hlasování do <span className="muted">(nepovinné)</span></label>
              <input id="votingUntil" name="votingUntil" type="datetime-local" defaultValue={dateToPragueLocal(settings.votingUntil)} />
              <span className="hint">Po termínu se odevzdávání nebo hlasování samo zavře. Prázdné = bez termínu.</span>
            </div>
            {ulozeno && <div className="success small" role="status" style={{ padding: 10 }}>Uloženo.</div>}
            <button className="btn" type="submit">Uložit</button>
          </form>
        </section>
      </div>

      <h2>Návrhy ({submissions.length})</h2>
      <p className="muted small">
        Skrytý návrh zmizí z galerie i výsledků, ale zůstane tu a jde vrátit. Smazání odstraní návrh i soubor
        natrvalo; pokud už pro něj někdo hlasoval, tento hlas propadne.
      </p>
      {submissions.length === 0 ? (
        <p className="muted">Zatím nikdo nic neodevzdal.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Č.</th>
                <th>Náhled</th>
                <th>Autor</th>
                <th>Popis</th>
                <th>Odevzdáno</th>
                <th>Moderace</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className={s.hidden ? "is-hidden" : undefined}>
                  <td className="num"><b>{s.number}</b></td>
                  <td>
                    <a href={s.fileUrl} target="_blank" rel="noopener noreferrer">
                      {s.contentType === "application/pdf" ? "PDF" : <img className="thumb" src={s.fileUrl} alt={`Návrh č. ${s.number}`} />}
                    </a>
                  </td>
                  <td>
                    {s.authorName ?? <span className="muted">smazáno</span>}
                    <br /><span className="small muted">{s.troop}</span>
                    <br /><span className="small">{s.contact ?? ""}</span>
                  </td>
                  <td className="small" style={{ maxWidth: 280 }}>{s.description}</td>
                  <td className="small">{formatDateTime(s.createdAt)}</td>
                  <td>
                    <div className="btn-row" style={{ gap: 6 }}>
                      {s.hidden && <span className="badge hidden">skrytý</span>}
                      <form action={toggleHiddenAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="hidden" value={s.hidden ? "0" : "1"} />
                        <button className="btn secondary small-btn" type="submit">{s.hidden ? "Zobrazit" : "Skrýt"}</button>
                      </form>
                      <form action={deleteSubmissionAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <ConfirmButton message={`Opravdu natrvalo smazat návrh č. ${s.number}?`}>Smazat</ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Průběžné výsledky</h2>
      <p className="muted small">Vidíte jen vy. Veřejně se zobrazí až ve fázi „Výsledky“. Skryté návrhy se do pořadí nepočítají.</p>
      <ResultsList results={results} />

      <h2>Data a úklid</h2>
      <div className="btn-row">
        <a className="btn secondary" href="/admin/export">Stáhnout CSV (návrhy, autoři, body)</a>
        <form action={deleteAllVotesAction}>
          <ConfirmButton className="btn danger" message="Opravdu smazat VŠECHNY hlasy? Hodí se po testování před ostrým hlasováním.">
            Smazat všechny hlasy
          </ConfirmButton>
        </form>
        <form action={anonymizeAction}>
          <ConfirmButton className="btn danger" message="Smazat jména a kontakty všech autorů? Udělejte to až po předání výhry. Nejde vrátit.">
            Smazat osobní údaje autorů
          </ConfirmButton>
        </form>
      </div>
      <p className="small muted" style={{ marginTop: 24 }}>
        <Link href="/">Zpět na web soutěže</Link>
      </p>
    </>
  );
}
