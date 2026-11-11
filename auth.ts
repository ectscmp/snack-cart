import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

import { authConfig } from "@/auth.config";
import {
  ensureUser,
  getSettings,
  syncUserClassFromGroups,
  syncUserRolesFromGroups,
} from "@/lib/db";
import { fetchGroupIdsFromGraph, normalizeGroupIds } from "@/lib/entra";

const baseJwt = authConfig.callbacks.jwt;

type JwtCallback = NonNullable<NonNullable<NextAuthConfig["callbacks"]>["jwt"]>;

const jwtCallback: JwtCallback = async (params) => {
  const token = (await baseJwt(params)) ?? params.token;

  // `user` (and the Entra `profile`) are only present during sign-in, so
  // this runs once per login rather than on every session read.
  if (params.user) {
    const entraProfile = params.profile as
      | { groups?: unknown }
      | undefined;

    // Merge both sources. The ID token claim only carries the groups the app
    // registration is configured to emit (and none on overage); Graph also
    // catches Microsoft 365 and nested groups. If neither yields data, leave
    // existing roles alone rather than revoking them.
    const fromToken = normalizeGroupIds(entraProfile?.groups);
    const fromGraph = params.account?.access_token
      ? await fetchGroupIdsFromGraph(params.account.access_token)
      : null;

    const groupIds =
      fromToken === null && fromGraph === null
        ? null
        : Array.from(new Set([...(fromToken ?? []), ...(fromGraph ?? [])]));

    if (groupIds) {
      const userId =
        typeof token.uid === "string" ? token.uid : params.user.id;
      const email =
        typeof token.email === "string" ? token.email : params.user.email;

      if (userId && email) {
        ensureUser({
          id: userId,
          email,
          name:
            (typeof token.name === "string" ? token.name : null) ||
            params.user.name?.trim() ||
            email.split("@")[0],
          image: typeof token.picture === "string" ? token.picture : null,
        });

        if (groupIds.length > 0) {
          syncUserClassFromGroups(userId, groupIds);
        }

        const classId =
          groupIds.length > 0
            ? syncUserClassFromGroups(userId, groupIds)
            : null;

        const settings = getSettings();
        const granted = syncUserRolesFromGroups(userId, groupIds, {
          // Settings win; environment variables are the deploy fallback.
          adminGroupId:
            settings.adminGroupId || process.env.ENTRA_ADMIN_GROUPS || null,
          staffGroupId:
            settings.staffGroupId || process.env.ENTRA_STAFF_GROUPS || null,
        });

        console.info(
          `[auth] ${email}: ${groupIds.length} group(s); roles ${
            granted.length ? granted.join(", ") : "none"
          }; class ${classId ?? "none"}`,
        );
      }
    }
  }

  return token;
};

/**
 * Node-only configuration. The proxy/middleware imports `auth.config.ts`, which
 * must stay free of database access, so the Entra group → class sync lives here
 * where the route handlers and server components already run on Node.
 */
const config = {
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    jwt: jwtCallback,
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
