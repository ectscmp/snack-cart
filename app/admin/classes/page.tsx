import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { School } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/snack/admin-nav";
import { ClassForm } from "@/components/snack/class-form";
import { ClassImportForm } from "@/components/snack/class-import-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { countClassMembers, listClasses } from "@/lib/db";

export const metadata: Metadata = {
  title: "Classes",
  description: "Create classes and set their delivery rooms.",
};

export default function AdminClassesPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">Classes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Each class can have a default delivery room and one or more Entra
              groups. Members of those groups are added automatically at
              sign-in.
            </p>
          </div>
          <AdminNav />
        </div>

        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <ClassesContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function ClassesContent() {
  await connection();

  await requireAdmin();
  const classes = listClasses(true);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        {classes.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-background px-6 py-16 text-center text-sm text-muted-foreground">
            No classes yet. Add the first one below.
          </div>
        ) : (
          classes.map((classRecord) => {
            const members = countClassMembers(classRecord.id);
            const groupCount = (classRecord.entraGroupId ?? "")
              .split(/[\s,;]+/)
              .filter(Boolean).length;

            return (
              <Card key={classRecord.id} className="min-w-0">
                <CardHeader>
                  <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-base">
                    <School className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 break-words">{classRecord.name}</span>
                  </CardTitle>
                  <CardDescription className="break-words">
                    {classRecord.room ? `Room ${classRecord.room} · ` : ""}
                    {members} member{members === 1 ? "" : "s"} ·{" "}
                    {classRecord.active ? "Active" : "Inactive"} ·{" "}
                    {groupCount > 0
                      ? `${groupCount} Entra group${
                          groupCount === 1 ? "" : "s"
                        } linked`
                      : "No Entra group — assigned manually"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ClassForm classRecord={classRecord} />
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="space-y-6">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Add a class</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassForm />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Import from CSV</CardTitle>
            <CardDescription>
              Bulk add classes from a spreadsheet export.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClassImportForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
