"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { saveClassAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { idleState } from "@/lib/action-state";
import type { ClassRecord } from "@/lib/db";

export function ClassForm({ classRecord }: { classRecord?: ClassRecord }) {
  const [state, formAction, pending] = useActionState(saveClassAction, idleState);
  const key = classRecord?.id ?? "new";

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not save that class.");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      {classRecord ? (
        <input type="hidden" name="classId" value={classRecord.id} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`class-name-${key}`}>Class name</Label>
          <Input
            id={`class-name-${key}`}
            name="name"
            defaultValue={classRecord?.name}
            placeholder="Grade 10 – Room 204"
            required
            maxLength={80}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`class-room-${key}`}>Room</Label>
          <Input
            id={`class-room-${key}`}
            name="room"
            defaultValue={classRecord?.room}
            placeholder="204"
            required
            maxLength={40}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`class-grade-${key}`}>Grade level</Label>
          <Input
            id={`class-grade-${key}`}
            name="gradeLevel"
            defaultValue={classRecord?.gradeLevel ?? ""}
            placeholder="10"
            maxLength={40}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`class-teacher-${key}`}>Teacher</Label>
          <Input
            id={`class-teacher-${key}`}
            name="teacherName"
            defaultValue={classRecord?.teacherName ?? ""}
            placeholder="Ms. Rivera"
            maxLength={120}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`class-group-${key}`}>Entra group ID</Label>
          <Input
            id={`class-group-${key}`}
            name="entraGroupId"
            defaultValue={classRecord?.entraGroupId ?? ""}
            placeholder="00000000-0000-0000-0000-000000000000"
            maxLength={64}
            spellCheck={false}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Members of this security group are assigned to this class when they
            sign in. Leave blank to assign people manually in Admin → Users.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={classRecord?.active ?? true}
          className="size-4 rounded border"
        />
        Active
      </label>

      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {classRecord ? "Save class" : "Add class"}
      </Button>
    </form>
  );
}
