import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PackageSearch } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StaffNav } from "@/components/snack/staff-nav";
import { StockForm } from "@/components/snack/stock-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireStaff } from "@/lib/auth";
import {
  getLowStockProducts,
  listInventoryMovements,
  listProducts,
} from "@/lib/db";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Check stock levels, restock products, and review movements.",
};

export default function StaffInventoryPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Restock items and keep the stock counts honest.
            </p>
          </div>
          <div className="w-full min-w-0 lg:w-auto">
            <StaffNav />
          </div>
        </div>

        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <InventoryContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function InventoryContent() {
  await connection();

  await requireStaff();
  const products = listProducts(true);
  const lowStock = getLowStockProducts();
  const movements = listInventoryMovements(30);

  return (
    <>
      {lowStock.length > 0 ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageSearch className="size-4 text-amber-600" />
              {lowStock.length} item{lowStock.length === 1 ? "" : "s"} running low
            </CardTitle>
            <CardDescription className="break-words">
              {lowStock.map((product) => product.name).join(", ")}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock levels</CardTitle>
            <CardDescription>
              Adjustments are logged with your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Add products first.
              </p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {products.map((product) => (
                    <div key={product.id} className="rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{product.name}</p>
                        <p className="text-xs break-words text-muted-foreground">
                          {product.category}
                          {product.active ? "" : " · hidden"}
                        </p>
                      </div>

                      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <div className="flex items-baseline gap-1.5">
                          <dt className="text-muted-foreground">On hand</dt>
                          <dd
                            className={
                              product.stockQuantity <= product.lowStockThreshold
                                ? "font-medium text-amber-600"
                                : "font-medium"
                            }
                          >
                            {product.stockQuantity}
                          </dd>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <dt className="text-muted-foreground">Alert at</dt>
                          <dd className="font-medium">
                            {product.lowStockThreshold}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-3">
                        <StockForm productId={product.id} layout="stacked" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>On hand</TableHead>
                        <TableHead>Alert at</TableHead>
                        <TableHead>Adjust</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="whitespace-normal">
                            <p className="font-medium break-words">
                              {product.name}
                            </p>
                            <p className="text-xs break-words text-muted-foreground">
                              {product.category}
                              {product.active ? "" : " · hidden"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                product.stockQuantity <=
                                product.lowStockThreshold
                                  ? "font-medium text-amber-600"
                                  : undefined
                              }
                            >
                              {product.stockQuantity}
                            </span>
                          </TableCell>
                          <TableCell>{product.lowStockThreshold}</TableCell>
                          <TableCell className="whitespace-normal">
                            <StockForm productId={product.id} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Recent movements</CardTitle>
            <CardDescription>Newest first</CardDescription>
          </CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No movements yet.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {movements.map((movement) => (
                  <li key={movement.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{movement.productName}</p>
                      <p className="text-xs break-words capitalize text-muted-foreground">
                        {movement.reason}
                        {movement.actorName ? ` · ${movement.actorName}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        movement.delta > 0
                          ? "shrink-0 text-emerald-600"
                          : "shrink-0 text-destructive"
                      }
                    >
                      {movement.delta > 0 ? "+" : ""}
                      {movement.delta}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
