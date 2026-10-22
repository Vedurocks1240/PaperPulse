import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import Student from "@/components/Student";

export default async function Dashboard() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await sb.from("profiles").select("*").eq("id", user.id).single();
  if (me?.role === "school") redirect("/school");
  const { data: docs } = await sb.from("documents").select("id,doc_type,file_name,sha256,status").order("created_at", { ascending: false });
  const { data: log } = await sb.from("access_log").select("id,ok,at").order("at", { ascending: false }).limit(10);
  return (
    <>
      <div className="row">
        <h1>{me?.full_name}</h1>
        <form action="/auth/signout" method="post"><button>Sign out</button></form>
      </div>
      <p className="mut">Student ID {me?.student_id} · Roll no. {me?.roll_no} · {me?.school}</p>
      <Student uid={user.id} docs={docs ?? []} />
      <div className="card"><h2>Access log</h2>
        {(log ?? []).length ? log!.map((l) => <div key={l.id} className="mut">{new Date(l.at).toLocaleString()}: {l.ok ? "documents viewed" : "failed attempt"}</div>) : <span className="mut">No access yet.</span>}
      </div>
    </>
  );
}
