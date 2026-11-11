"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { adjustStockAction } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/action-state";

export function StockForm({ productId }: { productId: number }) {
  const [state, formAction, pending] = useActionState(adjustStockAction, idleState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      toast.success(state.message ?? "Stock updated.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not change stock.");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="productId" value={productId} />
      <Input
        name="delta"
        type="number"
        placeholder="+10 or -2"
        className="w-28"
        required
      />
      <Input
        name="note"
        placeholder="Note (optional)"
        className="w-40"
        maxLength={120}
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <SlidersHorizontal className="size-3.5" />}
        Adjust
      </Button>
    </form>
  );
}
