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

    // Entra may omit the claim entirely (not configured) or replace it with
    // an overage marker when the user is in many groups. Fall back to
    // Microsoft Graph in both cases.
    let groupIds = normalizeGroupIds(entraProfile?.groups);

    if (groupIds === null) {
      groupIds = params.account?.access_token
        ? await fetchGroupIdsFromGraph(params.account.access_token)
        : null;
    }

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

        const settings = getSettings();

        syncUserRolesFromGroups(userId, groupIds, {
          adminGroupId: settings.adminGroupId,
          staffGroupId: settings.staffGroupId,
        });
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
