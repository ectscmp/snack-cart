import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, MapPin, ReceiptText } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CancelOrderButton } from "@/components/snack/cancel-order-button";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  statusLabel,
} from "@/components/snack/order-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { cancelExpiredOrders, getOrder } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Order details",
  description: "See items, payment, and delivery status for an order.",
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <OrderDetail params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    notFound();
  }

  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  cancelExpiredOrders();

  const order = getOrder(orderId);

  if (!order) {
    notFound();
  }

  if (order.customerId !== user.id && !isStaff(user)) {
    notFound();
  }

  const canCancel = ["awaiting_payment", "pending"].includes(order.status);

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/orders">
          <ArrowLeft className="size-4" />
          All orders
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-xl">Order #{order.id}</CardTitle>
              <CardDescription>
                Placed {formatDateTime(order.placedAt)} by {order.customerName}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Deliver to Room {order.deliveryRoom}</p>
                <p className="text-xs text-muted-foreground">
                  {order.className ?? "No class"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{statusLabel(order.status)}</p>
                <p className="text-xs text-muted-foreground">
                  Updated {formatDateTime(order.updatedAt)}
                </p>
              </div>
            </div>
          </div>

          {order.note ? (
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Note: </span>
              {order.note}
            </div>
          ) : null}

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold">Items</h3>
            <ul className="divide-y text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {item.quantity} × {item.productName}
                  </span>
                  <span className="tabular-nums">
                    {formatCents(item.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t pt-2 text-sm font-semibold">
              <span>Total</span>
              <span>{formatCents(order.subtotalCents)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/orders/${order.id}/receipt`}>
                <ReceiptText className="size-4" />
                Print receipt
              </Link>
            </Button>
            {canCancel ? <CancelOrderButton orderId={order.id} /> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {order.events.map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="font-medium">{statusLabel(event.status)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.createdAt)}
                    {event.actorName ? ` · ${event.actorName}` : ""}
                    {event.note ? ` · ${event.note}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(`${value.replace(" ", "T")}Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
