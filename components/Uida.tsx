"use client";
import { useEffect, useState } from "react";

// UIDA: User Interface Device Adaptation.
type Prefs = { theme: "auto" | "light" | "dark" | "hc"; bright: number; contrast: number; night: number; size: number; dys: boolean };
const DEF: Prefs = { theme: "dark", bright: 100, contrast: 100, night: 0, size: 100, dys: false };
const mq = (q: string) => window.matchMedia(q).matches;

export default function Uida() {
  const [p, setP] = useState<Prefs>(DEF);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { try { setP({ ...DEF, ...JSON.parse(localStorage.getItem("uida") || "{}") }); } catch {} }, []);
  useEffect(() => {
    const d = document.documentElement;
    const t = p.theme === "auto" ? (mq("(prefers-contrast: more)") ? "hc" : mq("(prefers-color-scheme: dark)") ? "dark" : "light") : p.theme;
    d.dataset.theme = t;
    d.style.setProperty("--fs", p.size + "%");
    d.classList.toggle("dys", p.dys);
    // Filter only the page, not the dock or this panel, so the controls stay reachable.
    const app = document.getElementById("app");
    if (app) app.style.filter = `brightness(${p.bright}%) contrast(${p.contrast}%)`;
    try { localStorage.setItem("uida", JSON.stringify(p)); } catch {}
  }, [p]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open]);

  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setP((o) => ({ ...o, [k]: v }));
  const adapt = () => {
    const h = new Date().getHours(), night = h >= 20 || h < 6, dark = mq("(prefers-color-scheme: dark)");
    setP((o) => ({ ...o, theme: "auto", night: night ? 30 : 0, bright: night || dark ? 90 : 100,
      size: devicePixelRatio >= 2 && innerWidth < 500 ? Math.max(o.size, 110) : o.size }));
    setMsg("Applied your device theme, contrast preference and time of day. Adjust anything below.");
  };
  const slider = (k: "bright" | "contrast" | "night" | "size", label: string, min: number, max: number) => (
    <>
      <label htmlFor={k}>{label} {p[k]}%</label>
      <input id={k} type="range" min={min} max={max} step={5} value={p[k]} onChange={(e) => set(k, +e.target.value)} />
    </>
  );
  return (
    <>
      <div id="nl" aria-hidden style={{ opacity: p.night / 100 }} />
      <button className="blob" aria-label="UIDA display settings" aria-expanded={open} aria-controls="uida" onClick={() => setOpen(!open)}>UIDA</button>
      {open && (
        <aside id="uida" aria-label="UIDA display settings">
          <div className="row"><h2>UIDA --adapt</h2><button onClick={() => setOpen(false)}>Close</button></div>
          <button className="pri" style={{ width: "100%" }} onClick={adapt}>Adapt to my device</button>
          <p className="mut" role="status">{msg}</p>
          <label htmlFor="theme">Theme</label>
          <select id="theme" value={p.theme} onChange={(e) => set("theme", e.target.value as Prefs["theme"])}>
            <option value="dark">Dark glass</option><option value="light">Light glass</option><option value="hc">High contrast</option><option value="auto">Match device</option>
          </select>
          {slider("bright", "Brightness", 60, 130)}
          {slider("contrast", "Contrast", 80, 150)}
          {slider("night", "Night light warmth", 0, 60)}
          {slider("size", "Text size", 90, 150)}
          <label style={{ display: "flex", gap: ".5rem", alignItems: "center", color: "var(--ink)" }}>
            <input type="checkbox" style={{ width: "auto" }} checked={p.dys} onChange={(e) => set("dys", e.target.checked)} /> OpenDyslexic font
          </label>
          <button style={{ marginTop: ".8rem" }} onClick={() => setP(DEF)}>Reset</button>
        </aside>
      )}
    </>
  );
}
