import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser, checkFileToken, sameSchool, UUID } from "@/lib/auth";

const no = () => new NextResponse("Not found", { status: 404 });

// Allowed: the owner, a school user at the owner's school, or someone holding a 5-minute token from /api/verify.
// The private blob URL is never sent to the browser; the file is streamed through this route.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) return no();
  const doc = await db.document.findUnique({ where: { id: params.id }, include: { owner: { select: { school: true } } } });
  if (!doc) return no();
  let ok = await checkFileToken(new URL(req.url).searchParams.get("t"), doc.id);
  if (!ok) {
    const u = await getUser();
    ok = !!u && (doc.ownerId === u.id || (u.role === "SCHOOL" && sameSchool(u.school, doc.owner.school)));
  }
  if (!ok) return no();
  const r = await get(doc.blobPath, { access: "private" });
  if (r?.statusCode !== 200) return no();
  return new NextResponse(r.stream, {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
