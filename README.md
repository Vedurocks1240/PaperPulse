# PaperPulse

Next.js 14 (TypeScript) + Prisma on Neon Postgres + Vercel Blob (private) for files. Dark glass UI with a terminal feel, a floating dock and the UIDA (User Interface Device Adaptation) blob.

## Set up on Vercel (Neon + Blob already connected)
1. **Env vars** (Vercel > Project > Settings > Environment Variables). The Neon integration with prefix `STORAGE` should already have created `STORAGE_DATABASE_URL` and `STORAGE_DATABASE_URL_UNPOOLED`. Add `AUTH_SECRET` and `CODE_PEPPER` (each from `openssl rand -hex 32`). Optional: `OCR_SERVICE_URL`, `OCR_API_KEY`.
2. **Blob:** Vercel > Storage > Create > Blob, choose **private**, connect it to the project and leave its prefix at the default so `BLOB_READ_WRITE_TOKEN` is created.
3. **Tables:** run `db/schema.sql` in the Neon SQL Editor (Vercel > Storage > your database > Open in Neon), or locally `npm run db:push`. Do this before the first deploy.
4. **Deploy:** push to GitHub; Vercel builds it. Preview deployments get their own Neon branch, which copies the tables as they were when the branch was made.
5. **First accounts:** sign up, then promote a school user with the UPDATE at the bottom of `db/schema.sql`.

## Run locally
`npm i -g vercel && vercel link && vercel env pull .env.local`, then `npm install && npm run dev` and open http://localhost:3000. `npm run db:push` also reads `.env.local`.

## How it works
- **Login:** email + password (bcrypt) stored via Prisma, with a signed HttpOnly session cookie. Every route checks the session in code.
- **Files:** uploaded to a private Vercel Blob store and streamed back through `/api/files/[id]` after an access check, so the blob URL is never exposed. Limit is 4 MB per file (Vercel's request body limit); big phone photos are shrunk in the browser first. The SHA-256 is computed on the server.
- **Sharing:** 6-character codes stored as an HMAC hash, with expiry. `/api/verify` checks student ID + roll no. + code, logs the attempt, and returns file links that work for 5 minutes. After 8 failed attempts a student's codes lock for 15 minutes.
- **Schools** can open, verify or reject documents from their own school's students.

## OCR service (photo to searchable PDF + AI fields)
`ocr-service/` is a small Python FastAPI app, kept separate because OCRmyPDF can't run on Vercel functions.
1. Deploy it anywhere that runs Docker (Render, Railway, Fly.io): `ocr-service/Dockerfile`. Set `OCR_API_KEY` (any long random string) and `ANTHROPIC_API_KEY`. English, Hindi and Gujarati are installed; change `OCR_LANGS` (for example `eng+hin`) to adjust.
2. In the web app set `OCR_SERVICE_URL` (the service's URL) and the same `OCR_API_KEY`.
3. On upload the service cleans photos, warns if blurry, makes a text-selectable PDF, and Claude reads the name, roll no., course, grade, date and issuer from the text. The original file and its SHA-256 are never changed; the PDF is stored beside it.
4. If the name or roll no. read from the document differs from the account, the document is flagged for the school. Without `OCR_SERVICE_URL`, uploads simply skip OCR.
Run it locally with `cd ocr-service && pip install -r requirements.txt && uvicorn main:app` (needs tesseract, ghostscript, qpdf and poppler installed).

## School roster
Schools upload a CSV (`student_id,roll_no,full_name`) on the School page. Once a school has a roster, students can only sign up if their name, student ID and roll no. match an unclaimed row, and their school is taken from the roster. Schools without a roster can still sign students up freely. Student IDs must be unique across all schools (for example, prefix them with a school code).

## Not built yet
- Letting the student edit the AI-read fields before saving (they are shown read-only and compared with the account).
- Auto-crop and perspective correction for photos (OCRmyPDF only deskews).
- Password reset, email verification, per-IP rate limiting on login, and uploads over 4 MB (use Vercel Blob client uploads).
