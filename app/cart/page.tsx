import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, ShoppingBasket, Trash2 } from "lucide-react";

import { clearCartAction } from "@/app/actions/cart";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CartLineControls } from "@/components/snack/cart-line-controls";
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
import { getCart, getSettings } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your snack order before checkout.",
};

export default function CartPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>
        </div>
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <CartContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function CartContent() {
  await connection();

  const user = await requireUser();
  const cart = getCart(user.id);
  const settings = getSettings();

  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-background px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShoppingBasket className="size-5" />
        </span>
        <p className="font-medium">Your cart is empty</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Add a few snacks from the menu and they will show up here.
        </p>
        <Button asChild>
          <Link href="/menu">Browse the menu</Link>
        </Button>
      </div>
    );
  }

  const overLimit = cart.itemCount > settings.maxItemsPerOrder;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"}
          </CardTitle>
          <CardDescription>
            Quantities are limited by current stock.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {cart.items.map((item) => (
            <div key={item.productId} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCents(item.priceCents)} each
                </p>
              </div>
              <CartLineControls
                productId={item.productId}
                quantity={item.quantity}
                max={item.stockQuantity}
              />
              <span className="w-16 text-right text-sm font-medium tabular-nums">
                {formatCents(item.lineTotalCents)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{formatCents(cart.subtotalCents)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Delivery is included. Orders are limited to{" "}
            {settings.maxItemsPerOrder} items.
          </p>
          {overLimit ? (
            <p className="text-xs text-destructive">
              Remove some items to stay under the {settings.maxItemsPerOrder}-item
              limit.
            </p>
          ) : null}
          {overLimit ? (
            <Button className="w-full" disabled>
              Checkout
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link href="/checkout">
                Checkout
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
          <form action={clearCartAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full">
              <Trash2 className="size-4" />
              Clear cart
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
