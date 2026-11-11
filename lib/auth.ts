import { cache } from "react";
import { io } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  ensureUser,
  getUser,
  isAdmin,
  isStaff,
  type AppUser,
} from "@/lib/db";

/**
 * Resolves the signed-in Microsoft account and mirrors it into SQLite.
 * `cache()` keeps repeated calls within one request down to a single read.
 */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  // Session lookup reads request cookies, but Auth.js touches crypto before that
  // and Cache Components would otherwise try to include it in the static shell.
  await io();

  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const id = session.user.id?.trim();
  const email = session.user.email?.trim();

  if (!id || !email) {
    return null;
  }

  return (
    getUser(id) ??
    ensureUser({
      id,
      email,
      name: session.user.name?.trim() || email.split("@")[0],
      image: session.user.image ?? null,
    })
  );
});

/**
 * Data Access Layer guard for pages, server actions, and route handlers.
 * Redirecting here is for people; API routes should check `getCurrentUser()`
 * and return 401 instead.
 */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function requireStaff(): Promise<AppUser> {
  const user = await requireUser();

  if (!isStaff(user)) {
    redirect("/dashboard?error=forbidden");
  }

  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();

  if (!isAdmin(user)) {
    redirect("/dashboard?error=forbidden");
  }

  return user;
}

export { isAdmin, isStaff };
