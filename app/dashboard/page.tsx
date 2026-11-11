import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  PackageSearch,
  ReceiptText,
  ShoppingBasket,
  Truck,
  UserRound,
} from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { OrderingStatus } from "@/components/snack/ordering-status";
import { OrderStatusBadge } from "@/components/snack/order-status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { isAdmin, isStaff } from "@/lib/auth";
import {
  cancelExpiredOrders,
  getCartCount,
  getLowStockProducts,
  listOrdersForUser,
  listStaffQueue,
} from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your snack cart summary, orders, and delivery status.",
};

export default function DashboardPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-10">
        <Suspense fallback={<Skeleton className="h-24 w-full rounded-xl" />}>
          <DashboardHeader />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
              <OrderingStatus />
            </Suspense>

            <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
              <RecentOrders />
            </Suspense>
          </div>

          <div className="space-y-6">
            <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
              <QuickLinks />
            </Suspense>

            <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
              <StaffSummary />
            </Suspense>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

async function DashboardHeader() {
  const user = await requireUser();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Avatar>
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback>
            <UserRound className="size-4" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Hi, {user.name.split(" ")[0]}
          </h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {user.roles.map((role) => (
              <Badge key={role} variant="outline" className="capitalize">
                {role}
              </Badge>
            ))}
            <Badge variant="secondary">
              {user.className ?? "No class assigned"}
            </Badge>
          </div>
        </div>
      </div>
      <Button asChild>
        <Link href="/menu">Order snacks</Link>
      </Button>
    </div>
  );
}

async function RecentOrders() {
  await connection();

  const user = await requireUser();
  cancelExpiredOrders();
  const orders = listOrdersForUser(user.id).slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="size-4 text-muted-foreground" />
            Recent orders
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/orders">
              View all
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            You have not placed an order yet.
          </p>
        ) : (
          <ul className="divide-y">
            {orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/orders/${order.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    Order #{order.id}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {order.items.reduce((total, item) => total + item.quantity, 0)}{" "}
                    items · {formatCents(order.subtotalCents)}
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

async function QuickLinks() {
  await connection();

  const user = await requireUser();
  const cartCount = getCartCount(user.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingBasket className="size-4 text-muted-foreground" />
          Quick links
        </CardTitle>
        <CardDescription>
          {cartCount > 0
            ? `${cartCount} item${cartCount === 1 ? "" : "s"} in your cart`
            : "Your cart is empty"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button asChild variant={cartCount > 0 ? "default" : "outline"}>
          <Link href="/cart">
            Go to cart
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/menu">Browse menu</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

async function StaffSummary() {
  await connection();

  const user = await requireUser();

  if (!isStaff(user)) {
    return null;
  }

  const queue = listStaffQueue();
  const lowStock = getLowStockProducts();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="size-4 text-muted-foreground" />
          Delivery team
        </CardTitle>
        <CardDescription>
          {queue.length} open order{queue.length === 1 ? "" : "s"} ·{" "}
          {lowStock.length} low-stock item{lowStock.length === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button asChild>
          <Link href="/staff">Open delivery queue</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/staff/products">
            <PackageSearch className="size-4" />
            Manage products
          </Link>
        </Button>
        {isAdmin(user) ? (
          <Button asChild variant="ghost">
            <Link href="/admin">Admin settings</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
