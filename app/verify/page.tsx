"use client";
import { useState } from "react";
import Status from "@/components/Status";

type V = { id: string; docType: string; fileName: string; sha256: string; status: string; url?: string; pdfUrl?: string | null };

export default function Verify() {
  const [f, setF] = useState({ studentId: "", roll: "", code: "" });
  const [docs, setDocs] = useState<V[]>([]);
  const [msg, setMsg] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setDocs([]); setMsg("");
    const r = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json();
    r.ok ? setDocs(j.docs) : setMsg(j.error);
  }
  const on = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form className="card" onSubmit={go}>
      <h1>Verify a student</h1>
      <div className="grid">
        <div><label htmlFor="a">Student ID</label><input id="a" required autoComplete="off" value={f.studentId} onChange={on("studentId")} /></div>
        <div><label htmlFor="b">Roll no.</label><input id="b" required autoComplete="off" value={f.roll} onChange={on("roll")} /></div>
        <div><label htmlFor="c">Share code</label><input id="c" required autoComplete="off" value={f.code} onChange={on("code")} /></div>
      </div>
      <button className="pri" style={{ marginTop: ".7rem" }}>View documents</button>
      <p role="alert" className="bad">{msg}</p>
      {docs.map((d) => (
        <div className="doc" key={d.id}>
          <b>{d.docType}</b> <Status s={d.status} />
          <div className="mut">{d.fileName} · SHA-256 {d.sha256.slice(0, 16)}…</div>
          {d.url && <a href={d.url} target="_blank" rel="noreferrer">Open document (link works for 5 minutes)</a>}
          {d.pdfUrl && <> · <a href={d.pdfUrl} target="_blank" rel="noreferrer">Searchable PDF</a></>}
        </div>
      ))}
    </form>
  );
}
