"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCategoryAction } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/action-state";
import type { CategoryWithUsage } from "@/lib/db";

export function DeleteCategoryButton({
  category,
}: {
  category: CategoryWithUsage;
}) {
  const [state, formAction, pending] = useActionState(
    deleteCategoryAction,
    idleState,
  );
  const inUse = category.productCount > 0;

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Category removed.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not delete that category.");
    }
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="categoryId" value={category.id} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending || inUse}
        title={
          inUse
            ? "Move or delete the products in this category first."
            : "Delete category"
        }
        className="text-destructive hover:text-destructive"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
        Delete
      </Button>
    </form>
  );
}
