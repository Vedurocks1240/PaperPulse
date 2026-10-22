import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fileToken, hashCode } from "@/lib/auth";

const fail = (s = 404, m = "No match. Check the student ID, roll no. and code, or ask for a new code.") => NextResponse.json({ error: m }, { status: s });
const norm = (v: unknown) => String(v ?? "").trim().toUpperCase();

// Public endpoint: verifiers have no account.
export async function POST(req: Request) {
  const b = await req.json();
  const p = await db.user.findFirst({ where: { studentId: norm(b.studentId), rollNo: norm(b.roll), role: "STUDENT" }, select: { id: true } });
  if (!p) return fail();
  // Lock a student's codes for 15 minutes after 8 failed attempts, so 6-character codes can't be brute-forced.
  const bad = await db.accessLog.count({ where: { ownerId: p.id, ok: false, at: { gt: new Date(Date.now() - 15 * 60000) } } });
  if (bad >= 8) return fail(429, "Too many failed attempts. Try again in 15 minutes.");
  const s = await db.share.findFirst({ where: { ownerId: p.id, codeHash: hashCode(String(b.code ?? "")), expiresAt: { gt: new Date() } } });
  await db.accessLog.create({ data: { ownerId: p.id, ok: !!s } });
  if (!s) return fail();
  const docs = await db.document.findMany({ where: { id: { in: s.docIds }, ownerId: p.id }, select: { id: true, docType: true, fileName: true, sha256: true, status: true } });
  return NextResponse.json({ docs: await Promise.all(docs.map(async (d) => ({ ...d, url: `/api/files/${d.id}?t=${await fileToken(d.id)}` }))) });
}
