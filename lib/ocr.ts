export type Fields = Record<string, string | null>;

// Calls the separate OCR service (see ocr-service/). Returns null when it is not configured or fails,
// so uploads still work without OCR.
export async function runOcr(bytes: Buffer, name: string, mime: string): Promise<{ pdf: Buffer; fields: Fields; blurry: boolean } | null> {
  const url = process.env.OCR_SERVICE_URL;
  if (!url) return null;
  try {
    const fd = new FormData();
    fd.set("file", new Blob([new Uint8Array(bytes)], { type: mime }), name);
    const r = await fetch(`${url.replace(/\/$/, "")}/process`, { method: "POST", headers: { "x-api-key": process.env.OCR_API_KEY ?? "" }, body: fd, signal: AbortSignal.timeout(50000) });
    if (!r.ok) return null;
    const j = await r.json();
    return { pdf: Buffer.from(j.pdf_b64, "base64"), fields: j.fields ?? {}, blurry: !!j.blurry };
  } catch { return null; }
}
