import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const t = req.cookies.get("pp_session")?.value;
  try {
    if (!t) throw new Error("no session");
    await jwtVerify(t, new TextEncoder().encode(process.env.AUTH_SECRET!));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}
export const config = { matcher: ["/dashboard/:path*", "/school/:path*"] };
