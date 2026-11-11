import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, ReceiptText } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/snack/order-status-badge";
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
import { cancelExpiredOrders, listOrdersForUser } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "My orders",
  description: "Track your snack cart orders and delivery status.",
};

export default function OrdersPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">My orders</h1>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/menu">Order again</Link>
          </Button>
        </div>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <OrdersContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function OrdersContent() {
  await connection();

  const user = await requireUser();
  cancelExpiredOrders();
  const orders = listOrdersForUser(user.id);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-background px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ReceiptText className="size-5" />
        </span>
        <p className="font-medium">No orders yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          When you place an order it will appear here with live delivery status.
        </p>
        <Button asChild>
          <Link href="/menu">Browse the menu</Link>
        </Button>
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
                  {order.items.reduce((total, item) => total + item.quantity, 0)}{" "}
                  items · {formatCents(order.subtotalCents)} · Room{" "}
                  {order.deliveryRoom}
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
              {order.items.map((item) => `${item.quantity}× ${item.productName}`).join(", ")}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <Button asChild size="sm" variant="outline">
                <Link href={`/orders/${order.id}/receipt`}>Receipt</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/orders/${order.id}`}>
                  Details
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
