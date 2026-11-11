import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { MapPin, Truck } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { OrderActions } from "@/components/snack/order-actions";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/snack/order-status-badge";
import { StaffNav } from "@/components/snack/staff-nav";
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
import { requireStaff } from "@/lib/auth";
import { listStaffQueue } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Delivery queue",
  description: "Open snack orders grouped by classroom.",
};

export default function StaffQueuePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Delivery queue</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Open orders grouped by room. Update status as you deliver.
            </p>
          </div>
          <StaffNav />
        </div>

        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <Queue />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function Queue() {
  await connection();

  await requireStaff();
  const orders = listStaffQueue();

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-background px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Truck className="size-5" />
        </span>
        <p className="font-medium">No open orders</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          New orders will appear here as soon as customers check out.
        </p>
      </div>
    );
  }

  const rooms = Array.from(new Set(orders.map((order) => order.deliveryRoom)));

  return (
    <div className="space-y-8">
      {rooms.map((room) => {
        const roomOrders = orders.filter((order) => order.deliveryRoom === room);

        return (
          <section key={room} className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <MapPin className="size-4 text-muted-foreground" />
              Room {room}
              <Badge variant="outline">{roomOrders.length}</Badge>
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {roomOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">Order #{order.id}</CardTitle>
                        <CardDescription>
                          {order.customerName} · {order.className ?? "No class"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <OrderStatusBadge status={order.status} />
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1 text-sm">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-2">
                          <span>
                            {item.quantity} × {item.productName}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatCents(item.lineTotalCents)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {order.note ? (
                      <p className="rounded-md bg-muted/50 px-2.5 py-1.5 text-xs">
                        {order.note}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                      <span>Total</span>
                      <span>{formatCents(order.subtotalCents)}</span>
                    </div>
                    <OrderActions
                      orderId={order.id}
                      status={order.status}
                      paymentStatus={order.paymentStatus}
                    />
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="w-full"
                    >
                      <Link href={`/orders/${order.id}/receipt`}>
                        Print receipt
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
