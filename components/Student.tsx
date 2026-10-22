"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import Status from "./Status";

type Doc = { id: string; doc_type: string; file_name: string; sha256: string; status: string };

async function sha256(f: File) {
  const h = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function Student({ uid, docs }: { uid: string; docs: Doc[] }) {
  const router = useRouter();
  const [type, setType] = useState("Marksheet");
  const [picked, setPicked] = useState<string[]>([]);
  const [mins, setMins] = useState(60);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMsg("Uploading…");
    const sb = supabaseBrowser();
    const path = `${uid}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, "_")}`;
    const up = await sb.storage.from("documents").upload(path, f);
    if (up.error) return setMsg(up.error.message);
    // TODO: POST the file to /api/ocr here (cleanup + OCRmyPDF + AI field extraction), then store the searchable PDF.
    const ins = await sb.from("documents").insert({ owner: uid, doc_type: type, file_path: path, file_name: f.name, sha256: await sha256(f) });
    setMsg(ins.error ? ins.error.message : "Saved. Your school can now review it.");
    e.target.value = "";
    router.refresh();
  }
  async function share() {
    const r = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docIds: picked, minutes: mins }) });
    const j = await r.json();
    r.ok ? setCode(j.code) : setMsg(j.error);
  }
  async function remove(d: Doc) {
    await supabaseBrowser().from("documents").delete().eq("id", d.id);
    router.refresh();
  }
  return (
    <>
      <div className="card">
        <h2>Add a document</h2>
        <label htmlFor="t">Document type</label><input id="t" value={type} onChange={(e) => setType(e.target.value)} />
        <label htmlFor="f">Take a photo or choose a file</label>
        <input id="f" type="file" accept="image/*,application/pdf" capture="environment" onChange={upload} />
        <p role="status" className="mut">{msg}</p>
      </div>
      <div className="card">
        <h2>My documents</h2>
        {docs.length === 0 && <p className="mut">Nothing yet. Add a photo or file above.</p>}
        {docs.map((d) => (
          <div className="doc" key={d.id}>
            <label style={{ display: "flex", gap: ".5rem", alignItems: "center", color: "var(--ink)", margin: 0 }}>
              <input type="checkbox" style={{ width: "auto" }} checked={picked.includes(d.id)}
                onChange={(e) => setPicked(e.target.checked ? [...picked, d.id] : picked.filter((x) => x !== d.id))} />
              <b>{d.doc_type}</b> <Status s={d.status} />
            </label>
            <div className="mut">{d.file_name} · SHA-256 {d.sha256.slice(0, 16)}…</div>
            <button onClick={() => remove(d)}>Delete</button>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Share the ticked documents</h2>
        <label htmlFor="m">Code expires after</label>
        <select id="m" value={mins} onChange={(e) => setMins(+e.target.value)}>
          <option value={10}>10 minutes</option><option value={60}>1 hour</option><option value={1440}>24 hours</option>
        </select>
        <button className="pri" style={{ marginTop: ".7rem" }} disabled={!picked.length} onClick={share}>Create share code</button>
        {code && <p><span className="code">{code}</span><br /><span className="mut">Give the verifier your student ID, roll no. and this code. It is shown once.</span></p>}
      </div>
    </>
  );
}
