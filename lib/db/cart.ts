import { getDb } from "./connection";
import {
  findProductOption,
  getProductOptionSet,
} from "../product-options";
import type { Cart, CartLine } from "./types";

type CartRow = {
  product_id: number;
  name: string;
  price_cents: number;
  option_value: string;
  option_label: string;
  option_price_cents: number;
  quantity: number;
  stock_quantity: number;
  image_url: string | null;
};

type ResolvedOption = {
  value: string;
  label: string;
  priceDeltaCents: number;
};

const NO_OPTION: ResolvedOption = {
  value: "",
  label: "",
  priceDeltaCents: 0,
};

function resolveCartOption(
  optionSet: string | null,
  optionValue: string | null | undefined,
): ResolvedOption {
  const set = getProductOptionSet(optionSet);

  if (!set) {
    return NO_OPTION;
  }

  const fallback = set.options.find((option) => option.value === "none")?.value;
  const option = findProductOption(set.id, optionValue?.trim() || fallback);

  if (!option) {
    throw new Error(`Choose a ${set.choiceLabel}.`);
  }

  return {
    value: option.value,
    label: option.label,
    priceDeltaCents: option.priceDeltaCents,
  };
}

function ensureCart(userId: string) {
  getDb()
    .prepare("INSERT OR IGNORE INTO carts (user_id) VALUES (?)")
    .run(userId);
}

export function getCart(userId: string): Cart {
  ensureCart(userId);

  const rows = getDb()
    .prepare(
      `SELECT ci.product_id, p.name,
              p.price_cents + ci.option_price_cents AS price_cents,
              ci.option_value, ci.option_label, ci.option_price_cents,
              ci.quantity, p.stock_quantity, p.image_url
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = ?
       ORDER BY ci.added_at ASC, p.name COLLATE NOCASE ASC,
                ci.option_label COLLATE NOCASE ASC`,
    )
    .all(userId) as CartRow[];

  const items: CartLine[] = rows.map((row) => ({
    productId: row.product_id,
    name: row.name,
    priceCents: row.price_cents,
    optionValue: row.option_value,
    optionLabel: row.option_label,
    optionPriceCents: row.option_price_cents,
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

export function addToCart(
  userId: string,
  productId: number,
  quantity: number,
  optionValue?: string | null,
): void {
  const database = getDb();
  ensureCart(userId);

  const product = database
    .prepare(
      "SELECT stock_quantity, active, option_set FROM products WHERE id = ?",
    )
    .get(productId) as
    | { stock_quantity: number; active: number; option_set: string | null }
    | undefined;

  if (!product || product.active !== 1) {
    throw new Error("That snack is not available.");
  }

  if (product.stock_quantity <= 0) {
    throw new Error("That snack is sold out.");
  }

  const option = resolveCartOption(product.option_set, optionValue);
  const requested = Math.max(1, quantity);

  const totals = database
    .prepare(
      `SELECT COALESCE(SUM(quantity), 0) AS total,
              COALESCE(SUM(CASE WHEN option_value = ? THEN quantity ELSE 0 END), 0)
                AS current
       FROM cart_items
       WHERE cart_id = ? AND product_id = ?`,
    )
    .get(option.value, userId, productId) as { total: number; current: number };

  const availableForLine = product.stock_quantity - (totals.total - totals.current);
  const next = Math.min(totals.current + requested, availableForLine, 99);

  if (next < 1) {
    throw new Error("All available stock for that snack is already in your cart.");
  }

  database
    .prepare(
      `INSERT INTO cart_items
         (cart_id, product_id, option_value, option_label, option_price_cents, quantity)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(cart_id, product_id, option_value) DO UPDATE SET
         quantity = excluded.quantity,
         option_label = excluded.option_label,
         option_price_cents = excluded.option_price_cents`,
    )
    .run(
      userId,
      productId,
      option.value,
      option.label,
      option.priceDeltaCents,
      next,
    );

  database
    .prepare("UPDATE carts SET updated_at = datetime('now') WHERE user_id = ?")
    .run(userId);
}

export function setCartQuantity(
  userId: string,
  productId: number,
  optionValue: string,
  quantity: number,
): void {
  const database = getDb();

  if (quantity <= 0) {
    removeFromCart(userId, productId, optionValue);
    return;
  }

  const product = database
    .prepare("SELECT stock_quantity FROM products WHERE id = ?")
    .get(productId) as { stock_quantity: number } | undefined;

  if (!product || product.stock_quantity <= 0) {
    removeFromCart(userId, productId, optionValue);
    return;
  }

  const line = database
    .prepare(
      `SELECT quantity FROM cart_items
       WHERE cart_id = ? AND product_id = ? AND option_value = ?`,
    )
    .get(userId, productId, optionValue) as { quantity: number } | undefined;

  if (!line) {
    return;
  }

  const totals = database
    .prepare(
      `SELECT COALESCE(SUM(quantity), 0) AS total
       FROM cart_items
       WHERE cart_id = ? AND product_id = ?`,
    )
    .get(userId, productId) as { total: number };

  const availableForLine = product.stock_quantity - (totals.total - line.quantity);
  const next = Math.min(quantity, availableForLine, 99);

  if (next < 1) {
    removeFromCart(userId, productId, optionValue);
    return;
  }

  database
    .prepare(
      `UPDATE cart_items SET quantity = ?
       WHERE cart_id = ? AND product_id = ? AND option_value = ?`,
    )
    .run(next, userId, productId, optionValue);
}

export function removeFromCart(
  userId: string,
  productId: number,
  optionValue: string,
): void {
  getDb()
    .prepare(
      `DELETE FROM cart_items
       WHERE cart_id = ? AND product_id = ? AND option_value = ?`,
    )
    .run(userId, productId, optionValue);
}

export function clearCart(userId: string): void {
  getDb().prepare("DELETE FROM cart_items WHERE cart_id = ?").run(userId);
}
