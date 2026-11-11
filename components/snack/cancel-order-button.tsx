"use client";

import { useActionState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { cancelOrderAction } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/action-state";

export function CancelOrderButton({ orderId }: { orderId: number }) {
  const [state, formAction, pending] = useActionState(cancelOrderAction, idleState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Order cancelled.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not cancel the order.");
    }
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
        Cancel order
      </Button>
    </form>
  );
}
