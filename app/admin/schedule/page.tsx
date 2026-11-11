import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { CalendarClock } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/snack/admin-nav";
import { DeleteWindowButton } from "@/components/snack/delete-window-button";
import { WindowForm } from "@/components/snack/window-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { listClasses, listWindows } from "@/lib/db";
import { formatWindow } from "@/lib/time";

export const metadata: Metadata = {
  title: "Schedule",
  description: "Set weekly ordering windows for each class.",
};

export default function AdminSchedulePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Schedule</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Weekly windows are evaluated in the school timezone.
            </p>
          </div>
          <AdminNav />
        </div>

        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <ScheduleContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function ScheduleContent() {
  await connection();

  await requireAdmin();
  const classes = listClasses(true);
  const windows = listWindows();

  if (classes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-16 text-center text-sm text-muted-foreground">
        Create a class before adding ordering windows.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        {classes.map((classRecord) => {
          const classWindows = windows.filter(
            (window) => window.classId === classRecord.id,
          );

          return (
            <Card key={classRecord.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="size-4 text-muted-foreground" />
                  {classRecord.name}
                </CardTitle>
                <CardDescription>
                  {classWindows.length === 0
                    ? "No windows yet."
                    : classWindows
                        .map((window) =>
                          formatWindow(
                            window.dayOfWeek,
                            window.startMinute,
                            window.endMinute,
                          ),
                        )
                        .join(" · ")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {classWindows.map((window) => (
                  <details
                    key={window.id}
                    className="rounded-lg border px-3 py-2"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                      <span>
                        {formatWindow(
                          window.dayOfWeek,
                          window.startMinute,
                          window.endMinute,
                        )}
                        {window.label ? ` · ${window.label}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {window.active ? "Active" : "Inactive"}
                      </span>
                    </summary>
                    <div className="mt-3 space-y-2">
                      <WindowForm classes={classes} window={window} />
                      <DeleteWindowButton windowId={window.id} />
                    </div>
                  </details>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Add a window</CardTitle>
        </CardHeader>
        <CardContent>
          <WindowForm classes={classes} />
        </CardContent>
      </Card>
    </div>
  );
}
