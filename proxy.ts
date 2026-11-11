import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

/**
 * Optimistic route protection: rewrites unauthenticated requests to the
 * sign-in page before a page starts streaming. Every page, action, and route
 * handler still authorizes independently.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/orders/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/staff/:path*",
    "/admin/:path*",
  ],
};
