import { getCategory } from "./categories";
import { getDb, withTransaction } from "./connection";
import type { InventoryMovement, Product } from "./types";

type ProductRow = {
  id: number;
  name: string;
  description: string | null;
  price_cents: number;
  category: string;
  category_id: number | null;
  category_name: string | null;
  category_parent_name: string | null;
  image_url: string | null;
  active: number;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
};

type MovementRow = {
  id: number;
  product_id: number;
  product_name: string;
  delta: number;
  reason: InventoryMovement["reason"];
  order_id: number | null;
  note: string | null;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
};

function toProduct(row: ProductRow): Product {
  const category = row.category_name ?? row.category;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    category,
    categoryId: row.category_id,
    categoryParent: row.category_parent_name,
    categoryPath: row.category_parent_name
      ? `${row.category_parent_name} / ${category}`
      : category,
    imageUrl: row.image_url,
    active: row.active === 1,
    stockQuantity: row.stock_quantity,
    lowStockThreshold: row.low_stock_threshold,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMovement(row: MovementRow): InventoryMovement {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    delta: row.delta,
    reason: row.reason,
    orderId: row.order_id,
    note: row.note,
    actorId: row.actor_id,
    actorName: row.actor_name,
    createdAt: row.created_at,
  };
}

const productSelect = `
  SELECT p.id, p.name, p.description, p.price_cents, p.category, p.category_id,
         p.image_url, p.active, p.stock_quantity, p.low_stock_threshold,
         p.created_at, p.updated_at,
         COALESCE(c.name, p.category) AS category_name,
         parent.name AS category_parent_name
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories parent ON parent.id = c.parent_id
`;

export function listProducts(includeInactive = false): Product[] {
  const rows = getDb()
    .prepare(
      `${productSelect}
       ${includeInactive ? "" : "WHERE p.active = 1"}
       ORDER BY COALESCE(parent.name, c.name, p.category) COLLATE NOCASE,
                (c.parent_id IS NOT NULL) ASC,
                c.name COLLATE NOCASE,
                p.name COLLATE NOCASE`,
    )
    .all() as ProductRow[];

  return rows.map(toProduct);
}

export function getProduct(id: number): Product | null {
  const row = getDb()
    .prepare(`${productSelect} WHERE p.id = ?`)
    .get(id) as ProductRow | undefined;

  return row ? toProduct(row) : null;
}

export function createProduct(input: {
  name: string;
  description?: string | null;
  priceCents: number;
  categoryId: number;
  imageUrl?: string | null;
  active?: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  createdBy: string;
}): Product {
  return withTransaction((database) => {
    const category = getCategory(input.categoryId);

    if (!category) {
      throw new Error("Pick a category.");
    }

    const result = database
      .prepare(
        `INSERT INTO products
           (name, description, price_cents, category, category_id, image_url,
            active, stock_quantity, low_stock_threshold, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.name,
        input.description ?? null,
        input.priceCents,
        category.name,
        category.id,
        input.imageUrl ?? null,
        input.active === false ? 0 : 1,
        input.stockQuantity,
        input.lowStockThreshold,
        input.createdBy,
      );

    const id = Number(result.lastInsertRowid);

    if (input.stockQuantity > 0) {
      database
        .prepare(
          `INSERT INTO inventory_movements
             (product_id, delta, reason, actor_id, note)
           VALUES (?, ?, 'initial', ?, 'Initial stock')`,
        )
        .run(id, input.stockQuantity, input.createdBy);
    }

    const created = getProduct(id);

    if (!created) {
      throw new Error("Could not create the product.");
    }

    return created;
  });
}

export function updateProduct(
  id: number,
  input: {
    name: string;
    description?: string | null;
    priceCents: number;
    categoryId: number;
    imageUrl?: string | null;
    active?: boolean;
    lowStockThreshold: number;
  },
): void {
  const category = getCategory(input.categoryId);

  if (!category) {
    throw new Error("Pick a category.");
  }

  getDb()
    .prepare(
      `UPDATE products
       SET name = ?, description = ?, price_cents = ?, category = ?,
           category_id = ?, image_url = ?, active = ?, low_stock_threshold = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      input.name,
      input.description ?? null,
      input.priceCents,
      category.name,
      category.id,
      input.imageUrl ?? null,
      input.active === false ? 0 : 1,
      input.lowStockThreshold,
      id,
    );
}

export function setProductActive(id: number, active: boolean): void {
  getDb()
    .prepare(
      "UPDATE products SET active = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(active ? 1 : 0, id);
}

export function adjustStock(input: {
  productId: number;
  delta: number;
  reason: InventoryMovement["reason"];
  actorId: string;
  note?: string | null;
  orderId?: number | null;
}): Product {
  return withTransaction((database) => {
    const row = database
      .prepare("SELECT stock_quantity FROM products WHERE id = ?")
      .get(input.productId) as { stock_quantity: number } | undefined;

    if (!row) {
      throw new Error("That product no longer exists.");
    }

    const next = row.stock_quantity + input.delta;

    if (next < 0) {
      throw new Error("Stock cannot go below zero.");
    }

    database
      .prepare(
        "UPDATE products SET stock_quantity = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(next, input.productId);

    database
      .prepare(
        `INSERT INTO inventory_movements
           (product_id, delta, reason, order_id, note, actor_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.productId,
        input.delta,
        input.reason,
        input.orderId ?? null,
        input.note ?? null,
        input.actorId,
      );

    const product = getProduct(input.productId);

    if (!product) {
      throw new Error("Could not load the updated product.");
    }

    return product;
  });
}

export function listInventoryMovements(
  limit = 50,
  productId?: number,
): InventoryMovement[] {
  const rows = productId
    ? (getDb()
        .prepare(
          `SELECT m.id, m.product_id, p.name AS product_name, m.delta, m.reason,
                  m.order_id, m.note, m.actor_id, u.name AS actor_name, m.created_at
           FROM inventory_movements m
           JOIN products p ON p.id = m.product_id
           LEFT JOIN users u ON u.id = m.actor_id
           WHERE m.product_id = ?
           ORDER BY m.id DESC
           LIMIT ?`,
        )
        .all(productId, limit) as MovementRow[])
    : (getDb()
        .prepare(
          `SELECT m.id, m.product_id, p.name AS product_name, m.delta, m.reason,
                  m.order_id, m.note, m.actor_id, u.name AS actor_name, m.created_at
           FROM inventory_movements m
           JOIN products p ON p.id = m.product_id
           LEFT JOIN users u ON u.id = m.actor_id
           ORDER BY m.id DESC
           LIMIT ?`,
        )
        .all(limit) as MovementRow[]);

  return rows.map(toMovement);
}

export function getLowStockProducts(): Product[] {
  const rows = getDb()
    .prepare(
      `${productSelect}
       WHERE p.active = 1 AND p.stock_quantity <= p.low_stock_threshold
       ORDER BY p.stock_quantity ASC, p.name COLLATE NOCASE ASC`,
    )
    .all() as ProductRow[];

  return rows.map(toProduct);
}
