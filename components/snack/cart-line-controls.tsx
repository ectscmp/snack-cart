"use client";

import { useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  removeCartItemDirect,
  setCartQuantityDirect,
} from "@/app/actions/cart";
import { Button } from "@/components/ui/button";

export function CartLineControls({
  productId,
  quantity,
  max,
}: {
  productId: number;
  quantity: number;
  max: number;
}) {
  const [pending, startTransition] = useTransition();

  function change(next: number) {
    startTransition(async () => {
      const result = await setCartQuantityDirect(productId, next);

      if (result.status === "error") {
        toast.error(result.message ?? "Could not update your cart.");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeCartItemDirect(productId);

      if (result.status === "error") {
        toast.error(result.message ?? "Could not remove that snack.");
      } else {
        toast.success("Removed from cart.");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-7"
        disabled={pending}
        onClick={() => change(quantity - 1)}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3" />
      </Button>
      <span className="w-7 text-center text-sm font-medium tabular-nums">
        {quantity}
      </span>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-7"
        disabled={pending || quantity >= max}
        onClick={() => change(quantity + 1)}
        aria-label="Increase quantity"
      >
        <Plus className="size-3" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-7 text-muted-foreground"
        disabled={pending}
        onClick={remove}
        aria-label="Remove item"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
