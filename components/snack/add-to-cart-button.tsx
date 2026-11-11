"use client";

import { useActionState, useEffect } from "react";
import { Plus, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";

import { addToCartAction } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/action-state";

export function AddToCartButton({
  productId,
  disabled,
  className,
}: {
  productId: number;
  disabled?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(addToCartAction, idleState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Added to cart.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not add that snack.");
    }
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value={1} />
      <Button
        type="submit"
        size="sm"
        disabled={disabled || pending}
        className={cn(className)}
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
