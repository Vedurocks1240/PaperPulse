export default function Status({ s }: { s: string }) {
  const m: Record<string, [string, string]> = { verified: ["ok", "verified by school"], pending: ["warn", "awaiting school"], rejected: ["bad", "rejected"] };
  const [c, t] = m[s] ?? ["bad", s];
  return <span className={`tag ${c}`}>{t}</span>;
}
