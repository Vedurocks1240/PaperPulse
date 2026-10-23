import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

// School staff upload a CSV: student_id,roll_no,full_name. Existing student IDs are left unchanged.
export async function POST(req: Request) {
  const u = await getUser();
  if (!u || u.role !== "SCHOOL" || !u.school) return NextResponse.json({ error: "Only school accounts can upload a roster." }, { status: 401 });
  const lines = (await req.text()).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 5001) return NextResponse.json({ error: "Upload at most 5000 students at a time." }, { status: 413 });
  const seen = new Set<string>(), data = [];
  for (const [i, l] of lines.entries()) {
    const [sid, roll, ...rest] = l.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    const name = rest.join(" ").trim();
    if (i === 0 && /student/i.test(sid ?? "")) continue; // header row
    if (!sid || !roll || !name || seen.has(sid.toUpperCase())) continue;
    seen.add(sid.toUpperCase());
    data.push({ school: u.school, schoolKey: u.school.trim().toLowerCase(), studentId: sid.toUpperCase(), rollNo: roll.toUpperCase(), fullName: name });
  }
  const r = await db.rosterEntry.createMany({ data, skipDuplicates: true });
  return NextResponse.json({ added: r.count, skipped: lines.length - r.count });
}
