-- PaperPulse database schema for Neon Postgres.
-- Run once in the Neon SQL Editor (or: psql "$DATABASE_URL" -f db/schema.sql).
-- It matches prisma/schema.prisma, so the app's Prisma Client works with it directly.
-- You can use this OR `npx prisma db push`, not both on an empty database.

CREATE TYPE "Role"   AS ENUM ('STUDENT', 'SCHOOL');
CREATE TYPE "Status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- Accounts (students and school staff)
CREATE TABLE "User" (
  "id"           TEXT         NOT NULL,
  "email"        TEXT         NOT NULL,
  "passwordHash" TEXT         NOT NULL,
  "role"         "Role"       NOT NULL DEFAULT 'STUDENT',
  "fullName"     TEXT         NOT NULL,
  "studentId"    TEXT,
  "rollNo"       TEXT,
  "school"       TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key"     ON "User"("email");
CREATE UNIQUE INDEX "User_studentId_key" ON "User"("studentId");

-- Uploaded documents. Files live in Vercel Blob; only their paths are stored here.
CREATE TABLE "Document" (
  "id"        TEXT         NOT NULL,
  "ownerId"   TEXT         NOT NULL,
  "docType"   TEXT         NOT NULL,
  "fileName"  TEXT         NOT NULL,
  "mime"      TEXT         NOT NULL,
  "sha256"    TEXT         NOT NULL,
  "blobUrl"   TEXT         NOT NULL,
  "blobPath"  TEXT         NOT NULL,
  "pdfUrl"    TEXT,
  "pdfPath"   TEXT,
  "ocrStatus" TEXT         NOT NULL DEFAULT 'none',
  "extracted" JSONB,
  "flag"      TEXT,
  "status"    "Status"     NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Document_ownerId_idx" ON "Document"("ownerId");

-- Share codes a student creates for verifiers (stored hashed, with expiry)
CREATE TABLE "Share" (
  "id"        TEXT         NOT NULL,
  "ownerId"   TEXT         NOT NULL,
  "codeHash"  TEXT         NOT NULL,
  "docIds"    TEXT[],
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Share_ownerId_codeHash_idx" ON "Share"("ownerId", "codeHash");

-- Every verifier attempt (also drives the failed-attempt lockout)
CREATE TABLE "AccessLog" (
  "id"      SERIAL       NOT NULL,
  "ownerId" TEXT         NOT NULL,
  "ok"      BOOLEAN      NOT NULL,
  "at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccessLog_ownerId_at_idx" ON "AccessLog"("ownerId", "at");

-- Student list uploaded by each school
CREATE TABLE "RosterEntry" (
  "id"          TEXT NOT NULL,
  "school"      TEXT NOT NULL,
  "schoolKey"   TEXT NOT NULL,
  "studentId"   TEXT NOT NULL,
  "rollNo"      TEXT NOT NULL,
  "fullName"    TEXT NOT NULL,
  "claimedById" TEXT,
  CONSTRAINT "RosterEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RosterEntry_claimedById_key"         ON "RosterEntry"("claimedById");
CREATE UNIQUE INDEX "RosterEntry_schoolKey_studentId_key" ON "RosterEntry"("schoolKey", "studentId");

-- Relationships (deleting a user removes their documents, shares and log)
ALTER TABLE "Document"  ADD CONSTRAINT "Document_ownerId_fkey"  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Share"     ADD CONSTRAINT "Share_ownerId_fkey"     FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- After a school staff member signs up, promote their account (run separately):
--   UPDATE "User" SET "role" = 'SCHOOL', "school" = 'Demo Public School' WHERE "email" = 'staff@example.com';
--
-- To wipe everything and start over (DESTROYS ALL DATA):
--   DROP TABLE "AccessLog", "Share", "Document", "RosterEntry", "User" CASCADE;
--   DROP TYPE "Status", "Role";
-- ---------------------------------------------------------------------------
