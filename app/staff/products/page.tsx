import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PackagePlus, Pencil, Upload } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ProductForm } from "@/components/snack/product-form";
import { ProductImportForm } from "@/components/snack/product-import-form";
import { ProductToggle } from "@/components/snack/product-toggle";
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
  listAllProductOptions,
  listCategories,
  listProducts,
} from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Products",
  description: "Add, edit, and hide snack cart products.",
};

export default function StaffProductsPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage the catalog. Stock changes live on the inventory page.
            </p>
          </div>
          <div className="w-full min-w-0 lg:w-auto">
            <StaffNav />
          </div>
        </div>

        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <ProductsContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function ProductsContent() {
  await connection();

  await requireStaff();
  const products = listProducts(true);
  const categories = listCategories();
  const optionsByProduct = listAllProductOptions();
  const rows = products.map((product) => {
    const productOptions = optionsByProduct.get(product.id);

    return {
      product,
      optionLabels: [
        ...(productOptions?.choices ?? []).map((option) => option.label),
        ...(productOptions?.addons ?? []).map((option) => `+ ${option.label}`),
      ],
    };
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catalog</CardTitle>
          <CardDescription>{products.length} products</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No products yet. Add the first one below.
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {rows.map(({ product, optionLabels }) => (
                  <div key={product.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.categoryPath}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {product.active ? "Active" : "Hidden"}
                      </Badge>
                    </div>

                    {optionLabels.length > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Options: {optionLabels.join(", ")}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm">
                        <span className="font-medium">
                          {formatCents(product.priceCents)}
                        </span>
                        <span
                          className={
                            product.stockQuantity <= product.lowStockThreshold
                              ? "text-amber-600"
                              : "text-muted-foreground"
                          }
                        >
                          {" "}
                          · {product.stockQuantity} in stock
                        </span>
                      </p>
                      <div className="flex items-center gap-1">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/staff/products/${product.id}`}>
                            <Pencil className="size-4" />
                            Edit
                          </Link>
                        </Button>
                        <ProductToggle
                          productId={product.id}
                          active={product.active}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(({ product, optionLabels }) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.categoryPath}
                          </p>
                          {optionLabels.length > 0 ? (
                            <p className="text-xs text-muted-foreground">
                              Options: {optionLabels.join(", ")}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>{formatCents(product.priceCents)}</TableCell>
                        <TableCell>
                          <span
                            className={
                              product.stockQuantity <= product.lowStockThreshold
                                ? "font-medium text-amber-600"
                                : undefined
                            }
                          >
                            {product.stockQuantity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {product.active ? "Active" : "Hidden"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/staff/products/${product.id}`}>
                                <Pencil className="size-4" />
                                Edit
                              </Link>
                            </Button>
                            <ProductToggle
                              productId={product.id}
                              active={product.active}
                            />
                          </div>
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
          <CardTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="size-4 text-muted-foreground" />
            Add a product
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm categories={categories} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="size-4 text-muted-foreground" />
            Import from CSV
          </CardTitle>
          <CardDescription>
            Bulk add products from a spreadsheet export.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
