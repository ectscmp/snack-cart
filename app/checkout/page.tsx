import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Clock, ShoppingBasket } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CheckoutForm } from "@/components/snack/checkout-form";
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
import { getCart, getOrderingStatus, getSettings } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Confirm delivery details and pay for your snack order.",
};

export default function CheckoutPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        </div>
        <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
          <CheckoutContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function CheckoutContent() {
  await connection();

  const user = await requireUser();
  const cart = getCart(user.id);

  if (cart.items.length === 0) {
    redirect("/cart");
  }

  const status = getOrderingStatus(user);
  const settings = getSettings();
  const defaultRoom = user.classRoom || user.room || "";

  if (!status.open) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-muted-foreground" />
            Ordering is closed
          </CardTitle>
          <CardDescription>
            {status.reason === "no-class"
              ? "Ask an administrator to add you to a class."
              : status.reason === "disabled"
                ? "Ordering is paused for the whole school right now."
                : "Your class ordering window is not open right now."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/menu">Back to menu</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/orders">My orders</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery &amp; payment</CardTitle>
          <CardDescription>
            Pay in person when THM delivers your order. No card needed online.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CheckoutForm
            defaultRoom={defaultRoom}
            subtotalCents={cart.subtotalCents}
          />
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBasket className="size-4 text-muted-foreground" />
            Order summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2 text-sm">
            {cart.items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">
                  {item.quantity} × {item.name}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatCents(item.lineTotalCents)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t pt-3 text-sm font-semibold">
            <span>Total</span>
            <span>{formatCents(cart.subtotalCents)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {settings.deliveryNote ??
              "Delivery is included. THM students bring orders to your classroom."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
