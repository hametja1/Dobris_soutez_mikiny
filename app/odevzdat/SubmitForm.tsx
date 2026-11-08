"use client";

import { useEffect, useRef, useState } from "react";
import { LIMITS, MAX_FILE_BYTES } from "@/lib/config";

type Result = { number: number; remaining: number };

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const MAX_SIDE = 3000; // delší strana obrázku po zmenšení

/** Zmenší příliš velký obrázek (typicky fotku z mobilu), aby prošel limitem velikosti. */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const longest = Math.max(bitmap.width, bitmap.height);
  // JPEG z mobilu překódujeme vždy: zahodí se tím metadata (poloha GPS, model telefonu)
  // a fotka zůstane správně natočená i poté, co server metadata odstraní.
  if (file.type !== "image/jpeg" && file.size <= MAX_FILE_BYTES && longest <= MAX_SIDE) return file;

  const scale = Math.min(1, MAX_SIDE / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const encode = (type: string, q: number) =>
    new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  // WebP zachová průhlednost; prohlížeče bez WebP vrátí PNG, pak použijeme JPEG.
  let blob = await encode("image/webp", 0.9);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.88);
  if (!blob) return file;
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type });
}

export default function SubmitForm({ troops }: { troops: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const picked = e.target.files?.[0] ?? null;
    setFile(null);
    if (!picked) return;
    setPreparing(true);
    try {
      const ready = await shrinkImage(picked);
      if (ready.size > MAX_FILE_BYTES) {
        setError("Soubor je příliš velký (maximum 4 MB). U PDF zkuste menší export.");
        return;
      }
      setFile(ready);
    } finally {
      setPreparing(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Přiložte prosím soubor s návrhem.");
    const data = new FormData(e.currentTarget);
    data.set("file", file);
    setBusy(true);
    try {
      const res = await fetch("/api/submissions", { method: "POST", body: data });
      const json = await res.json().catch(() => null);
      if (!json?.ok) {
        setError(json?.error ?? "Odeslání se nepovedlo, zkuste to prosím znovu.");
        return;
      }
      setResult({ number: json.number, remaining: json.remaining });
    } catch {
      setError("Odeslání se nepovedlo. Zkontrolujte připojení k internetu a zkuste to znovu.");
    } finally {
      setBusy(false);
    }
  }

  function another() {
    // Jméno, oddíl a kontakt necháme vyplněné, vymažeme jen popis a soubor.
    const form = formRef.current;
    if (form) {
      (form.elements.namedItem("description") as HTMLTextAreaElement).value = "";
      (form.elements.namedItem("file") as HTMLInputElement).value = "";
    }
    setFile(null);
    setResult(null);
  }

  return (
    <>
      {result && (
        <div className="success" role="status">
          <h2 style={{ marginTop: 0 }}>Díky, návrh je odevzdaný!</h2>
          <p>V galerii pro hlasování bude mít číslo <strong>{result.number}</strong>.</p>
          {result.remaining > 0 ? (
            <button type="button" className="btn" onClick={another}>
              Odevzdat další návrh (zbývá {result.remaining})
            </button>
          ) : (
            <p>Tím jste odevzdali maximální počet návrhů.</p>
          )}
        </div>
      )}

      <form ref={formRef} className="form" onSubmit={onSubmit} hidden={Boolean(result)}>
        <div className="field">
          <label htmlFor="authorName">Jméno a příjmení</label>
          <input id="authorName" name="authorName" type="text" required minLength={3} maxLength={LIMITS.name} autoComplete="name" />
          <span className="hint">Podle jména se počítá limit návrhů na autora.</span>
        </div>

        <div className="field">
          <label htmlFor="troop">Oddíl</label>
          <select id="troop" name="troop" required defaultValue="">
            <option value="" disabled>Vyberte oddíl</option>
            {troops.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="contact">Kontakt</label>
          <input id="contact" name="contact" type="text" required minLength={5} maxLength={LIMITS.contact} autoComplete="email" />
          <span className="hint">E-mail nebo telefon. Mladší členové mohou uvést kontakt na rodiče nebo vedoucího.</span>
        </div>

        <div className="field">
          <label htmlFor="file">Soubor s návrhem</label>
          <input id="file" name="file" type="file" accept={ACCEPT} required onChange={onFileChange} />
          <span className="hint">JPG, PNG, WEBP nebo PDF, max. 4 MB. Velké fotky se automaticky zmenší.</span>
          {preview && <img className="file-preview" src={preview} alt="Náhled vybraného návrhu" />}
          {preparing && <span className="hint" role="status">Připravuji obrázek…</span>}
          {file && !preview && <span className="hint">Vybráno: {file.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="description">Popis návrhu <span className="muted">(nepovinné)</span></label>
          <textarea id="description" name="description" maxLength={LIMITS.description} />
          <span className="hint">Co návrh znázorňuje, kam na mikinu patří, jaká barva mikiny se hodí. Popis uvidí hlasující, nepište do něj své jméno.</span>
        </div>

        <label className="check">
          <input type="checkbox" name="consent" required />
          <span>
            Souhlasím s pravidly soutěže: středisko smí návrh použít a upravit pro svůj merch a moje jméno a
            kontakt použije jen ke kontaktování výherce.
          </span>
        </label>

        {error && <div className="error" role="alert">{error}</div>}

        <div className="btn-row">
          <button className="btn" type="submit" disabled={busy || preparing}>
            {busy ? "Odesílám…" : preparing ? "Připravuji obrázek…" : "Odevzdat návrh"}
          </button>
        </div>
      </form>
    </>
  );
}
