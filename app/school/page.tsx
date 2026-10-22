import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUser, UUID } from "@/lib/auth";
import Status from "@/components/Status";

async function review(fd: FormData) {
  "use server";
  const u = await getUser(), id = String(fd.get("id"));
  if (!u || u.role !== "SCHOOL" || !u.school || !UUID.test(id)) return;
  await db.document.updateMany({
    where: { id, owner: { school: { equals: u.school, mode: "insensitive" } } },
    data: { status: fd.get("status") === "verified" ? "VERIFIED" : "REJECTED" },
  });
  revalidatePath("/school");
}

export default async function School() {
  const me = await getUser();
  if (!me) redirect("/login");
  if (me.role !== "SCHOOL") redirect("/dashboard");
  const docs = me.school ? await db.document.findMany({
    where: { status: "PENDING", owner: { school: { equals: me.school, mode: "insensitive" } } },
    include: { owner: { select: { fullName: true, studentId: true } } }, orderBy: { createdAt: "asc" },
  }) : [];
  return (
    <>
      <div className="row"><h1>{me.school}: review queue</h1><form action="/auth/signout" method="post"><button>Sign out</button></form></div>
      <div className="card">
        {docs.length === 0 && <p className="mut">No documents waiting.</p>}
        {docs.map((d) => (
          <form action={review} className="doc" key={d.id}>
            <input type="hidden" name="id" value={d.id} />
            <b>{d.docType}</b> <Status s={d.status} />
            <div className="mut">{d.owner.fullName} ({d.owner.studentId}) · {d.fileName} · <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer">Open to check</a></div>
            <button className="pri" name="status" value="verified">Verify</button> <button name="status" value="rejected">Reject</button>
          </form>
        ))}
      </div>
    </>
  );
}
