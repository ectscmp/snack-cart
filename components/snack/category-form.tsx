"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { saveCategoryAction } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { idleState } from "@/lib/action-state";
import type { Category, CategoryWithUsage } from "@/lib/db";

export function CategoryForm({
  category,
  parents,
}: {
  category?: CategoryWithUsage;
  parents: Category[];
}) {
  const [state, formAction, pending] = useActionState(
    saveCategoryAction,
    idleState,
  );
  const key = category?.id ?? "new";

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not save that category.");
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end"
    >
      {category ? (
        <input type="hidden" name="categoryId" value={category.id} />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`category-name-${key}`}>Name</Label>
        <Input
          id={`category-name-${key}`}
          name="name"
          defaultValue={category?.name}
          placeholder="Chips"
          required
          maxLength={60}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`category-parent-${key}`}>Parent (optional)</Label>
        <select
          id={`category-parent-${key}`}
          name="parentId"
          defaultValue={category?.parentId ?? ""}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">Top level</option>
          {parents
            .filter((parent) => parent.id !== category?.id)
            .map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
        </select>
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        {category ? "Save" : "Add"}
      </Button>
    </form>
  );
}
