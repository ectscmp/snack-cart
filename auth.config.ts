import { customFetch, type NextAuthConfig } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

import type { MicrosoftEntraIDProfile } from "next-auth/providers/microsoft-entra-id";

const fallbackIssuer = "https://login.microsoftonline.com/common/v2.0";

const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID?.trim() || undefined;
const clientSecret =
  process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET?.trim() || undefined;
const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER?.trim() || undefined;

/**
 * True once the Entra ID app registration values are present. The sign-in page
 * uses this to show setup instructions instead of a button that cannot work.
 */
export const microsoftConfigured = Boolean(clientId && clientSecret && issuer);

/**
 * Canonical origin of this deployment. Auth.js already rewrites incoming
 * requests to `AUTH_URL` (see `reqWithEnvURL`), so the callback URI must use
 * the same origin or Entra will reject the token exchange.
 */
const appOrigin = (
  process.env.AUTH_URL?.trim() ||
  `http://localhost:${process.env.PORT ?? "3000"}`
).replace(/\/+$/, "");

/**
 * Auth.js always derives its callback from `${basePath}/callback/${providerId}`,
 * i.e. `/api/auth/callback/microsoft-entra-id`, and offers no option to change
 * it. This app registers the shorter `/api/auth/callback` in Entra ID instead,
 * so the URI has to be supplied in *both* halves of the OAuth exchange:
 *
 *   1. the authorization request (`authorization.params.redirect_uri`), and
 *   2. the token request body, rewritten in `customFetch` below.
 *
 * `app/api/auth/callback/route.ts` maps the short path onto Auth.js's real
 * route.
 */
export const microsoftCallbackUrl = `${appOrigin}/api/auth/callback`;

const microsoft = MicrosoftEntraID({
  clientId,
  clientSecret,
  // Keep a non-empty issuer so Auth.js can initialize the provider even before
  // the app registration exists. Sign-in stays disabled until all three values
  // are set.
  issuer: issuer ?? fallbackIssuer,
  authorization: {
    params: { redirect_uri: microsoftCallbackUrl },
  },
});

/**
 * Keep the provider's own fetch (it patches the discovery document) and only
 * swap the redirect URI Entra sees when the authorization code is redeemed.
 * The token endpoint receives the parameters as a `URLSearchParams` body.
 */
const providerFetch = microsoft[customFetch];

microsoft[customFetch] = async (input, init) => {
  const body = init?.body;

  if (body instanceof URLSearchParams && body.has("redirect_uri")) {
    body.set("redirect_uri", microsoftCallbackUrl);
  }

  return providerFetch?.(input, init) ?? fetch(input, init);
};

/**
 * Auth.js v5 merges `AUTH_MICROSOFT_ENTRA_ID_ISSUER` into the provider using
 * `??=`. An empty `KEY=` in `.env.local` is not nullish, so without a top-level
 * issuer it would replace the value with "" and every session read would fail
 * with InvalidEndpoints.
 */
microsoft.issuer = issuer ?? fallbackIssuer;

export const authConfig = {
  providers: [microsoft],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },
  pages: {
    signIn: "/sign-in",
  },
  trustHost: true,
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const protectedPrefixes = [
        "/dashboard",
        "/orders",
        "/cart",
        "/checkout",
        "/staff",
        "/admin",
      ];

      if (
        !protectedPrefixes.some(
          (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
        )
      ) {
        return true;
      }

      return Boolean(auth?.user);
    },
    jwt({ token, user, profile }) {
      if (user) {
        const entraProfile = profile as MicrosoftEntraIDProfile | undefined;

        // `oid` is stable across apps in the tenant; `sub` is pairwise per app.
        token.uid = entraProfile?.oid ?? user.id;
        token.email =
          entraProfile?.email ??
          entraProfile?.preferred_username ??
          user.email;
        token.name = entraProfile?.name ?? user.name;
        token.picture = user.image;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id =
          typeof token.uid === "string" ? token.uid : (token.sub ?? "");
        session.user.email =
          typeof token.email === "string" ? token.email : session.user.email;
        session.user.name =
          typeof token.name === "string" ? token.name : session.user.name;
        session.user.image =
          typeof token.picture === "string" ? token.picture : session.user.image;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
