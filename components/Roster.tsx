"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Roster({ total, claimed }: { total: number; claimed: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  async function up(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target, f = input.files?.[0];
    if (!f) return;
    const r = await fetch("/api/roster", { method: "POST", headers: { "Content-Type": "text/csv" }, body: await f.text() });
    const j = await r.json();
    setMsg(r.ok ? `Added ${j.added}. Skipped ${j.skipped} (already listed or incomplete rows).` : j.error);
    input.value = "";
    router.refresh();
  }
  return (
    <div className="card">
      <h2>Student roster</h2>
      <p className="mut">{total} students listed, {claimed} have signed up. Once a roster exists, students can only sign up if their name, student ID and roll no. match a row.</p>
      <label htmlFor="csv">Upload a CSV with columns: student_id, roll_no, full_name</label>
      <input id="csv" type="file" accept=".csv,text/csv" onChange={up} />
      <p role="status" className="mut">{msg}</p>
    </div>
  );
}
