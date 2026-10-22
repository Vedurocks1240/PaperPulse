import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser, hashCode, UUID } from "@/lib/auth";

export async function POST(req: Request) {
  const u = await getUser();
  if (!u || u.role !== "STUDENT") return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { docIds, minutes } = await req.json();
  const mins = [10, 60, 1440].includes(minutes) ? minutes : 60;
  const wanted = (Array.isArray(docIds) ? docIds : []).filter((i): i is string => typeof i === "string" && UUID.test(i)).slice(0, 20);
  const mine = await db.document.findMany({ where: { id: { in: wanted }, ownerId: u.id }, select: { id: true } });
  if (!mine.length) return NextResponse.json({ error: "Pick at least one of your documents." }, { status: 400 });
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 6 }, () => A[randomInt(A.length)]).join("");
  await db.share.create({ data: { ownerId: u.id, codeHash: hashCode(code), docIds: mine.map((d) => d.id), expiresAt: new Date(Date.now() + mins * 60000) } });
  return NextResponse.json({ code });
}
