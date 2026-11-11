import { getDb } from "./connection";
import type { Settings } from "./types";

type SettingsRow = {
  school_name: string;
  timezone: string;
  ordering_enabled: number;
  max_items_per_order: number;
  max_open_orders: number;
  delivery_note: string | null;
  admin_group_id: string | null;
  staff_group_id: string | null;
};

export function getSettings(): Settings {
  const row = getDb()
    .prepare(
      `SELECT school_name, timezone, ordering_enabled, max_items_per_order,
              max_open_orders, delivery_note, admin_group_id, staff_group_id
       FROM settings
       WHERE id = 1`,
    )
    .get() as SettingsRow;

  return {
    schoolName: row.school_name,
    timezone: row.timezone,
    orderingEnabled: row.ordering_enabled === 1,
    maxItemsPerOrder: row.max_items_per_order,
    maxOpenOrders: row.max_open_orders,
    deliveryNote: row.delivery_note,
    adminGroupId: row.admin_group_id,
    staffGroupId: row.staff_group_id,
  };
}

export function updateSettings(input: {
  schoolName: string;
  timezone: string;
  orderingEnabled: boolean;
  maxItemsPerOrder: number;
  maxOpenOrders: number;
  deliveryNote?: string | null;
  adminGroupId?: string | null;
  staffGroupId?: string | null;
}): void {
  getDb()
    .prepare(
      `UPDATE settings
       SET school_name = ?, timezone = ?, ordering_enabled = ?,
           max_items_per_order = ?, max_open_orders = ?, delivery_note = ?,
           admin_group_id = ?, staff_group_id = ?,
           updated_at = datetime('now')
       WHERE id = 1`,
    )
    .run(
      input.schoolName,
      input.timezone,
      input.orderingEnabled ? 1 : 0,
      input.maxItemsPerOrder,
      input.maxOpenOrders,
      input.deliveryNote ?? null,
      input.adminGroupId ?? null,
      input.staffGroupId ?? null,
    );
}
