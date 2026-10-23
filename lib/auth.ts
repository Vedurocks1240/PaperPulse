import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHmac } from "crypto";
import type { Role } from "@prisma/client";
import { db } from "./db";

export type User = { id: string; email: string; role: Role; fullName: string; studentId: string | null; rollNo: string | null; school: string | null };
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET!);
export const hashCode = (c: string) => createHmac("sha256", process.env.CODE_PEPPER!).update(c.trim().toUpperCase()).digest("hex");
export const sameSchool = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export async function startSession(userId: string) {
  const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setExpirationTime("7d").sign(key());
  cookies().set("pp_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 604800 });
}
export const endSession = () => cookies().delete("pp_session");

export async function getUser(): Promise<User | null> {
  const t = cookies().get("pp_session")?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    return await db.user.findUnique({ where: { id: payload.sub! }, select: { id: true, email: true, role: true, fullName: true, studentId: true, rollNo: true, school: true } });
  } catch { return null; }
}

// Short-lived link token so a verifier (no account) can open one shared file.
export const fileToken = (docId: string) => new SignJWT({ doc: docId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("5m").sign(key());
export async function checkFileToken(t: string | null, docId: string) {
  if (!t) return false;
  try { return (await jwtVerify(t, key())).payload.doc === docId; } catch { return false; }
}
