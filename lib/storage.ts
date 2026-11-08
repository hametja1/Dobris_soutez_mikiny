import { put, del } from "@vercel/blob";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Ukládání souborů s návrhy.
 * - Na Vercelu do Vercel Blob (proměnná BLOB_READ_WRITE_TOKEN dodá integrace Blob).
 * - Lokálně bez tokenu do složky .data/uploads, soubory pak servíruje /api/local-file.
 */

const LOCAL_DIR = path.join(process.cwd(), ".data", "uploads");
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function saveFile(file: File, extension: string): Promise<string> {
  const name = `navrh-${randomUUID()}.${extension}`;
  if (useBlob()) {
    const blob = await put(`navrhy/${name}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return blob.url;
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/api/local-file/${name}`;
}

export async function deleteFile(url: string): Promise<void> {
  try {
    if (url.startsWith("/api/local-file/")) {
      await unlink(path.join(LOCAL_DIR, path.basename(url)));
    } else if (useBlob()) {
      await del(url);
    }
  } catch (err) {
    // Soubor už mohl být smazán – záznam v databázi smažeme i tak.
    console.error("Nepodařilo se smazat soubor", url, err);
  }
}

export const LOCAL_UPLOAD_DIR = LOCAL_DIR;
