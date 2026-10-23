import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { nameMatches } from "@/lib/match";

const err = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const b = await req.json();
  const email = String(b.email ?? "").trim().toLowerCase();
  const [fullName, sid, roll, school] = ["full_name", "student_id", "roll_no", "school"].map((k) => String(b[k] ?? "").trim());
  if (!/^\S+@\S+\.\S+$/.test(email) || String(b.password ?? "").length < 8) return err("Enter a valid email and a password of 8+ characters.", 400);
  if (!fullName || !sid || !roll || !school) return err("Fill in every field.", 400);
  const key = school.toLowerCase(), SID = sid.toUpperCase(), ROLL = roll.toUpperCase();
  // If the school has uploaded a roster, the signup must match an unclaimed row (name + student ID + roll no.).
  let entry = null;
  if (await db.rosterEntry.count({ where: { schoolKey: key } })) {
    entry = await db.rosterEntry.findUnique({ where: { schoolKey_studentId: { schoolKey: key, studentId: SID } } });
    if (!entry || entry.claimedById || entry.rollNo !== ROLL || !nameMatches(entry.fullName, fullName)) return err("Your school's student list has no unclaimed match for that name, student ID and roll no. Check with your school.", 403);
  }
  try {
    const id = randomUUID();
    await db.$transaction([
      db.user.create({ data: { id, email, passwordHash: await bcrypt.hash(String(b.password), 10), fullName, studentId: SID, rollNo: ROLL, school: entry?.school ?? school } }),
      ...(entry ? [db.rosterEntry.update({ where: { id: entry.id }, data: { claimedById: id } })] : []),
    ]);
    await startSession(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return err("That email or student ID is already registered.", 409);
    return err("Could not create the account. Try again.", 500);
  }
}
