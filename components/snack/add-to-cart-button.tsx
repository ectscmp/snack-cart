"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";

import { addToCartAction } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/action-state";
import { formatCents } from "@/lib/money";
import type { ProductOptionSet } from "@/lib/product-options";

export function AddToCartButton({
  productId,
  disabled,
  optionSet,
  className,
}: {
  productId: number;
  disabled?: boolean;
  optionSet?: ProductOptionSet | null;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(addToCartAction, idleState);
  const [optionValue, setOptionValue] = useState(
    optionSet?.options.find((option) => option.value === "none")?.value ?? "",
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Added to cart.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not add that snack.");
    }
  }, [state]);

  const needsChoice = Boolean(optionSet) && !optionValue;

  return (
    <form action={formAction} className={cn("space-y-2", className)}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value={1} />

      {optionSet ? (
        <div className="space-y-1">
          <label
            htmlFor={`option-${productId}`}
            className="text-xs text-muted-foreground"
          >
            {optionSet.prompt}
          </label>
          <select
            id={`option-${productId}`}
            name="optionValue"
            value={optionValue}
            onChange={(event) => setOptionValue(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            required
          >
            {!optionSet.options.some((option) => option.value === "none") ? (
              <option value="" disabled>
                {optionSet.prompt}…
              </option>
            ) : null}
            {optionSet.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.priceDeltaCents > 0
                  ? ` (+${formatCents(option.priceDeltaCents)})`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <Button
        type="submit"
        size="sm"
        disabled={disabled || pending || needsChoice}
        className="w-full"
      >
        {pending ? (
          <ShoppingBasket className="size-4 animate-pulse" />
        ) : (
          <Plus className="size-4" />
        )}
        {disabled ? "Sold out" : "Add"}
      </Button>
    </form>
  );
}
