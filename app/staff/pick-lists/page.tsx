import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ClipboardList, MapPin } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StaffNav } from "@/components/snack/staff-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth";
import { listOpenPickListSummaries } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Class pick lists",
  description: "Everything to gather for each class before delivering.",
};

export default function PickListsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Class pick lists
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Combined items for every open order in a class, so you can gather
              everything before walking over.
            </p>
          </div>
          <StaffNav />
        </div>

        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <PickListsContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function PickListsContent() {
  await connection();

  await requireStaff();
  const summaries = listOpenPickListSummaries();

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-background px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ClipboardList className="size-5" />
        </span>
        <p className="font-medium">Nothing to pick yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Pick lists appear as soon as students place orders for a class.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {summaries.map((summary) => (
        <Card key={summary.classId}>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{summary.className}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <MapPin className="size-3.5" />
                  {summary.room ? `Room ${summary.room}` : "No room set"}
                  <span>·</span>
                  <span>
                    {summary.orderCount} order
                    {summary.orderCount === 1 ? "" : "s"}
                  </span>
                  <span>·</span>
                  <span>
                    {summary.itemCount} item
                    {summary.itemCount === 1 ? "" : "s"}
                  </span>
                </CardDescription>
              </div>
              <span className="text-sm font-semibold">
                {formatCents(summary.totalCents)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href={`/staff/pick-lists/${summary.classId}`}>
                <ClipboardList className="size-4" />
                Open pick list
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
