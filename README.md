# PaperPulse

Next.js 14 (TypeScript) + Prisma on Neon Postgres + Vercel Blob (private) for files. Dark glass UI with a terminal feel, a floating dock and the UIDA (User Interface Device Adaptation) blob.

## Run locally
1. **Neon:** create a project at neon.tech. Copy the pooled connection string as `DATABASE_URL` and the direct one as `DIRECT_URL`.
2. **Vercel Blob:** link the project (`vercel link`), create a **private** store with `vercel blob create-store paperpulse-files --access private --yes`, then run `vercel env pull .env.local` to get the credentials locally.
3. `cp .env.example .env.local` (keep any values `vercel env pull` added), fill in `DATABASE_URL`, `DIRECT_URL`, and generate `AUTH_SECRET` and `CODE_PEPPER` with `openssl rand -hex 32`.
4. `npm install && npm run db:push && npm run dev`, then open http://localhost:3000.
5. Sign up as a student. For a school account, sign up, then run in `npx prisma studio` (or the Neon SQL Editor): set that user's `role` to `SCHOOL`. Use the same school name as the students.

## Deploy
Push to GitHub and import the repo in Vercel. Add the Neon integration (it sets `DATABASE_URL`; add `DIRECT_URL` yourself), connect the private Blob store to the project, add `AUTH_SECRET` and `CODE_PEPPER`, deploy. Run `npm run db:push` once against the Neon database.

## How it works
- **Login:** email + password (bcrypt) stored via Prisma, with a signed HttpOnly session cookie. Every route checks the session in code.
- **Files:** uploaded to a private Vercel Blob store and streamed back through `/api/files/[id]` after an access check, so the blob URL is never exposed. Limit is 4 MB per file (Vercel's request body limit); big phone photos are shrunk in the browser first. The SHA-256 is computed on the server.
- **Sharing:** 6-character codes stored as an HMAC hash, with expiry. `/api/verify` checks student ID + roll no. + code, logs the attempt, and returns file links that work for 5 minutes. After 8 failed attempts a student's codes lock for 15 minutes.
- **Schools** can open, verify or reject documents from their own school's students.

## Not built yet
- OCR to searchable PDF and AI field extraction (TODO in `components/Student.tsx`). It needs a separate service because OCRmyPDF can't run on Vercel functions.
- School roster upload: students type their own student ID and roll no. at signup, so someone could register another student's ID first.
- Password reset, email verification, per-IP rate limiting on login, and uploads over 4 MB (use Vercel Blob client uploads).
