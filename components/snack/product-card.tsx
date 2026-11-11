import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { cn } from "cn";

import { AddToCartButton } from "@/components/snack/add-to-cart-button";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/db";
import { formatCents } from "@/lib/money";

export function ProductCard({
  product,
  canOrder,
  orderingOpen,
}: {
  product: Product;
  canOrder: boolean;
  orderingOpen: boolean;
}) {
  const soldOut = product.stockQuantity <= 0;
  const low = !soldOut && product.stockQuantity <= product.lowStockThreshold;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/20">
      <div className="relative aspect-[4/3] border-b bg-muted">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-background">
            <span className="flex size-12 items-center justify-center rounded-full border bg-background/60 text-muted-foreground/70">
              <ImageIcon className="size-5" />
            </span>
          </div>
        )}

        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Sold out
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{product.category}</p>
            <h3 className="mt-0.5 truncate font-medium leading-snug">
              {product.name}
            </h3>
          </div>
          <span className="shrink-0 text-sm font-medium tabular-nums">
            {formatCents(product.priceCents)}
          </span>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {product.description ?? "A fresh pick from the cart."}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span
            className={cn(
              "text-xs",
              soldOut
                ? "text-destructive"
                : low
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
            )}
          >
            {soldOut
              ? "Out of stock"
              : low
                ? `Only ${product.stockQuantity} left`
                : `${product.stockQuantity} in stock`}
          </span>

          {!canOrder ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          ) : !orderingOpen ? (
            <Button size="sm" variant="outline" disabled>
              Closed
            </Button>
          ) : (
            <AddToCartButton productId={product.id} disabled={soldOut} />
          )}
        </div>
      </div>
    </article>
  );
}
