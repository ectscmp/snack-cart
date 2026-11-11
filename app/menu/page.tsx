import { Suspense } from "react";
import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { OrderingStatus } from "@/components/snack/ordering-status";
import { ProductList } from "@/components/snack/product-list";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Menu",
  description: "Browse the snacks available from the snack cart.",
};

export default function MenuPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-12">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-lg">
            <h1 className="text-3xl font-semibold tracking-tight">Menu</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Everything currently on the cart. Stock updates live.
            </p>
          </div>

          <div className="w-full sm:max-w-sm">
            <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
              <OrderingStatus />
            </Suspense>
          </div>
        </div>

        <div className="mt-10">
          <Suspense
            fallback={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((key) => (
                  <Skeleton key={key} className="h-80 w-full rounded-xl" />
                ))}
              </div>
            }
          >
            <ProductList grouped />
          </Suspense>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
