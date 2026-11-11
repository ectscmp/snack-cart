"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { saveUserAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { idleState } from "@/lib/action-state";
import type { AppUser, ClassRecord, UserRole } from "@/lib/db";

const roles: UserRole[] = ["customer", "staff", "admin"];

export function UserForm({
  user,
  classes,
}: {
  user: AppUser;
  classes: ClassRecord[];
}) {
  const [state, formAction, pending] = useActionState(saveUserAction, idleState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not update that user.");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="userId" value={user.id} />

      <div className="space-y-2">
        <Label htmlFor={`class-${user.id}`}>Class</Label>
        <select
          id={`class-${user.id}`}
          name="classId"
          defaultValue={user.classId ?? ""}
          className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">No class</option>
          {classes.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name} · Room {entry.room}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Roles</Label>
        <div className="flex flex-wrap gap-3">
          {roles.map((role) => (
            <label key={role} className="flex items-center gap-1.5 text-sm capitalize">
              <input
                type="checkbox"
                name="roles"
                value={role}
                defaultChecked={user.roles.includes(role)}
                className="size-4 rounded border"
              />
              {role}
            </label>
          ))}
        </div>
      </div>

      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save
      </Button>
    </form>
  );
}
