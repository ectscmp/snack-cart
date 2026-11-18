import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/snack/admin-nav";
import { OrderActions } from "@/components/snack/order-actions";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/snack/order-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth";
import { listAllOrders } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "All orders",
  description: "Every snack cart order, including cancelled ones.",
};

export default function AdminOrdersPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">All orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The newest 200 orders across the school.
            </p>
          </div>
          <AdminNav />
        </div>

        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <OrdersContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function OrdersContent() {
  await connection();

  await requireAdmin();
  const orders = listAllOrders();

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-16 text-center text-sm text-muted-foreground">
        No orders have been placed yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {orders.map((order) => (
        <Card key={order.id} className="min-w-0">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base">Order #{order.id}</CardTitle>
                <CardDescription className="break-words">
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
          <CardContent className="space-y-3">
            <p className="line-clamp-2 text-sm break-words text-muted-foreground">
              {order.items
                .map(
                  (item) =>
                    `${item.quantity}× ${item.productName}${
                      item.optionLabel ? ` (${item.optionLabel})` : ""
                    }`,
                )
                .join(", ")}
            </p>
            <OrderActions
              orderId={order.id}
              status={order.status}
              paymentStatus={order.paymentStatus}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
