"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteWindowAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/action-state";

export function DeleteWindowButton({ windowId }: { windowId: number }) {
  const [state, formAction, pending] = useActionState(deleteWindowAction, idleState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Window removed.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not remove the window.");
    }
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="windowId" value={windowId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        Remove
      </Button>
    </form>
  );
}
