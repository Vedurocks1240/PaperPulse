"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Status from "./Status";

type Doc = { id: string; docType: string; fileName: string; sha256: string; status: string };

// Big phone photos are shrunk before upload so they fit the 4 MB limit. Smaller files are sent untouched.
async function shrink(f: File): Promise<File> {
  if (!f.type.startsWith("image/") || f.size <= 3.5 * 1024 * 1024) return f;
  const bmp = await createImageBitmap(f);
  const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.85));
  return new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export default function Student({ docs }: { docs: Doc[] }) {
  const router = useRouter();
  const [type, setType] = useState("Marksheet");
  const [picked, setPicked] = useState<string[]>([]);
  const [mins, setMins] = useState(60);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target, f = input.files?.[0];
    if (!f) return;
    setMsg("Uploading…");
    const fd = new FormData();
    fd.set("file", await shrink(f));
    fd.set("docType", type);
    // TODO: send the file to an OCR service here (cleanup, OCRmyPDF, AI field extraction) and store the searchable PDF.
    const r = await fetch("/api/documents", { method: "POST", body: fd });
    setMsg(r.ok ? "Saved. Your school can now review it." : (await r.json()).error);
    input.value = "";
    router.refresh();
  }
  async function share() {
    const r = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docIds: picked, minutes: mins }) });
    const j = await r.json();
    r.ok ? (setCode(j.code), setMsg("")) : setMsg(j.error);
  }
  async function remove(id: string) {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    setPicked(picked.filter((x) => x !== id));
    router.refresh();
  }
  return (
    <>
      <div className="card">
        <h2>Add a document</h2>
        <label htmlFor="t">Document type</label><input id="t" value={type} onChange={(e) => setType(e.target.value)} />
        <label htmlFor="f">Take a photo or choose a file (max 4 MB)</label>
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
              <b>{d.docType}</b> <Status s={d.status} />
            </label>
            <div className="mut">{d.fileName} · SHA-256 {d.sha256.slice(0, 16)}…</div>
            <a href={`/api/files/${d.id}`} target="_blank" rel="noreferrer">Open</a>{" "}
            <button onClick={() => remove(d.id)}>Delete</button>
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
