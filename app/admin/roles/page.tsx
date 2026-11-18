import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Check, Minus, ShieldCheck } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/snack/admin-nav";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import {
  permissionMatrix,
  roleSummaries,
  type PermissionRow,
} from "@/lib/permissions";
import type { UserRole } from "@/lib/db";

export const metadata: Metadata = {
  title: "Roles & access",
  description: "What each role can see and do.",
};

const matrixRoles: UserRole[] = ["customer", "staff", "admin"];

const roleLabels: Record<UserRole, string> = {
  customer: "Customer",
  staff: "THM staff",
  admin: "Admin",
};

const matrixAreas = permissionMatrix.reduce<
  Array<{ area: string; rows: PermissionRow[] }>
>((groups, row) => {
  const last = groups[groups.length - 1];

  if (last?.area === row.area) {
    last.rows.push(row);
  } else {
    groups.push({ area: row.area, rows: [row] });
  }

  return groups;
}, []);

export default function AdminRolesPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">
              Roles &amp; access
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              What each role can open and change. Roles are additive: admins can
              do everything THM staff can, and THM staff can do everything
              customers can.
            </p>
          </div>
          <AdminNav />
        </div>

        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <RolesContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function RolesContent() {
  await connection();

  await requireAdmin();

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roleSummaries.map((summary) => (
          <Card key={summary.role} className="h-full min-w-0">
            <CardHeader>
              <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-base">
                <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 break-words">{summary.label}</span>
                {summary.role === "admin" ? (
                  <Badge variant="secondary">Full access</Badge>
                ) : null}
              </CardTitle>
              <CardDescription className="break-words">
                {summary.blurb}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {summary.pages.map((page) => (
                  <li key={`${summary.role}-${page.href}`} className="min-w-0">
                    <Link
                      href={page.href}
                      className="break-words text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-base">Permission matrix</CardTitle>
          <CardDescription>
            A checkmark means the role can use that feature.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 md:hidden">
            {matrixAreas.map((group) => (
              <div key={group.area} className="rounded-lg border p-3">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {group.area}
                </p>
                <ul className="mt-2 space-y-3">
                  {group.rows.map((row) => (
                    <li
                      key={`${row.area}-${row.capability}`}
                      className="space-y-1.5"
                    >
                      <p className="text-sm break-words">{row.capability}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {matrixRoles.map((role) => {
                          const allowed = row.roles.includes(role);

                          return (
                            <Badge
                              key={role}
                              variant={allowed ? "secondary" : "outline"}
                              className={
                                allowed ? undefined : "text-muted-foreground"
                              }
                            >
                              {allowed ? (
                                <Check
                                  aria-label="Allowed"
                                  className="text-emerald-600"
                                />
                              ) : (
                                <Minus
                                  aria-label="Not allowed"
                                  className="text-muted-foreground/40"
                                />
                              )}
                              {roleLabels[role]}
                            </Badge>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Area</TableHead>
                  <TableHead>Feature</TableHead>
                  {matrixRoles.map((role) => (
                    <TableHead key={role} className="w-24 text-center">
                      {roleLabels[role]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionMatrix.map((row, index) => {
                  const showArea =
                    index === 0 || permissionMatrix[index - 1].area !== row.area;

                  return (
                    <TableRow key={`${row.area}-${row.capability}`}>
                      <TableCell className="align-top text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {showArea ? row.area : ""}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {row.capability}
                      </TableCell>
                      {matrixRoles.map((role) => {
                        const allowed = row.roles.includes(role);

                        return (
                          <TableCell key={role} className="text-center">
                            {allowed ? (
                              <Check
                                aria-label="Allowed"
                                className="mx-auto size-4 text-emerald-600"
                              />
                            ) : (
                              <Minus
                                aria-label="Not allowed"
                                className="mx-auto size-4 text-muted-foreground/40"
                              />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
