import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** Stable Microsoft Entra object id (`oid`). */
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
  }
}
