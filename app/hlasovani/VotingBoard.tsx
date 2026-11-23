"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { PublicSubmission } from "@/lib/data";
import { EntryMedia, useLightbox } from "@/components/Gallery";
import { castVote } from "./actions";

const VOTED_KEY = "mikiny-hlas-odeslan";
const DEVICE_KEY = "mikiny-zarizeni";
const ORDER_KEY = "mikiny-poradi";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* soukromý režim – nevadí, chrání ještě cookie */
  }
}

/** Náhodné pořadí návrhů pro každého hlasujícího, ať nejsou zvýhodněné první v řadě. Pořadí si zařízení pamatuje. */
function shuffledIds(ids: number[]): number[] {
  const saved = readStorage(ORDER_KEY);
  const known = saved ? (JSON.parse(saved) as number[]).filter((id) => ids.includes(id)) : [];
  const fresh = ids.filter((id) => !known.includes(id));
  for (let i = fresh.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
  }
  const order = [...known, ...fresh];
  writeStorage(ORDER_KEY, JSON.stringify(order));
  return order;
}

export default function VotingBoard({ submissions }: { submissions: PublicSubmission[] }) {
  const [order, setOrder] = useState<number[] | null>(null);
  const [voted, setVoted] = useState(false);
  const [plus, setPlus] = useState<number[]>([]);
  const [minus, setMinus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const lightbox = useLightbox();

  const byId = useMemo(() => new Map(submissions.map((s) => [s.id, s])), [submissions]);

  useEffect(() => {
    setVoted(readStorage(VOTED_KEY) === "1");
    setOrder(shuffledIds(submissions.map((s) => s.id)));
  }, [submissions]);

  const plusCount = (id: number) => plus.filter((p) => p === id).length;
  const label = (id: number) => `č. ${byId.get(id)?.number}`;

  /** Hlasy pro bez daného návrhu; hlas proti jde jen spolu s oběma hlasy pro. */
  function withoutPlus(id: number) {
    const next = plus.filter((p) => p !== id);
    setPlus(next);
    return next;
  }
  function togglePlus(id: number) {
    if (plusCount(id) > 0) {
      if (withoutPlus(id).length < 2) setMinus(null);
      return;
    }
    if (plus.length >= 2) return;
    setPlus([...plus, id]);
    if (minus === id) setMinus(null);
  }
  function addSecondPlus(id: number) {
    if (plus.length >= 2) return;
    setPlus([...plus, id]);
  }
  function toggleMinus(id: number) {
    setMinus(minus === id ? null : id);
  }
  /** Křížek: zruší všechny hlasy (pro i proti) u jednoho návrhu. */
  function clearEntry(id: number) {
    const next = withoutPlus(id);
    if (minus === id || next.length < 2) setMinus(null);
  }

  function submit() {
    setError(null);
    if (plus.length !== 2) return;
    let deviceId = readStorage(DEVICE_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      writeStorage(DEVICE_KEY, deviceId);
    }
    const payload = { deviceId, plus: [plus[0], plus[1]] as [number, number], minus };
    startTransition(async () => {
      const res = await castVote(payload);
      if (res.ok || res.alreadyVoted) {
        writeStorage(VOTED_KEY, "1");
        setVoted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      if (!res.ok) setError(res.error);
    });
  }

  if (voted) {
    return (
      <div className="success" role="status">
        <h2 style={{ marginTop: 0 }}>Děkujeme, váš hlas je uložený.</h2>
        <p>Z tohoto zařízení už znovu hlasovat nelze. Výsledky zveřejníme po skončení hlasování.</p>
        {error && <p className="small">{error}</p>}
      </div>
    );
  }

  if (!order) return <p className="muted">Načítám návrhy…</p>;

  const minusAllowed = plus.length === 2;

  return (
    <>
      <div className="gallery">
        {order.map((id) => {
          const s = byId.get(id);
          if (!s) return null;
          const pc = plusCount(id);
          const isMinus = minus === id;
          return (
            <article key={id} className={`entry${pc ? " has-plus" : ""}${isMinus ? " has-minus" : ""}`}>
              <EntryMedia item={s} onOpen={lightbox.open} />
              <div className="entry-body">
                <div className="entry-title">
                  <strong>Návrh č. {s.number}</strong>
                  {pc > 0 && <span className="badge plus">{pc === 2 ? "+2 hlasy" : "+1 hlas"}</span>}
                  {isMinus && <span className="badge minus">hlas proti</span>}
                </div>
                {s.description && <p className="entry-desc">{s.description}</p>}
                <div className="vote-buttons">
                  <button
                    type="button"
                    className={`btn small-btn${pc > 0 ? "" : " secondary"}`}
                    onClick={() => togglePlus(id)}
                    disabled={pc === 0 && plus.length >= 2}
                    aria-pressed={pc > 0}
                    title={pc > 0 ? "Kliknutím hlas pro zrušíte." : undefined}
                  >
                    + Pro
                  </button>
                  {pc === 1 && plus.length < 2 && (
                    <button
                      type="button"
                      className="btn secondary small-btn icon-btn"
                      onClick={() => addSecondPlus(id)}
                      aria-label={`Dát návrhu č. ${s.number} i druhý hlas pro`}
                      title="Dát i druhý hlas pro"
                    >
                      +1
                    </button>
                  )}
                  <button
                    type="button"
                    className={`btn danger small-btn${isMinus ? " is-on" : ""}`}
                    onClick={() => toggleMinus(id)}
                    disabled={!minusAllowed || pc > 0}
                    aria-pressed={isMinus}
                    title={
                      !minusAllowed
                        ? "Hlas proti můžete dát až po rozdání obou hlasů pro."
                        : isMinus
                          ? "Kliknutím hlas proti zrušíte."
                          : undefined
                    }
                  >
                    − Proti
                  </button>
                  {(pc > 0 || isMinus) && (
                    <button
                      type="button"
                      className="btn secondary small-btn icon-btn"
                      onClick={() => clearEntry(id)}
                      aria-label={`Zrušit hlasy u návrhu č. ${s.number}`}
                      title="Zrušit hlasy u tohoto návrhu"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="vote-bar" aria-live="polite">
        <div className="vote-summary">
          <span>
            Hlasy pro ({plus.length}/2):{" "}
            <b>
              {plus.length === 0
                ? "zatím žádný"
                : plus[0] === plus[1]
                  ? `${label(plus[0])} (2×)`
                  : plus.map(label).join(", ")}
            </b>
          </span>
          <span>
            Hlas proti (nepovinný): <b>{minus !== null ? label(minus) : minusAllowed ? "žádný" : "až po obou hlasech pro"}</b>
          </span>
          {error && <span role="alert"><b>Nelze odeslat:</b> {error}</span>}
        </div>
        <button type="button" className="btn" onClick={submit} disabled={plus.length !== 2 || pending}>
          {pending ? "Odesílám…" : "Odeslat hlas"}
        </button>
      </div>
      {lightbox.dialog}
    </>
  );
}
