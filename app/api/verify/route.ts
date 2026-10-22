import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const hashCode = (c: string) => createHmac("sha256", process.env.CODE_PEPPER!).update(c.toUpperCase()).digest("hex");
const fail = () => NextResponse.json({ error: "No match. Check the student ID, roll no. and code, or ask for a new code." }, { status: 404 });

// Public endpoint. Uses the service role because verifiers have no account.
// TODO before launch: rate-limit by IP and student ID (e.g. Upstash Ratelimit) to block code guessing.
export async function POST(req: Request) {
  const { studentId, roll, code } = await req.json();
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("id").eq("student_id", String(studentId ?? "").toUpperCase()).eq("roll_no", String(roll ?? "").toUpperCase()).maybeSingle();
  if (!p) return fail();
  const { data: s } = await db.from("shares").select("doc_ids").eq("owner", p.id).eq("code_hash", hashCode(String(code ?? ""))).gt("expires_at", new Date().toISOString()).maybeSingle();
  await db.from("access_log").insert({ owner: p.id, ok: !!s });
  if (!s) return fail();
  const { data: docs } = await db.from("documents").select("id,doc_type,file_name,file_path,sha256,status").in("id", s.doc_ids);
  const out = await Promise.all((docs ?? []).map(async (d) => {
    const { data } = await db.storage.from("documents").createSignedUrl(d.file_path, 300);
    return { id: d.id, doc_type: d.doc_type, file_name: d.file_name, sha256: d.sha256, status: d.status, url: data?.signedUrl };
  }));
  return NextResponse.json({ docs: out });
}
