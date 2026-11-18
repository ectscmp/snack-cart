import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { CornerDownRight, Tags } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CategoryForm } from "@/components/snack/category-form";
import { DeleteCategoryButton } from "@/components/snack/delete-category-button";
import { StaffNav } from "@/components/snack/staff-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth";
import { listCategoriesWithUsage } from "@/lib/db";

export const metadata: Metadata = {
  title: "Categories",
  description: "Set the categories products can be grouped into.",
};

export default function StaffCategoriesPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick the groups products are listed under. Renaming a category
              moves its products with it.
            </p>
          </div>
          <div className="w-full min-w-0 lg:w-auto">
            <StaffNav />
          </div>
        </div>

        <Suspense fallback={<Skeleton className="h-80 w-full rounded-xl" />}>
          <CategoriesContent />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

async function CategoriesContent() {
  await connection();

  await requireStaff();
  const categories = listCategoriesWithUsage();
  const parents = categories.filter((category) => category.parentId === null);
  const byId = new Map(categories.map((category) => [category.id, category]));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-background px-6 py-16 text-center text-sm text-muted-foreground">
            No categories yet. Add the first one below.
          </div>
        ) : (
          categories.map((category) => {
            const parent = category.parentId
              ? byId.get(category.parentId)
              : null;

            return (
              <Card
                key={category.id}
                className={parent ? "ml-4 border-dashed sm:ml-6" : undefined}
              >
                <CardHeader>
                  <div className="flex min-w-0 items-center gap-2">
                    {parent ? (
                      <CornerDownRight className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Tags className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <CardTitle className="min-w-0 text-base break-words">
                      {category.name}
                    </CardTitle>
                  </div>
                  <CardDescription className="break-words">
                    {parent ? `In ${parent.name} · ` : "Top level · "}
                    {category.productCount} product
                    {category.productCount === 1 ? "" : "s"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <CategoryForm category={category} parents={parents} />
                  </div>
                  <div className="flex justify-end sm:shrink-0">
                    <DeleteCategoryButton category={category} />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Add a category</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm parents={parents} />
        </CardContent>
      </Card>
    </div>
  );
}
