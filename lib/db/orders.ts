import { getDb, withTransaction } from "./connection";
import { getUser } from "./users";
import type {
  Order,
  OrderEvent,
  OrderItem,
  OrderStatus,
  PaymentStatus,
} from "./types";

type OrderRow = {
  id: number;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  class_id: number | null;
  class_name: string | null;
  delivery_room: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_cents: number;
  note: string | null;
  placed_at: string;
  updated_at: string;
  expires_at: string | null;
  delivered_at: string | null;
  delivered_by: string | null;
};

type OrderItemRow = {
  id: number;
  product_id: number | null;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
};

type OrderEventRow = {
  id: number;
  order_id: number;
  status: OrderStatus;
  actor_id: string | null;
  actor_name: string | null;
  note: string | null;
  created_at: string;
};

const orderSelect = `
  SELECT id, customer_id, customer_name, customer_email, class_id, class_name,
         delivery_room, status, payment_status, subtotal_cents, note,
         placed_at, updated_at, expires_at, delivered_at, delivered_by
  FROM orders
`;

function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    unitPriceCents: row.unit_price_cents,
    quantity: row.quantity,
    lineTotalCents: row.unit_price_cents * row.quantity,
  };
}

function toOrderEvent(row: OrderEventRow): OrderEvent {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    actorId: row.actor_id,
    actorName: row.actor_name,
    note: row.note,
    createdAt: row.created_at,
  };
}

function toOrder(row: OrderRow, items: OrderItem[], events: OrderEvent[]): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    classId: row.class_id,
    className: row.class_name,
    deliveryRoom: row.delivery_room,
    status: row.status,
    paymentStatus: row.payment_status,
    subtotalCents: row.subtotal_cents,
    note: row.note,
    placedAt: row.placed_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    deliveredAt: row.delivered_at,
    deliveredBy: row.delivered_by,
    items,
    events,
  };
}

export function getOrder(id: number): Order | null {
  const database = getDb();
  const row = database
    .prepare(`${orderSelect} WHERE id = ?`)
    .get(id) as OrderRow | undefined;

  if (!row) {
    return null;
  }

  const items = (
    database
      .prepare(
        `SELECT id, product_id, product_name, unit_price_cents, quantity
         FROM order_items
         WHERE order_id = ?
         ORDER BY id`,
      )
      .all(id) as OrderItemRow[]
  ).map(toOrderItem);

  const events = (
    database
      .prepare(
        `SELECT e.id, e.order_id, e.status, e.actor_id, u.name AS actor_name,
                e.note, e.created_at
         FROM order_events e
         LEFT JOIN users u ON u.id = e.actor_id
         WHERE e.order_id = ?
         ORDER BY e.id ASC`,
      )
      .all(id) as OrderEventRow[]
  ).map(toOrderEvent);

  return toOrder(row, items, events);
}

function listOrders(where: string, params: Array<string | number>, limit = 100): Order[] {
  const rows = getDb()
    .prepare(`${orderSelect} WHERE ${where} ORDER BY id DESC LIMIT ?`)
    .all(...params, limit) as OrderRow[];

  return rows
    .map((row) => getOrder(row.id))
    .filter((order): order is Order => order !== null);
}

export function listOrdersForUser(userId: string): Order[] {
  return listOrders("customer_id = ?", [userId]);
}

export function listStaffQueue(): Order[] {
  return listOrders(
    "status IN ('pending', 'preparing', 'out_for_delivery')",
    [],
  );
}

export function listCompletedOrders(): Order[] {
  return listOrders("status IN ('delivered', 'cancelled')", []);
}

export function listAllOrders(): Order[] {
  return listOrders("1 = 1", [], 200);
}

export function listOrdersAwaitingPayment(userId: string): Order[] {
  return listOrders("customer_id = ? AND status = 'awaiting_payment'", [userId]);
}

/**
 * Convert the signed-in user's cart into an order and take stock in the same
 * transaction. If any line is short on stock, nothing is written.
 */
export function createOrderFromCart(
  userId: string,
  input: {
    deliveryRoom: string;
    note?: string | null;
  },
): Order {
  const orderId = withTransaction((database) => {
    const user = getUser(userId);

    if (!user) {
      throw new Error("Could not load your account.");
    }

    const lines = database
      .prepare(
        `SELECT ci.product_id, ci.quantity, p.name, p.price_cents,
                p.stock_quantity, p.active
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         WHERE ci.cart_id = ?
         ORDER BY ci.added_at ASC`,
      )
      .all(userId) as Array<{
      product_id: number;
      quantity: number;
      name: string;
      price_cents: number;
      stock_quantity: number;
      active: number;
    }>;

    if (lines.length === 0) {
      throw new Error("Your cart is empty.");
    }

    let subtotal = 0;

    for (const line of lines) {
      if (line.active !== 1) {
        throw new Error(`${line.name} is no longer available.`);
      }

      if (line.quantity > line.stock_quantity) {
        throw new Error(
          `Only ${line.stock_quantity} of ${line.name} are left. Update your cart.`,
        );
      }

      subtotal += line.price_cents * line.quantity;
    }

    const result = database
      .prepare(
        `INSERT INTO orders
           (customer_id, customer_name, customer_email, class_id, class_name,
            delivery_room, status, payment_status, subtotal_cents, note)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?, ?)`,
      )
      .run(
        user.id,
        user.name,
        user.email,
        user.classId,
        user.className,
        input.deliveryRoom,
        subtotal,
        input.note ?? null,
      );

    const id = Number(result.lastInsertRowid);

    const insertItem = database.prepare(
      `INSERT INTO order_items
         (order_id, product_id, product_name, unit_price_cents, quantity)
       VALUES (?, ?, ?, ?, ?)`,
    );

    const takeStock = database.prepare(
      `UPDATE products
       SET stock_quantity = stock_quantity - ?, updated_at = datetime('now')
       WHERE id = ? AND stock_quantity >= ?`,
    );

    const insertMovement = database.prepare(
      `INSERT INTO inventory_movements
         (product_id, delta, reason, order_id, note, actor_id)
       VALUES (?, ?, 'order', ?, 'Order placed', ?)`,
    );

    for (const line of lines) {
      insertItem.run(id, line.product_id, line.name, line.price_cents, line.quantity);

      const update = takeStock.run(line.quantity, line.product_id, line.quantity);

      if (update.changes !== 1) {
        throw new Error(`${line.name} just sold out. Please update your cart.`);
      }

      insertMovement.run(line.product_id, -line.quantity, id, userId);
    }

    database
      .prepare(
        "INSERT INTO order_events (order_id, status, actor_id, note) VALUES (?, 'pending', ?, 'Order placed')",
      )
      .run(id, userId);

    database.prepare("DELETE FROM cart_items WHERE cart_id = ?").run(userId);

    return id;
  });

  const order = getOrder(orderId);

  if (!order) {
    throw new Error("Could not load the new order.");
  }

  return order;
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ["pending", "cancelled"],
  pending: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function updateOrderStatus(
  orderId: number,
  nextStatus: OrderStatus,
  actorId: string | null,
  note?: string | null,
): Order {
  withTransaction((database) => {
    const row = database
      .prepare("SELECT status FROM orders WHERE id = ?")
      .get(orderId) as { status: OrderStatus } | undefined;

    if (!row) {
      throw new Error("That order no longer exists.");
    }

    if (!ALLOWED_TRANSITIONS[row.status].includes(nextStatus)) {
      throw new Error(`Cannot move an order from ${row.status} to ${nextStatus}.`);
    }

    if (nextStatus === "cancelled") {
      const items = database
        .prepare(
          "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
        )
        .all(orderId) as Array<{ product_id: number | null; quantity: number }>;

      const restock = database.prepare(
        "UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = datetime('now') WHERE id = ?",
      );
      const movement = database.prepare(
        `INSERT INTO inventory_movements
           (product_id, delta, reason, order_id, note, actor_id)
         VALUES (?, ?, 'cancel', ?, 'Order cancelled', ?)`,
      );

      for (const item of items) {
        if (item.product_id === null) {
          continue;
        }

        restock.run(item.quantity, item.product_id);
        movement.run(item.product_id, item.quantity, orderId, actorId);
      }
    }

    database
      .prepare(
        `UPDATE orders
         SET status = ?,
             updated_at = datetime('now'),
             delivered_at = CASE WHEN ? = 'delivered' THEN datetime('now') ELSE delivered_at END,
             delivered_by = CASE WHEN ? = 'delivered' THEN ? ELSE delivered_by END
         WHERE id = ?`,
      )
      .run(nextStatus, nextStatus, nextStatus, actorId, orderId);

    database
      .prepare(
        "INSERT INTO order_events (order_id, status, actor_id, note) VALUES (?, ?, ?, ?)",
      )
      .run(orderId, nextStatus, actorId, note ?? null);
  });

  const order = getOrder(orderId);

  if (!order) {
    throw new Error("Could not load the updated order.");
  }

  return order;
}

export function markOrderPaid(orderId: number, actorId: string | null): Order {
  withTransaction((database) => {
    const row = database
      .prepare("SELECT status, payment_status FROM orders WHERE id = ?")
      .get(orderId) as { status: OrderStatus; payment_status: PaymentStatus } | undefined;

    if (!row) {
      throw new Error("That order no longer exists.");
    }

    const nextStatus: OrderStatus =
      row.status === "awaiting_payment" ? "pending" : row.status;

    database
      .prepare(
        `UPDATE orders
         SET payment_status = 'paid', status = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(nextStatus, orderId);

    database
      .prepare(
        "INSERT INTO order_events (order_id, status, actor_id, note) VALUES (?, ?, ?, 'Payment received')",
      )
      .run(orderId, nextStatus, actorId);
  });

  const order = getOrder(orderId);

  if (!order) {
    throw new Error("Could not load the paid order.");
  }

  return order;
}

export function cancelExpiredOrders(): number {
  const rows = getDb()
    .prepare(
      `SELECT id FROM orders
       WHERE status = 'awaiting_payment'
         AND expires_at IS NOT NULL
         AND expires_at < ?`,
    )
    .all(new Date().toISOString()) as Array<{ id: number }>;

  for (const row of rows) {
    try {
      updateOrderStatus(row.id, "cancelled", null, "Payment window expired");
    } catch {
      // Another request may have changed the order first.
    }
  }

  return rows.length;
}

const OPEN_ORDER_STATUSES = "'pending', 'preparing', 'out_for_delivery'";

export type ClassPickListSummary = {
  classId: number;
  className: string;
  room: string | null;
  orderCount: number;
  itemCount: number;
  totalCents: number;
};

export type ClassPickList = {
  classId: number;
  className: string;
  room: string | null;
  /** Quantity per product across every open order for the class. */
  items: Array<{ productName: string; quantity: number }>;
  orders: Order[];
  orderCount: number;
  itemCount: number;
  totalCents: number;
};

export function listOpenPickListSummaries(): ClassPickListSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT o.class_id,
              COALESCE(o.class_name, c.name, 'Class ' || o.class_id) AS class_name,
              c.room AS room,
              COUNT(DISTINCT o.id) AS order_count,
              COALESCE(SUM(oi.quantity), 0) AS item_count,
              COALESCE(SUM(oi.quantity * oi.unit_price_cents), 0) AS total_cents
       FROM orders o
       LEFT JOIN classes c ON c.id = o.class_id
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.class_id IS NOT NULL
         AND o.status IN (${OPEN_ORDER_STATUSES})
       GROUP BY o.class_id
       ORDER BY class_name COLLATE NOCASE ASC`,
    )
    .all() as Array<{
    class_id: number;
    class_name: string;
    room: string | null;
    order_count: number;
    item_count: number;
    total_cents: number;
  }>;

  return rows.map((row) => ({
    classId: row.class_id,
    className: row.class_name,
    room: row.room,
    orderCount: row.order_count,
    itemCount: row.item_count,
    totalCents: row.total_cents,
  }));
}

/**
 * Everything THM needs to gather for one class before walking over: combined
 * quantities plus the individual orders so they can hand items to each student.
 */
export function getClassPickList(classId: number): ClassPickList | null {
  const orders = listOrders(
    `class_id = ? AND status IN (${OPEN_ORDER_STATUSES})`,
    [classId],
  );

  if (orders.length === 0) {
    return null;
  }

  const classRow = getDb()
    .prepare("SELECT name, room FROM classes WHERE id = ?")
    .get(classId) as { name: string; room: string } | undefined;

  const totals = new Map<string, number>();
  let itemCount = 0;
  let totalCents = 0;

  for (const order of orders) {
    for (const item of order.items) {
      totals.set(
        item.productName,
        (totals.get(item.productName) ?? 0) + item.quantity,
      );
      itemCount += item.quantity;
      totalCents += item.lineTotalCents;
    }
  }

  return {
    classId,
    className: orders[0].className ?? classRow?.name ?? `Class ${classId}`,
    room: classRow?.room || orders[0].deliveryRoom,
    items: Array.from(totals, ([productName, quantity]) => ({
      productName,
      quantity,
    })).sort((a, b) => a.productName.localeCompare(b.productName)),
    orders,
    orderCount: orders.length,
    itemCount,
    totalCents,
  };
}

export function getOrderStats() {
  const row = getDb()
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN status IN ('pending', 'preparing', 'out_for_delivery') THEN 1 ELSE 0 END), 0) AS open,
         COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0) AS delivered,
         COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN subtotal_cents ELSE 0 END), 0) AS revenue_cents
       FROM orders`,
    )
    .get() as {
    total: number;
    open: number;
    delivered: number;
    revenue_cents: number;
  };

  return {
    total: row.total,
    open: row.open,
    delivered: row.delivered,
    revenueCents: row.revenue_cents,
  };
}
