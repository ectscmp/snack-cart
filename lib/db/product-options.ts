import type { DatabaseSync } from "node:sqlite";

import { getDb } from "./connection";
import type {
  ProductOption,
  ProductOptionInput,
  ProductOptionKind,
  ProductOptions,
} from "./types";

type ProductOptionRow = {
  id: number;
  product_id: number;
  kind: ProductOptionKind;
  label: string;
  price_delta_cents: number;
  sort_order: number;
};

function toProductOption(row: ProductOptionRow): ProductOption {
  return {
    id: row.id,
    productId: row.product_id,
    kind: row.kind,
    label: row.label,
    priceDeltaCents: row.price_delta_cents,
    sortOrder: row.sort_order,
  };
}

export function listProductOptions(productId: number): ProductOptions {
  const database = getDb();
  const product = database
    .prepare("SELECT option_prompt FROM products WHERE id = ?")
    .get(productId) as { option_prompt: string | null } | undefined;

  const rows = database
    .prepare(
      `SELECT id, product_id, kind, label, price_delta_cents, sort_order
       FROM product_options
       WHERE product_id = ?
       ORDER BY kind, sort_order, id`,
    )
    .all(productId) as ProductOptionRow[];

  return {
    prompt: product?.option_prompt ?? null,
    choices: rows
      .filter((row) => row.kind === "choice")
      .map(toProductOption),
    addons: rows
      .filter((row) => row.kind === "addon")
      .map(toProductOption),
  };
}

export function listAllProductOptions(): Map<
  number,
  { choices: ProductOption[]; addons: ProductOption[] }
> {
  const rows = getDb()
    .prepare(
      `SELECT id, product_id, kind, label, price_delta_cents, sort_order
       FROM product_options
       ORDER BY product_id, kind, sort_order, id`,
    )
    .all() as ProductOptionRow[];

  const result = new Map<
    number,
    { choices: ProductOption[]; addons: ProductOption[] }
  >();

  for (const row of rows) {
    const entry = result.get(row.product_id) ?? { choices: [], addons: [] };
    const option = toProductOption(row);

    if (row.kind === "choice") {
      entry.choices.push(option);
    } else {
      entry.addons.push(option);
    }

    result.set(row.product_id, entry);
  }

  return result;
}

/**
 * Replaces every option row for a product. Callers must already be inside a
 * transaction when this is part of a larger product update.
 */
export function writeProductOptions(
  database: DatabaseSync,
  productId: number,
  input: {
    prompt?: string | null;
    choices: ProductOptionInput[];
    addons: ProductOptionInput[];
  },
) {
  database
    .prepare("DELETE FROM product_options WHERE product_id = ?")
    .run(productId);

  const insert = database.prepare(
    `INSERT INTO product_options
       (product_id, kind, label, price_delta_cents, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
  );

  const rows = [
    ...input.choices.map((option, index) => ({
      ...option,
      kind: "choice" as const,
      sortOrder: option.sortOrder ?? index,
    })),
    ...input.addons.map((option, index) => ({
      ...option,
      kind: "addon" as const,
      sortOrder: option.sortOrder ?? index,
    })),
  ];

  for (const row of rows) {
    insert.run(
      productId,
      row.kind,
      row.label,
      row.priceDeltaCents,
      row.sortOrder,
    );
  }

  if (input.prompt !== undefined) {
    database
      .prepare("UPDATE products SET option_prompt = ? WHERE id = ?")
      .run(input.prompt || null, productId);
  }
}

export function getProductOptionRows(productId: number): ProductOption[] {
  return getDb()
    .prepare(
      `SELECT id, product_id, kind, label, price_delta_cents, sort_order
       FROM product_options
       WHERE product_id = ?
       ORDER BY kind, sort_order, id`,
    )
    .all(productId)
    .map((row) => toProductOption(row as ProductOptionRow));
}
