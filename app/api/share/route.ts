import { createHmac, randomInt } from "crypto";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const hashCode = (c: string) => createHmac("sha256", process.env.CODE_PEPPER!).update(c.toUpperCase()).digest("hex");

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { docIds, minutes } = await req.json();
  const mins = [10, 60, 1440].includes(minutes) ? minutes : 60;
  // RLS means only the user's own documents come back.
  const { data: own } = await sb.from("documents").select("id").in("id", docIds ?? []);
  if (!own?.length) return NextResponse.json({ error: "Pick at least one of your documents." }, { status: 400 });
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const code = Array.from({ length: 6 }, () => A[randomInt(A.length)]).join("");
  const { error } = await sb.from("shares").insert({
    owner: user.id, code_hash: hashCode(code), doc_ids: own.map((d) => d.id), expires_at: new Date(Date.now() + mins * 60000).toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ code });
}
