"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { adjustStockAction } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/action-state";

export function StockForm({
  productId,
  layout = "inline",
}: {
  productId: number;
  layout?: "inline" | "stacked";
}) {
  const [state, formAction, pending] = useActionState(adjustStockAction, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const stacked = layout === "stacked";

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      toast.success(state.message ?? "Stock updated.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not change stock.");
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={
        stacked
          ? "flex flex-col gap-2"
          : "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      }
    >
      <input type="hidden" name="productId" value={productId} />
      <Input
        name="delta"
        type="number"
        placeholder="+10 or -2"
        className={stacked ? "w-full" : "w-full sm:w-28"}
        required
      />
      <Input
        name="note"
        placeholder="Note (optional)"
        className={stacked ? "w-full" : "w-full sm:w-40"}
        maxLength={120}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending}
        className={stacked ? "w-full" : "w-full sm:w-auto"}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <SlidersHorizontal className="size-3.5" />}
        Adjust
      </Button>
    </form>
  );
}
