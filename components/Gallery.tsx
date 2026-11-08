"use client";

import { useRef, useState } from "react";

export type GalleryItem = { id: number; number: number; fileUrl: string; contentType: string };

/** Náhled návrhu: obrázek se po kliknutí otevře přes celou obrazovku, PDF v nové záložce. */
export function EntryMedia({ item, onOpen }: { item: GalleryItem; onOpen: (item: GalleryItem) => void }) {
  if (item.contentType === "application/pdf") {
    return (
      <a className="entry-media pdf" href={item.fileUrl} target="_blank" rel="noopener noreferrer">
        PDF · otevřít návrh č. {item.number}
      </a>
    );
  }
  return (
    <button type="button" className="entry-media" onClick={() => onOpen(item)} aria-label={`Zvětšit návrh č. ${item.number}`}>
      <img src={item.fileUrl} alt={`Návrh č. ${item.number}`} loading="lazy" />
    </button>
  );
}

export function useLightbox() {
  const ref = useRef<HTMLDialogElement>(null);
  const [item, setItem] = useState<GalleryItem | null>(null);

  const open = (i: GalleryItem) => {
    setItem(i);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  const dialog = (
    <dialog
      ref={ref}
      className="lightbox"
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      onClose={() => setItem(null)}
    >
      {item && (
        <>
          <img src={item.fileUrl} alt={`Návrh č. ${item.number}`} />
          <button type="button" className="btn" onClick={close}>Zavřít náhled</button>
        </>
      )}
    </dialog>
  );

  return { open, dialog };
}
