"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { importClassesAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { idleState } from "@/lib/action-state";

export function ClassImportForm() {
  const [state, formAction, pending] = useActionState(
    importClassesAction,
    idleState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Classes imported.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not import that file.");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="classes-csv">CSV file</Label>
        <Input
          id="classes-csv"
          name="csv"
          type="file"
          accept=".csv,text/csv"
          required
        />
        <p className="text-xs text-muted-foreground">
          Header row: <code className="font-mono">name, room, grade_level,
          teacher_name, entra_group_id, active</code>. Only <code>name</code> is
          required. <code>active</code> defaults to true.
        </p>
      </div>

      {state.status === "error" && state.details?.length ? (
        <ul className="max-h-32 space-y-1 overflow-auto rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground">
          {state.details.map((detail, index) => (
            <li key={index}>{detail}</li>
          ))}
        </ul>
      ) : null}

      {state.status === "success" && state.details?.length ? (
        <ul className="max-h-32 space-y-1 overflow-auto rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground">
          {state.details.map((detail, index) => (
            <li key={index}>{detail}</li>
          ))}
        </ul>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Import classes
      </Button>
    </form>
  );
}
