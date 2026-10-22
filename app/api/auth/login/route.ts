import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";

export async function POST(req: Request) {
  const b = await req.json();
  const u = await db.user.findUnique({ where: { email: String(b.email ?? "").trim().toLowerCase() }, select: { id: true, passwordHash: true } });
  if (!u || !(await bcrypt.compare(String(b.password ?? ""), u.passwordHash))) return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  await startSession(u.id);
  return NextResponse.json({ ok: true });
}
