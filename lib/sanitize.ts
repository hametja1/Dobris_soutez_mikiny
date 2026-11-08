import { PDFDocument, PDFName, PDFDict } from "pdf-lib";

/**
 * Kontrola a „očištění“ nahraných souborů před uložením.
 *
 * 1. Skutečný typ souboru se pozná podle prvních bajtů, ne podle toho, co tvrdí prohlížeč.
 *    Tím se zabrání nahrání např. HTML stránky převlečené za obrázek.
 * 2. Z obrázků a PDF se odstraní metadata: poloha GPS z fotek, jméno autora, model telefonu,
 *    jméno autora PDF apod. Návrhy jsou veřejně dostupné a galerie má být anonymní.
 */

export type SafeType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export function detectType(buf: Uint8Array): SafeType | null {
  const ascii = (from: number, len: number) => String.fromCharCode(...buf.subarray(from, from + len));
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf[0] === 0x89 && ascii(1, 3) === "PNG" && buf[4] === 0x0d && buf[5] === 0x0a) return "image/png";
  if (buf.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (buf.length > 5 && ascii(0, 5) === "%PDF-") return "application/pdf";
  return null;
}

/* ---------- JPEG: vynechá segmenty APP1 (EXIF, XMP), APP13 (IPTC) a komentáře ---------- */
function stripJpeg(buf: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) throw new Error("Poškozený JPEG");
    const marker = buf[i + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) {
      out.push(buf.subarray(i)); // začátek obrazových dat – zbytek souboru beze změny
      break;
    }
    const len = (buf[i + 2] << 8) | buf[i + 3];
    const end = i + 2 + len;
    if (end > buf.length) throw new Error("Poškozený JPEG");
    const drop = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!drop) out.push(buf.subarray(i, end));
    i = end;
  }
  return concat(out);
}

/* ---------- PNG: vynechá textové a EXIF bloky ---------- */
const PNG_DROP = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);
function stripPng(buf: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [buf.subarray(0, 8)];
  let i = 8;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  while (i + 12 <= buf.length) {
    const len = view.getUint32(i);
    const type = String.fromCharCode(...buf.subarray(i + 4, i + 8));
    const end = i + 12 + len;
    if (end > buf.length) throw new Error("Poškozený PNG");
    if (!PNG_DROP.has(type)) out.push(buf.subarray(i, end));
    i = end;
    if (type === "IEND") break;
  }
  return concat(out);
}

/* ---------- WEBP: vynechá bloky EXIF a XMP a upraví hlavičku ---------- */
function stripWebp(buf: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let i = 12;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  while (i + 8 <= buf.length) {
    const type = String.fromCharCode(...buf.subarray(i, i + 4));
    const len = view.getUint32(i + 4, true);
    const end = i + 8 + len + (len % 2);
    if (i + 8 + len > buf.length) throw new Error("Poškozený WEBP");
    if (type !== "EXIF" && type !== "XMP ") {
      const chunk = buf.slice(i, Math.min(end, buf.length));
      if (type === "VP8X") chunk[8] &= ~(0x08 | 0x04); // příznaky „obsahuje EXIF/XMP“
      chunks.push(chunk);
    }
    i = end;
  }
  const body = concat(chunks);
  const header = new Uint8Array(12);
  header.set(buf.subarray(0, 12));
  new DataView(header.buffer).setUint32(4, body.length + 4, true);
  return concat([header, body]);
}

/* ---------- PDF: smaže informace o autorovi, XMP metadata a automaticky spouštěné akce ---------- */
async function stripPdf(buf: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(buf, { updateMetadata: false });
  doc.setTitle("");
  doc.setAuthor("");
  doc.setSubject("");
  doc.setKeywords([]);
  doc.setCreator("");
  doc.setProducer("");
  const catalog = doc.catalog;
  catalog.delete(PDFName.of("Metadata"));
  catalog.delete(PDFName.of("OpenAction"));
  catalog.delete(PDFName.of("AA"));
  const names = catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  names?.delete(PDFName.of("JavaScript"));
  return doc.save({ useObjectStreams: false });
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/**
 * Vrátí očištěný soubor a jeho skutečný typ, nebo null, pokud soubor není povolený typ
 * nebo je poškozený (např. zaheslované PDF).
 */
export async function sanitizeUpload(input: Uint8Array): Promise<{ data: Uint8Array; type: SafeType } | null> {
  const type = detectType(input);
  if (!type) return null;
  try {
    if (type === "image/jpeg") return { type, data: stripJpeg(input) };
    if (type === "image/png") return { type, data: stripPng(input) };
    if (type === "image/webp") return { type, data: stripWebp(input) };
    return { type, data: await stripPdf(input) };
  } catch (err) {
    console.error("Soubor se nepodařilo zpracovat", err);
    return null;
  }
}
