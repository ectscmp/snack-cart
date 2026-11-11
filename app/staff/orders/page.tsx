import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/snack/order-status-badge";
import { StaffNav } from "@/components/snack/staff-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth";
import { listCompletedOrders } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Order history",
  description: "Delivered and cancelled snack orders.",
};

export default function StaffOrdersPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Order history</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Delivered and cancelled orders.
            </p>
          </div>
          <StaffNav />
        </div>

        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <HistoryContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function HistoryContent() {
  await connection();

  await requireStaff();
  const orders = listCompletedOrders();

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-16 text-center text-sm text-muted-foreground">
        No completed orders yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Order #{order.id}</CardTitle>
                <CardDescription>
                  {order.customerName} · Room {order.deliveryRoom} ·{" "}
                  {formatCents(order.subtotalCents)}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <p className="line-clamp-1 text-sm text-muted-foreground">
              {order.items
                .map((item) => `${item.quantity}× ${item.productName}`)
                .join(", ")}
            </p>
            <Link
              href={`/orders/${order.id}`}
              className="shrink-0 text-sm font-medium hover:underline"
            >
              Details
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
