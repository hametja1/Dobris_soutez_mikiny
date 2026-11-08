import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_UPLOAD_DIR } from "@/lib/storage";

/** Jen pro lokální vývoj bez Vercel Blob: vrací nahrané soubory ze složky .data/uploads. */

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safe = path.basename(name);
  const type = TYPES[safe.split(".").pop() ?? ""];
  if (!type) return new Response("Nenalezeno", { status: 404 });
  try {
    const data = await readFile(path.join(LOCAL_UPLOAD_DIR, safe));
    return new Response(data, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" } });
  } catch {
    return new Response("Nenalezeno", { status: 404 });
  }
}
