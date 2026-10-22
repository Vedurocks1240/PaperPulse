import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import Status from "@/components/Status";

async function review(fd: FormData) {
  "use server";
  const status = fd.get("status") === "verified" ? "verified" : "rejected";
  await supabaseServer().from("documents").update({ status }).eq("id", String(fd.get("id")));
  revalidatePath("/school");
}

export default async function School() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await sb.from("profiles").select("role,school").eq("id", user.id).single();
  if (me?.role !== "school") redirect("/dashboard");
  const { data: docs } = await sb.from("documents").select("id,doc_type,file_name,owner,status").eq("status", "pending");
  return (
    <>
      <div className="row"><h1>{me.school}: review queue</h1><form action="/auth/signout" method="post"><button>Sign out</button></form></div>
      <div className="card">
        {(docs ?? []).length === 0 && <p className="mut">No documents waiting.</p>}
        {(docs ?? []).map((d) => (
          <form action={review} className="doc" key={d.id}>
            <input type="hidden" name="id" value={d.id} />
            <b>{d.doc_type}</b> <Status s={d.status} />
            <div className="mut">{d.file_name} · student {String(d.owner).slice(0, 8)}</div>
            <button className="pri" name="status" value="verified">Verify</button> <button name="status" value="rejected">Reject</button>
          </form>
        ))}
      </div>
    </>
  );
}
