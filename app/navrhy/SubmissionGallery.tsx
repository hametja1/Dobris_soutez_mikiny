"use client";

import type { PublicSubmission } from "@/lib/data";
import { EntryMedia, useLightbox } from "@/components/Gallery";

/** Galerie odevzdaných návrhů jen k prohlížení, bez hlasování. */
export default function SubmissionGallery({ submissions }: { submissions: PublicSubmission[] }) {
  const lightbox = useLightbox();
  return (
    <>
      <div className="gallery">
        {submissions.map((s) => (
          <article key={s.id} className="entry">
            <EntryMedia item={s} onOpen={lightbox.open} />
            <div className="entry-body">
              <div className="entry-title">
                <strong>Návrh č. {s.number}</strong>
              </div>
              {s.description && <p className="entry-desc">{s.description}</p>}
            </div>
          </article>
        ))}
      </div>
      {lightbox.dialog}
    </>
  );
}
