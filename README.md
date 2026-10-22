# PaperPulse

Next.js 14 (TypeScript) + Supabase (auth, Postgres, private file storage), deployable on Vercel.

## Run locally
1. Create a project at supabase.com. In **SQL Editor**, run `supabase/schema.sql`.
2. `cp .env.example .env.local` and fill in the values (Project Settings > API). Generate `CODE_PEPPER` with `openssl rand -hex 32`.
3. `npm install && npm run dev`, then open http://localhost:3000.
4. Sign up as a student. For a school account, sign up normally, then run in the SQL Editor:
   `update profiles set role='school' where id='<user uuid from Authentication > Users>';`
   Use the same school name as the students (schools only see their own students' documents).

## Deploy
Push to GitHub, import the repo in Vercel, add the four env vars from `.env.example`, deploy.
In Supabase > Authentication > URL Configuration, add your Vercel URL.

## How it works
- Look: dark glassmorphism with a terminal feel, a floating bottom dock (`components/Dock.tsx`) and styles in `app/globals.css`.
- Students upload to a private bucket (`documents/<user id>/...`). Row Level Security keeps each student to their own rows and files.
- Share codes are 6 characters, stored only as an HMAC hash, with an expiry. `/api/verify` checks student ID + roll no. + code, logs the attempt, and returns 5-minute signed file links.
- Schools verify or reject documents for their own school only.
- UIDA (the floating blob, top right) lives in `components/Uida.tsx`; OpenDyslexic comes from `@fontsource/opendyslexic`.

## Not built yet
- OCR to searchable PDF and AI field extraction (marked with a TODO in `components/Student.tsx`). Needs a separate service because OCRmyPDF can't run on Vercel functions.
- Rate limiting on `/api/verify` (needed before real use, codes are guessable otherwise).
- School accounts are promoted by hand, and schools do not preload a student roster yet.
