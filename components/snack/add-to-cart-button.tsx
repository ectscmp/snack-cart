"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";

import { addToCartAction } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/action-state";
import { formatCents } from "@/lib/money";
import type { ProductOption } from "@/lib/db";

export function AddToCartButton({
  productId,
  choices = [],
  addons = [],
  prompt,
  soldOut = false,
  canOrder = true,
  orderingOpen = true,
  className,
}: {
  productId: number;
  choices?: ProductOption[];
  addons?: ProductOption[];
  prompt?: string | null;
  soldOut?: boolean;
  canOrder?: boolean;
  orderingOpen?: boolean;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(addToCartAction, idleState);
  const [choiceValue, setChoiceValue] = useState(
    () =>
      choices
        .find((choice) => choice.label.trim().toLowerCase().startsWith("no "))
        ?.id.toString() ?? "",
  );
  const [selectedAddons, setSelectedAddons] = useState<number[]>([]);
  const dropdownLabel = prompt || "Choose an option";

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Added to cart.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not add that snack.");
    }
  }, [state]);

  const needsChoice = choices.length > 0 && !choiceValue;

  function toggleAddon(id: number, checked: boolean) {
    setSelectedAddons((current) =>
      checked
        ? Array.from(new Set([...current, id]))
        : current.filter((entry) => entry !== id),
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!canOrder || !orderingOpen) {
          event.preventDefault();
        }
      }}
      className={cn("space-y-2", className)}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value={1} />

      {choices.length > 0 ? (
        <div className="space-y-1">
          <label
            htmlFor={`option-${productId}`}
            className="text-xs text-muted-foreground"
          >
            {dropdownLabel}
          </label>
          <select
            id={`option-${productId}`}
            name="optionValue"
            value={choiceValue}
            onChange={(event) => setChoiceValue(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            required
          >
            <option value="" disabled>
              {dropdownLabel}…
            </option>
            {choices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.label}
                {choice.priceDeltaCents > 0
                  ? ` (+${formatCents(choice.priceDeltaCents)})`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {addons.length > 0 ? (
        <fieldset className="space-y-1">
          <legend className="text-xs text-muted-foreground">Add-ons</legend>
          {addons.map((addon) => (
            <label key={addon.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="addonId"
                value={addon.id}
                checked={selectedAddons.includes(addon.id)}
                onChange={(event) =>
                  toggleAddon(addon.id, event.target.checked)
                }
                className="size-4 rounded border"
              />
              {addon.label}
              {addon.priceDeltaCents > 0
                ? ` (+${formatCents(addon.priceDeltaCents)})`
                : ""}
            </label>
          ))}
        </fieldset>
      ) : null}

      {!canOrder ? (
        <Button asChild size="sm" variant="outline" className="w-full">
          <Link href="/sign-in">Sign in to order</Link>
        </Button>
      ) : !orderingOpen ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled
          className="w-full"
        >
          Ordering closed
        </Button>
      ) : (
        <Button
          type="submit"
          size="sm"
          disabled={soldOut || pending || needsChoice}
          className="w-full"
        >
          {pending ? (
            <ShoppingBasket className="size-4 animate-pulse" />
          ) : (
            <Plus className="size-4" />
          )}
          {soldOut ? "Sold out" : "Add"}
        </Button>
      )}
    </form>
  );
}
