import { connection } from "next/server";
import { PackageOpen } from "lucide-react";

import { ProductCard } from "@/components/snack/product-card";
import { getCurrentUser } from "@/lib/auth";
import { getOrderingStatus, listProducts } from "@/lib/db";

export async function ProductList({
  limit,
  grouped = false,
}: {
  limit?: number;
  grouped?: boolean;
}) {
  await connection();

  const user = await getCurrentUser();
  const status = user ? getOrderingStatus(user) : null;
  const products = listProducts();

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-16 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <PackageOpen className="size-5" />
        </span>
        <p className="font-medium">No snacks yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          The delivery team has not stocked any products. Check back soon.
        </p>
      </div>
    );
  }

  const visible = limit ? products.slice(0, limit) : products;

  if (!grouped) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            canOrder={Boolean(user)}
            orderingOpen={Boolean(status?.open)}
          />
        ))}
      </div>
    );
  }

  const categories = Array.from(
    new Set(visible.map((product) => product.categoryPath)),
  );

  return (
    <div className="space-y-10">
      {categories.map((category) => {
        const categoryProducts = visible.filter(
          (product) => product.categoryPath === category,
        );

        return (
          <section key={category}>
            <div className="flex items-baseline justify-between gap-4 border-b pb-2">
              <h2 className="text-lg font-semibold tracking-tight">{category}</h2>
              <span className="text-xs text-muted-foreground">
                {categoryProducts.length}{" "}
                {categoryProducts.length === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  canOrder={Boolean(user)}
                  orderingOpen={Boolean(status?.open)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
