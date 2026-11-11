import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CreditCard, ShoppingBasket, Truck } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { OrderingStatus } from "@/components/snack/ordering-status";
import { ProductList } from "@/components/snack/product-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Snack Cart",
  description:
    "Order snacks online and have them delivered to your classroom by THM students.",
};

const steps = [
  {
    icon: ShoppingBasket,
    title: "Pick your snacks",
    description:
      "Browse the live menu during your class window. Stock updates as orders come in.",
  },
  {
    icon: CreditCard,
    title: "Pay your way",
    description:
      "Pay in person when the cart reaches your room. No card needed online.",
  },
  {
    icon: Truck,
    title: "Delivered to class",
    description:
      "THM students bring your order to your classroom. No lines, no detours.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <p className="text-sm font-medium text-primary">
                A student-run snack cart
              </p>
              <h1 className="mt-3 max-w-xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
                Snacks, delivered to your classroom.
              </h1>
              <p className="mt-5 max-w-lg text-pretty leading-relaxed text-muted-foreground">
                Order during your class window, pay online or at delivery, and
                THM students bring it straight to your room.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/menu">
                    Browse the menu
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/orders">Track an order</Link>
                </Button>
              </div>
            </div>

            <Suspense fallback={<Skeleton className="h-56 w-full rounded-xl" />}>
              <OrderingStatus />
            </Suspense>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  On the cart
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A quick look at what is available right now.
                </p>
              </div>
              <Link
                href="/menu"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View the menu
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-6">
              <Suspense
                fallback={
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map((key) => (
                      <Skeleton key={key} className="h-80 w-full rounded-xl" />
                    ))}
                  </div>
                }
              >
                <ProductList limit={6} />
              </Suspense>
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-16">
            <h2 className="text-2xl font-semibold tracking-tight">
              How it works
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {steps.map((step) => (
                <div key={step.title} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <step.icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
