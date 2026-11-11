import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/snack/admin-nav";
import { SettingsForm } from "@/components/snack/settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/db";

export const metadata: Metadata = {
  title: "Settings",
  description: "School-wide snack cart settings.",
};

export default function AdminSettingsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Global ordering switch, timezone, and order limits.
            </p>
          </div>
          <AdminNav />
        </div>

        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <SettingsContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function SettingsContent() {
  await connection();

  await requireAdmin();
  const settings = getSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Snack cart settings</CardTitle>
        <CardDescription>
          The global switch pauses ordering for everyone, including staff.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SettingsForm settings={settings} />
      </CardContent>
    </Card>
  );
}
