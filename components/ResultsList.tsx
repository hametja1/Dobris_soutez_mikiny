"use client";

import type { ResultRow } from "@/lib/data";
import { useLightbox } from "./Gallery";

export default function ResultsList({ results }: { results: ResultRow[] }) {
  const lightbox = useLightbox();

  if (results.length === 0) return <p className="muted">Zatím nejsou žádné návrhy.</p>;
  const anyVotes = results.some((r) => r.plus > 0 || r.minus > 0);

  return (
    <>
      {!anyVotes && <p className="muted">Zatím nikdo nehlasoval.</p>}
      <ol className="results" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {results.map((r) => (
          <li key={r.id} className={`result${anyVotes && r.rank === 1 ? " first" : ""}`}>
            <span className="rank" aria-label={anyVotes ? `${r.rank}. místo` : undefined}>{anyVotes ? `${r.rank}.` : "–"}</span>
            {r.contentType === "application/pdf" ? (
              <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="muted">PDF</a>
            ) : (
              <button type="button" className="entry-media" style={{ width: "auto", aspectRatio: "auto" }} onClick={() => lightbox.open(r)} aria-label={`Zvětšit návrh č. ${r.number}`}>
                <img src={r.fileUrl} alt={`Návrh č. ${r.number}`} loading="lazy" />
              </button>
            )}
            <div>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>Návrh č. {r.number}</strong>{" "}
              {r.tied && <span className="badge">remíza – rozhodne rada</span>}{" "}
              {r.hidden && <span className="badge hidden">skrytý</span>}
              <div>
                <b>{r.score} b.</b> <span className="muted small">({r.plus} pro, {r.minus} proti)</span>
              </div>
              {r.description && <p className="entry-desc">{r.description}</p>}
            </div>
          </li>
        ))}
      </ol>
      {lightbox.dialog}
    </>
  );
}
