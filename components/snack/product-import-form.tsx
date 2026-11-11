"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { importProductsAction } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { idleState } from "@/lib/action-state";

export function ProductImportForm() {
  const [state, formAction, pending] = useActionState(
    importProductsAction,
    idleState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Products imported.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not import that file.");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="products-csv">CSV file</Label>
        <Input
          id="products-csv"
          name="csv"
          type="file"
          accept=".csv,text/csv"
          required
        />
        <p className="text-xs text-muted-foreground">
          Header row: <code className="font-mono">name, category, price</code>.
          Optional columns: <code className="font-mono">description, stock,
          low_stock_threshold, active, image_url</code>. Missing categories are
          created automatically. Price can be <code>1.50</code> or cents
          (<code>150</code>) via <code>price_cents</code>.
        </p>
      </div>

      {state.details?.length ? (
        <ul className="max-h-32 space-y-1 overflow-auto rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground">
          {state.details.map((detail, index) => (
            <li key={index}>{detail}</li>
          ))}
        </ul>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Import products
      </Button>
    </form>
  );
}
