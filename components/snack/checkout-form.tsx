"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingBasket } from "lucide-react";

import { placeOrderAction, type CheckoutState } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCents } from "@/lib/money";

const initialState: CheckoutState = { status: "idle" };

export function CheckoutForm({
  defaultRoom,
  subtotalCents,
}: {
  defaultRoom: string;
  subtotalCents: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    placeOrderAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success" && state.orderId) {
      router.push(`/orders/${state.orderId}?placed=1`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="deliveryRoom">Deliver to</Label>
        <Input
          id="deliveryRoom"
          name="deliveryRoom"
          defaultValue={defaultRoom}
          placeholder="Room 204"
          required
          maxLength={40}
        />
        <p className="text-xs text-muted-foreground">
          Defaults to your class room. Change it if you will be somewhere else.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">Note for the delivery team</Label>
        <Textarea
          id="note"
          name="note"
          placeholder="Back table, front office, etc. (optional)"
          maxLength={200}
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Total due at delivery</span>
        <span className="font-semibold">{formatCents(subtotalCents)}</span>
      </div>

      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ShoppingBasket className="size-4" />
        )}
        {pending ? "Placing order…" : "Place order (pay at delivery)"}
      </Button>
    </form>
  );
}
