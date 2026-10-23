export type Extracted = Record<string, string | null> | null;
const KEYS = ["name", "rollNo", "course", "grade", "issueDate", "issuer"];

export default function DocInfo({ id, extracted, flag, hasPdf }: { id: string; extracted: Extracted; flag: string | null; hasPdf: boolean }) {
  const bits = KEYS.filter((k) => extracted?.[k]).map((k) => `${k}: ${extracted![k]}`);
  return (
    <>
      {bits.length > 0 && <div className="mut">Read from document: {bits.join(" · ")}</div>}
      {flag && <div className="bad">{flag}</div>}
      <a href={`/api/files/${id}`} target="_blank" rel="noreferrer">Open original</a>
      {hasPdf && <> · <a href={`/api/files/${id}?v=pdf`} target="_blank" rel="noreferrer">Open searchable PDF</a></>}
    </>
  );
}
