import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Role-based route protection middleware.
 *
 * In production, replace the cookie-based checks with a real auth solution
 * (e.g., NextAuth.js, Clerk, or Supabase Auth). For this prototype we use a
 * simple `role` cookie that is set on the login page.
 *
 * Protected route map:
 *   /doctor/*  → requires role === "doctor"
 *   /patient/* → requires role === "patient"
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get("orthoflow_role")?.value;

  // ── Doctor routes ────────────────────────────────────────────────────────────
  if (pathname.startsWith("/doctor")) {
    if (role !== "doctor") {
      const loginUrl = new URL("/login?redirect=/doctor/dashboard", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Patient routes ───────────────────────────────────────────────────────────
  if (pathname.startsWith("/patient")) {
    if (role !== "patient") {
      const loginUrl = new URL("/login?redirect=/patient/exercise", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/doctor/:path*", "/patient/:path*"],
};
