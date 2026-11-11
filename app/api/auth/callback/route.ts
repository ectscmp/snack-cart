import { NextRequest } from "next/server";

import { handlers } from "@/auth";

/**
 * Auth.js only serves OAuth callbacks at `${basePath}/callback/${providerId}`
 * and has no option to change that. The Entra app registration uses the
 * shorter `/api/auth/callback`, so `auth.config.ts` sends that URI in the
 * authorization and token requests and this route forwards the response back
 * onto Auth.js's real handler.
 *
 * A static segment takes precedence over the `[...nextauth]` catch-all, so
 * `/api/auth/callback` lands here while every other auth action still goes to
 * the catch-all. The `code`, `state`, and `session_state` query parameters are
 * preserved by cloning the request URL.
 */
const PROVIDER_CALLBACK = "/api/auth/callback/microsoft-entra-id";

export function GET(request: Request) {
  return forward(request);
}

export function POST(request: Request) {
  return forward(request);
}

async function forward(request: Request) {
  const url = new URL(request.url);
  url.pathname = PROVIDER_CALLBACK;

  const headers = new Headers(request.headers);
  // The body is re-created below, so the original length no longer applies.
  headers.delete("content-length");

  const body =
    request.method === "POST" ? await request.arrayBuffer() : undefined;

  // `NextRequest`, not `Request`: the next-auth handler reads `req.nextUrl`.
  return handlers[request.method === "POST" ? "POST" : "GET"](
    new NextRequest(url, { method: request.method, headers, body }),
  );
}
