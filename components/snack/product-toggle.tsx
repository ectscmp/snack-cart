"use client";

import { useActionState, useEffect } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { toggleProductAction } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/action-state";

export function ProductToggle({
  productId,
  active,
}: {
  productId: number;
  active: boolean;
}) {
  const [state, formAction, pending] = useActionState(toggleProductAction, idleState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Updated.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not update the product.");
    }
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="active" value={String(!active)} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : active ? (
          <EyeOff className="size-4" />
        ) : (
          <Eye className="size-4" />
        )}
        {active ? "Hide" : "Show"}
      </Button>
    </form>
  );
}
