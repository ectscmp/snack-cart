import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Search } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/snack/admin-nav";
import { UserForm } from "@/components/snack/user-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { listClasses, listUsers } from "@/lib/db";

export const metadata: Metadata = {
  title: "Users",
  description: "Assign classes and staff or admin roles.",
};

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Everyone signs in as a customer. Add staff or admin roles here.
            </p>
          </div>
          <AdminNav />
        </div>

        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <UsersContent searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function UsersContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();

  await requireAdmin();
  const { q } = await searchParams;
  const users = listUsers(q);
  const classes = listClasses(true);

  return (
    <div className="space-y-4">
      <form method="get" className="flex max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder="Search name or email" />
        <Button type="submit" variant="outline">
          <Search className="size-4" />
          Search
        </Button>
      </form>

      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-background px-6 py-16 text-center text-sm text-muted-foreground">
          No users match that search. People appear here after they sign in.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <CardTitle className="text-base">{user.name}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate">{user.email}</span>
                  {user.className ? (
                    <Badge variant="secondary">{user.className}</Badge>
                  ) : (
                    <Badge variant="outline">No class</Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserForm user={user} classes={classes} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
