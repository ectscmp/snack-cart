"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { saveWindowAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { idleState } from "@/lib/action-state";
import type { ClassRecord, OrderingWindow } from "@/lib/db";
import {
  minutesToTimeInput,
  weekdayOptions,
} from "@/lib/time";

export function WindowForm({
  classes,
  window,
}: {
  classes: ClassRecord[];
  window?: OrderingWindow;
}) {
  const [state, formAction, pending] = useActionState(saveWindowAction, idleState);
  const key = window?.id ?? "new";

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Saved.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not save that window.");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      {window ? <input type="hidden" name="windowId" value={window.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`window-class-${key}`}>Class</Label>
          <select
            id={`window-class-${key}`}
            name="classId"
            defaultValue={window?.classId ?? classes[0]?.id}
            required
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {classes.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} · Room {entry.room}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`window-day-${key}`}>Day</Label>
          <select
            id={`window-day-${key}`}
            name="dayOfWeek"
            defaultValue={window?.dayOfWeek ?? 1}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {weekdayOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`window-label-${key}`}>Label</Label>
          <Input
            id={`window-label-${key}`}
            name="label"
            defaultValue={window?.label ?? ""}
            placeholder="Lunch ordering"
            maxLength={80}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`window-start-${key}`}>Start</Label>
          <Input
            id={`window-start-${key}`}
            name="start"
            type="time"
            defaultValue={
              window ? minutesToTimeInput(window.startMinute) : "11:30"
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`window-end-${key}`}>End</Label>
          <Input
            id={`window-end-${key}`}
            name="end"
            type="time"
            defaultValue={window ? minutesToTimeInput(window.endMinute) : "12:00"}
            required
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={window?.active ?? true}
          className="size-4 rounded border"
        />
        Active
      </label>

      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {window ? "Save window" : "Add window"}
      </Button>
    </form>
  );
}
