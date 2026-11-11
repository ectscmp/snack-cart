"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  markOrderPaidAction,
  updateOrderStatusAction,
} from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/action-state";
import type { OrderStatus, PaymentStatus } from "@/lib/db";

const nextSteps: Record<
  OrderStatus,
  Array<{ status: OrderStatus; label: string; variant?: "outline" | "default" }>
> = {
  awaiting_payment: [],
  pending: [
    { status: "preparing", label: "Start preparing" },
    { status: "cancelled", label: "Cancel", variant: "outline" },
  ],
  preparing: [
    { status: "out_for_delivery", label: "Out for delivery" },
    { status: "cancelled", label: "Cancel", variant: "outline" },
  ],
  out_for_delivery: [
    { status: "delivered", label: "Mark delivered" },
    { status: "cancelled", label: "Cancel", variant: "outline" },
  ],
  delivered: [],
  cancelled: [],
};

export function OrderActions({
  orderId,
  status,
  paymentStatus,
}: {
  orderId: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  const [statusState, statusAction, statusPending] = useActionState(
    updateOrderStatusAction,
    idleState,
  );
  const [paidState, paidAction, paidPending] = useActionState(
    markOrderPaidAction,
    idleState,
  );

  useEffect(() => {
    if (statusState.status === "success") {
      toast.success(statusState.message ?? "Order updated.");
    } else if (statusState.status === "error") {
      toast.error(statusState.message ?? "Could not update the order.");
    }
  }, [statusState]);

  useEffect(() => {
    if (paidState.status === "success") {
      toast.success(paidState.message ?? "Marked paid.");
    } else if (paidState.status === "error") {
      toast.error(paidState.message ?? "Could not mark the order paid.");
    }
  }, [paidState]);

  const steps = nextSteps[status];

  if (steps.length === 0 && paymentStatus !== "unpaid") {
    return <span className="text-xs text-muted-foreground">No actions</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step) => (
        <form key={step.status} action={statusAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="status" value={step.status} />
          <Button
            type="submit"
            size="sm"
            variant={step.variant ?? "default"}
            disabled={statusPending}
          >
            {statusPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {step.label}
          </Button>
        </form>
      ))}

      {paymentStatus === "unpaid" ? (
        <form action={paidAction}>
          <input type="hidden" name="orderId" value={orderId} />
          <Button type="submit" size="sm" variant="secondary" disabled={paidPending}>
            {paidPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Mark paid
          </Button>
        </form>
      ) : null}
    </div>
  );
}
