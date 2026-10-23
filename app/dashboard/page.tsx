import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import Student from "@/components/Student";
import type { Extracted } from "@/components/DocInfo";

export default async function Dashboard() {
  const me = await getUser();
  if (!me) redirect("/login");
  if (me.role === "SCHOOL") redirect("/school");
  const docs = await db.document.findMany({ where: { ownerId: me.id }, orderBy: { createdAt: "desc" }, select: { id: true, docType: true, fileName: true, sha256: true, status: true, extracted: true, flag: true, pdfPath: true } });
  const log = await db.accessLog.findMany({ where: { ownerId: me.id }, orderBy: { at: "desc" }, take: 10 });
  return (
    <>
      <div className="row">
        <h1>{me.fullName}</h1>
        <form action="/auth/signout" method="post"><button>Sign out</button></form>
      </div>
      <p className="mut">Student ID {me.studentId} · Roll no. {me.rollNo} · {me.school}</p>
      <Student docs={docs.map(({ pdfPath, extracted, ...d }) => ({ ...d, extracted: extracted as Extracted, hasPdf: !!pdfPath }))} />
      <div className="card"><h2>Access log</h2>
        {log.length ? log.map((l) => <div key={l.id} className="mut">{l.at.toLocaleString()}: {l.ok ? "documents viewed" : "failed attempt"}</div>) : <span className="mut">No access yet.</span>}
      </div>
    </>
  );
}
