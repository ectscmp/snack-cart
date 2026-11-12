"use client";

import { useActionState, useEffect } from "react";
import { Loader2, PackagePlus, Save } from "lucide-react";
import { toast } from "sonner";

import {
  createProductAction,
  updateProductAction,
} from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/action-state";
import type { Category, Product } from "@/lib/db";

export function ProductForm({
  product,
  categories,
}: {
  product?: Product;
  categories: Category[];
}) {
  const action = product ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState(action, idleState);
  const key = product?.id ?? "new";

  const parents = categories.filter((entry) => entry.parentId === null);
  const categoryOptions: Array<{ id: number; label: string }> = [];

  for (const parent of parents) {
    categoryOptions.push({ id: parent.id, label: parent.name });

    for (const child of categories.filter(
      (entry) => entry.parentId === parent.id,
    )) {
      categoryOptions.push({ id: child.id, label: `— ${child.name}` });
    }
  }

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not save that product.");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {product ? (
        <input type="hidden" name="productId" value={product.id} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`name-${product?.id ?? "new"}`}>Name</Label>
          <Input
            id={`name-${product?.id ?? "new"}`}
            name="name"
            defaultValue={product?.name}
            placeholder="Pretzel bag"
            required
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`price-${product?.id ?? "new"}`}>Price</Label>
          <Input
            id={`price-${product?.id ?? "new"}`}
            name="price"
            defaultValue={
              product ? (product.priceCents / 100).toFixed(2) : ""
            }
            placeholder="1.50"
            inputMode="decimal"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`category-${key}`}>Category</Label>
          <select
            id={`category-${key}`}
            name="categoryId"
            defaultValue={product?.categoryId ?? categoryOptions[0]?.id ?? ""}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            required
          >
            {categoryOptions.length === 0 ? (
              <option value="">No categories yet</option>
            ) : null}
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          {categoryOptions.length === 0 ? (
            <p className="text-xs text-destructive">
              Add a category in Staff → Categories first.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`low-${product?.id ?? "new"}`}>Low stock alert at</Label>
          <Input
            id={`low-${product?.id ?? "new"}`}
            name="lowStockThreshold"
            type="number"
            min={0}
            defaultValue={product?.lowStockThreshold ?? 5}
          />
        </div>

        {!product ? (
          <div className="space-y-2">
            <Label htmlFor="stockQuantity">Starting stock</Label>
            <Input
              id="stockQuantity"
              name="stockQuantity"
              type="number"
              min={0}
              defaultValue={0}
            />
          </div>
        ) : null}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`image-${key}`}>Image</Label>
          {product?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              className="h-16 w-16 rounded-lg border object-cover"
            />
          ) : null}
          <Input
            id={`image-${key}`}
            name="image"
            type="file"
            accept="image/*"
          />
          <p className="text-xs text-muted-foreground">
            Upload a photo (max 2 MB). It is stored in the database. Or paste a
            URL below.
          </p>
          <Input
            id={`imageUrl-${key}`}
            name="imageUrl"
            defaultValue={product?.imageUrl?.startsWith("data:") ? "" : (product?.imageUrl ?? "")}
            placeholder="https://… (optional)"
            maxLength={500}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`description-${product?.id ?? "new"}`}>Description</Label>
          <Textarea
            id={`description-${product?.id ?? "new"}`}
            name="description"
            defaultValue={product?.description ?? ""}
            rows={2}
            maxLength={500}
          />
        </div>
      </div>

      {product ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={product.active}
            className="size-4 rounded border"
          />
          Available in the menu
        </label>
      ) : null}

      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : product ? (
          <Save className="size-4" />
        ) : (
          <PackagePlus className="size-4" />
        )}
        {product ? "Save product" : "Add product"}
      </Button>
    </form>
  );
}
