"""PaperPulse OCR service.

POST /process (multipart "file", header x-api-key)
  1. cleans up photos (grayscale + contrast) and flags blurry ones
  2. OCRmyPDF makes a text-selectable PDF (the original photo stays the visible page)
  3. Claude reads the OCR text and returns structured fields (it copies, it does not correct)
Run: uvicorn main:app   Env: OCR_API_KEY, ANTHROPIC_API_KEY, optional OCR_LANGS, ANTHROPIC_MODEL.
"""
import base64, json, os, secrets, subprocess, tempfile
from pathlib import Path

import cv2
import numpy as np
import ocrmypdf
from fastapi import FastAPI, File, Header, HTTPException, UploadFile

app = FastAPI()
_have = set(subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True).stdout.split())
# Use only the language packs that are installed, so a missing pack never breaks OCR.
LANGS = [l for l in os.getenv("OCR_LANGS", "eng+hin+guj").split("+") if l in _have] or ["eng"]
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")

PROMPT = """You read text from an Indian school or college certificate or marksheet. The text came from OCR and may contain errors; it may be English, Hindi or Gujarati.
Return ONLY a JSON object with these keys: name, rollNo, course, grade, issueDate, issuer, documentType.
Copy values exactly as written. Use null for anything that is not clearly present. Never guess, translate or correct values."""


def clean_image(raw: bytes):
    img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(415, "Unreadable image")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    small = cv2.resize(gray, None, fx=1000 / max(gray.shape), fy=1000 / max(gray.shape)) if max(gray.shape) > 1000 else gray
    blurry = float(cv2.Laplacian(small, cv2.CV_64F).var()) < 60  # low edge variance means out of focus
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    return cv2.imencode(".png", gray)[1].tobytes(), blurry


def extract_fields(text: str) -> dict:
    if not text.strip() or not os.getenv("ANTHROPIC_API_KEY"):
        return {}
    from anthropic import Anthropic
    msg = Anthropic().messages.create(model=MODEL, max_tokens=600, messages=[{"role": "user", "content": f"{PROMPT}\n\nOCR text:\n{text[:12000]}"}])
    raw = msg.content[0].text
    try:
        data = json.loads(raw[raw.index("{"): raw.rindex("}") + 1])
        return {k: (str(v) if v is not None else None) for k, v in data.items()}
    except Exception:
        return {}


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/process")
def process(file: UploadFile = File(...), x_api_key: str = Header("")):
    if not secrets.compare_digest(x_api_key, os.environ["OCR_API_KEY"]):
        raise HTTPException(401, "Bad API key")
    raw = file.file.read()
    is_image = (file.content_type or "").startswith("image/")
    blurry = False
    with tempfile.TemporaryDirectory() as d:
        src, out = Path(d) / ("in.png" if is_image else "in.pdf"), Path(d) / "out.pdf"
        if is_image:
            raw, blurry = clean_image(raw)
        src.write_bytes(raw)
        try:
            ocrmypdf.ocr(src, out, language=LANGS, deskew=True, rotate_pages=True, image_dpi=300,
                         skip_text=True, output_type="pdf", optimize=1, progress_bar=False)
        except Exception as e:
            raise HTTPException(422, f"OCR failed: {e}")
        text = subprocess.run(["pdftotext", "-layout", str(out), "-"], capture_output=True, text=True).stdout
        return {"pdf_b64": base64.b64encode(out.read_bytes()).decode(), "fields": extract_fields(text), "blurry": blurry}
