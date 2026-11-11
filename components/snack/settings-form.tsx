"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { saveSettingsAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/action-state";
import type { Settings } from "@/lib/db";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, idleState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Settings saved.");
    } else if (state.status === "error") {
      toast.error(state.message ?? "Could not save settings.");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="schoolName">School name</Label>
          <Input
            id="schoolName"
            name="schoolName"
            defaultValue={settings.schoolName}
            required
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue={settings.timezone}
            placeholder="America/New_York"
            required
          />
          <p className="text-xs text-muted-foreground">
            IANA name used to evaluate ordering windows.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxItemsPerOrder">Max items per order</Label>
          <Input
            id="maxItemsPerOrder"
            name="maxItemsPerOrder"
            type="number"
            min={1}
            defaultValue={settings.maxItemsPerOrder}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxOpenOrders">Max open orders per person</Label>
          <Input
            id="maxOpenOrders"
            name="maxOpenOrders"
            type="number"
            min={1}
            defaultValue={settings.maxOpenOrders}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="deliveryNote">Delivery note shown at checkout</Label>
          <Textarea
            id="deliveryNote"
            name="deliveryNote"
            defaultValue={settings.deliveryNote ?? ""}
            rows={2}
            maxLength={300}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminGroupId">Entra admin group ID</Label>
          <Input
            id="adminGroupId"
            name="adminGroupId"
            defaultValue={settings.adminGroupId ?? ""}
            placeholder="00000000-0000-0000-0000-000000000000"
            maxLength={64}
            spellCheck={false}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            One or more group object IDs, separated by commas. Members get the
            admin role at sign-in. Leave blank to manage admins by hand and with
            ADMIN_EMAILS.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="staffGroupId">Entra staff group ID</Label>
          <Input
            id="staffGroupId"
            name="staffGroupId"
            defaultValue={settings.staffGroupId ?? ""}
            placeholder="00000000-0000-0000-0000-000000000000"
            maxLength={64}
            spellCheck={false}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            One or more group object IDs, separated by commas. Members get the
            staff role at sign-in. Leaving every group removes it again; roles
            set by hand are never touched.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="orderingEnabled"
          defaultChecked={settings.orderingEnabled}
          className="size-4 rounded border"
        />
        Ordering enabled globally
      </label>

      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Save settings
      </Button>
    </form>
  );
}
