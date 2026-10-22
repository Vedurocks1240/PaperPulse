import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const b = await req.json();
  const email = String(b.email ?? "").trim().toLowerCase();
  const [fullName, sid, roll, school] = ["full_name", "student_id", "roll_no", "school"].map((k) => String(b[k] ?? "").trim());
  if (!/^\S+@\S+\.\S+$/.test(email) || String(b.password ?? "").length < 8) return err("Enter a valid email and a password of 8+ characters.", 400);
  if (!fullName || !sid || !roll || !school) return err("Fill in every field.", 400);
  try {
    const u = await db.user.create({
      data: { email, passwordHash: await bcrypt.hash(String(b.password), 10), fullName, studentId: sid.toUpperCase(), rollNo: roll.toUpperCase(), school },
      select: { id: true },
    });
    await startSession(u.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return err("That email or student ID is already registered.", 409);
    return err("Could not create the account. Try again.", 500);
  }
}
