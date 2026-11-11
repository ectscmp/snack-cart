import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ProductForm } from "@/components/snack/product-form";
import { StaffNav } from "@/components/snack/staff-nav";
import { StockForm } from "@/components/snack/stock-form";
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
import {
  getProduct,
  listCategories,
  listInventoryMovements,
} from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Edit product",
  description: "Edit a snack product and adjust its stock.",
};

export default function StaffProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-10">
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <ProductDetail params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  await connection();

  await requireStaff();
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    notFound();
  }

  const product = getProduct(productId);

  if (!product) {
    notFound();
  }

  const movements = listInventoryMovements(20, product.id);
  const categories = listCategories();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/staff/products">
            <ArrowLeft className="size-4" />
            Products
          </Link>
        </Button>
        <StaffNav />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit {product.name}</CardTitle>
            <CardDescription>
              {formatCents(product.priceCents)} · {product.stockQuantity} in stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductForm product={product} categories={categories} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adjust stock</CardTitle>
              <CardDescription>
                Positive to restock, negative to correct a count.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StockForm productId={product.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent movements</CardTitle>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No movements yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {movements.map((movement) => (
                    <li key={movement.id} className="flex justify-between gap-2">
                      <span className="capitalize text-muted-foreground">
                        {movement.reason}
                      </span>
                      <span
                        className={
                          movement.delta > 0 ? "text-emerald-600" : "text-destructive"
                        }
                      >
                        {movement.delta > 0 ? "+" : ""}
                        {movement.delta}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
