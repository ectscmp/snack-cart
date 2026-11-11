import { getDb } from "./connection";
import type { Cart, CartLine } from "./types";

type CartRow = {
  product_id: number;
  name: string;
  price_cents: number;
  quantity: number;
  stock_quantity: number;
  image_url: string | null;
};

function ensureCart(userId: string) {
  getDb()
    .prepare("INSERT OR IGNORE INTO carts (user_id) VALUES (?)")
    .run(userId);
}

export function getCart(userId: string): Cart {
  ensureCart(userId);

  const rows = getDb()
    .prepare(
      `SELECT ci.product_id, p.name, p.price_cents, ci.quantity,
              p.stock_quantity, p.image_url
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = ?
       ORDER BY ci.added_at ASC, p.name COLLATE NOCASE ASC`,
    )
    .all(userId) as CartRow[];

  const items: CartLine[] = rows.map((row) => ({
    productId: row.product_id,
    name: row.name,
    priceCents: row.price_cents,
    quantity: row.quantity,
    stockQuantity: row.stock_quantity,
    imageUrl: row.image_url,
    lineTotalCents: row.price_cents * row.quantity,
  }));

  return {
    items,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotalCents: items.reduce((total, item) => total + item.lineTotalCents, 0),
  };
}

export function getCartCount(userId: string): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(quantity), 0) AS count
       FROM cart_items
       WHERE cart_id = ?`,
    )
    .get(userId) as { count: number };

  return row.count;
}

export function addToCart(userId: string, productId: number, quantity: number): void {
  const database = getDb();
  ensureCart(userId);

  const product = database
    .prepare("SELECT stock_quantity, active FROM products WHERE id = ?")
    .get(productId) as { stock_quantity: number; active: number } | undefined;

  if (!product || product.active !== 1) {
    throw new Error("That snack is not available.");
  }

  if (product.stock_quantity <= 0) {
    throw new Error("That snack is sold out.");
  }

  const existing = database
    .prepare("SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?")
    .get(userId, productId) as { quantity: number } | undefined;

  const next = Math.min(
    (existing?.quantity ?? 0) + Math.max(1, quantity),
    product.stock_quantity,
    99,
  );

  database
    .prepare(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES (?, ?, ?)
       ON CONFLICT(cart_id, product_id) DO UPDATE SET quantity = excluded.quantity`,
    )
    .run(userId, productId, next);

  database
    .prepare("UPDATE carts SET updated_at = datetime('now') WHERE user_id = ?")
    .run(userId);
}

export function setCartQuantity(
  userId: string,
  productId: number,
  quantity: number,
): void {
  const database = getDb();

  if (quantity <= 0) {
    removeFromCart(userId, productId);
    return;
  }

  const product = database
    .prepare("SELECT stock_quantity FROM products WHERE id = ?")
    .get(productId) as { stock_quantity: number } | undefined;

  if (!product || product.stock_quantity <= 0) {
    removeFromCart(userId, productId);
    return;
  }

  const next = Math.min(quantity, product.stock_quantity, 99);

  database
    .prepare(
      "UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?",
    )
    .run(next, userId, productId);
}

export function removeFromCart(userId: string, productId: number): void {
  getDb()
    .prepare("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?")
    .run(userId, productId);
}

export function clearCart(userId: string): void {
  getDb().prepare("DELETE FROM cart_items WHERE cart_id = ?").run(userId);
}
