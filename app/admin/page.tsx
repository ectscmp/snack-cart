import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  CalendarClock,
  Package,
  ReceiptText,
  School,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/snack/admin-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import {
  getOrderStats,
  listClasses,
  listProducts,
  listUsers,
} from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Admin",
  description: "Manage classes, schedules, users, and snack cart settings.",
};

export default function AdminPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              School-wide snack cart controls.
            </p>
          </div>
          <AdminNav />
        </div>

        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <Overview />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Overview() {
  await connection();

  await requireAdmin();
  const stats = getOrderStats();
  const classes = listClasses(true);
  const users = listUsers();
  const products = listProducts(true);

  const cards = [
    {
      icon: ReceiptText,
      title: "Orders",
      value: stats.total,
      description: `${stats.open} open · ${stats.delivered} delivered`,
      href: "/admin/orders",
    },
    {
      icon: School,
      title: "Classes",
      value: classes.length,
      description: "Class rosters and rooms",
      href: "/admin/classes",
    },
    {
      icon: Users,
      title: "People",
      value: users.length,
      description: "Signed-in accounts",
      href: "/admin/users",
    },
    {
      icon: Package,
      title: "Products",
      value: products.length,
      description: "Catalog items",
      href: "/staff/products",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <card.icon className="size-4" />
                {card.title}
              </CardDescription>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {card.description}
              </span>
              <Button asChild variant="ghost" size="sm">
                <Link href={card.href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paid revenue</CardTitle>
          <CardDescription>
            Sum of paid orders recorded in the app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">
            {formatCents(stats.revenueCents)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Button asChild variant="outline" className="h-auto justify-start py-3">
          <Link href="/admin/schedule">
            <CalendarClock className="size-4" />
            Ordering windows
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start py-3">
          <Link href="/staff/categories">
            <Tags className="size-4" />
            Categories
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start py-3">
          <Link href="/admin/users">
            <Users className="size-4" />
            Roles &amp; classes
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start py-3">
          <Link href="/admin/roles">
            <ShieldCheck className="size-4" />
            What each role can see
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start py-3">
          <Link href="/admin/settings">
            <School className="size-4" />
            School settings
          </Link>
        </Button>
      </div>
    </div>
  );
}
