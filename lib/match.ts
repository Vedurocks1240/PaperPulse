const toks = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
export function nameMatches(a: string, b: string) {
  const A = toks(a), B = toks(b);
  if (!A.length || !B.length) return true;
  const [s, l] = A.length <= B.length ? [A, B] : [B, A];
  return s.every((t) => l.includes(t));
}
const compact = (s: string) => s.replace(/\W/g, "").toUpperCase();
// Compares what the AI read off the document with the student's account. Returns a note, or null when fine.
export function flagFor(f: Record<string, unknown>, u: { fullName: string; rollNo: string | null }) {
  const out: string[] = [];
  if (typeof f.name === "string" && !nameMatches(f.name, u.fullName)) out.push("Name on document differs from the account");
  if (typeof f.rollNo === "string" && u.rollNo && compact(f.rollNo) !== compact(u.rollNo)) out.push("Roll no. on document differs from the account");
  return out.join("; ") || null;
}
