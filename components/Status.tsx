export default function Status({ s }: { s: string }) {
  const m: Record<string, [string, string]> = { verified: ["ok", "verified by school"], pending: ["warn", "awaiting school"], rejected: ["bad", "rejected"] };
  const [c, t] = m[s.toLowerCase()] ?? ["bad", s.toLowerCase()];
  return <span className={`tag ${c}`}>{t}</span>;
}
