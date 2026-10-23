import { createHash } from "crypto";
import { del, put } from "@vercel/blob";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser, UUID } from "@/lib/auth";
import { runOcr } from "@/lib/ocr";
import { flagFor } from "@/lib/match";

export const maxDuration = 60; // OCR can take a while
const MAX = 4 * 1024 * 1024; // Vercel functions accept request bodies up to ~4.5 MB
const err = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const u = await getUser();
  if (!u || u.role !== "STUDENT") return err("Sign in as a student.", 401);
  const fd = await req.formData();
  const f = fd.get("file");
  if (!(f instanceof File)) return err("Choose a file.", 400);
  if (f.size > MAX) return err("File is over 4 MB. Use a smaller photo or PDF.", 413);
  if (!/^(image\/|application\/pdf$)/.test(f.type)) return err("Only images and PDFs are allowed.", 415);
  const bytes = Buffer.from(await f.arrayBuffer());
  // The hash is computed on the server from the exact original bytes. The OCR output is a separate, derived file.
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const safe = f.name.replace(/[^\w.-]/g, "_");
  const blob = await put(`documents/${u.id}/${safe}`, bytes, { access: "private", addRandomSuffix: true, contentType: f.type });
  const ocr = await runOcr(bytes, f.name, f.type);
  const pdf = ocr ? await put(`documents/${u.id}/${safe}.searchable.pdf`, ocr.pdf, { access: "private", addRandomSuffix: true, contentType: "application/pdf" }).catch(() => null) : null;
  try {
    const d = await db.document.create({
      data: {
        ownerId: u.id, docType: String(fd.get("docType") || "Document").slice(0, 80), fileName: f.name.slice(0, 200), mime: f.type, sha256,
        blobUrl: blob.url, blobPath: blob.pathname, pdfUrl: pdf?.url, pdfPath: pdf?.pathname,
        ocrStatus: ocr && pdf ? "done" : process.env.OCR_SERVICE_URL ? "failed" : "none",
        extracted: ocr ? (ocr.fields as Prisma.InputJsonValue) : undefined,
        flag: ocr ? flagFor(ocr.fields, u) : null,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: d.id, ocr: !!pdf, blurry: !!ocr?.blurry });
  } catch {
    await del([blob.url, ...(pdf ? [pdf.url] : [])]).catch(() => {});
    return err("Could not save the document. Try again.", 500);
  }
}

export async function DELETE(req: Request) {
  const u = await getUser();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!u || !UUID.test(id)) return err("Not allowed.", 400);
  const d = await db.document.findFirst({ where: { id, ownerId: u.id }, select: { blobUrl: true, pdfUrl: true } });
  if (!d) return err("Not found.", 404);
  await del([d.blobUrl, ...(d.pdfUrl ? [d.pdfUrl] : [])]).catch(() => {});
  await db.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
