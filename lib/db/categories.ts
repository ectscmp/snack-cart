import { getDb, withTransaction } from "./connection";
import type { Category, CategoryWithUsage } from "./types";

type CategoryRow = {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
};

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
  };
}

export function listCategories(): Category[] {
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.name, c.parent_id, c.sort_order
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       ORDER BY COALESCE(p.name, c.name) COLLATE NOCASE ASC,
                c.parent_id IS NOT NULL ASC,
                c.name COLLATE NOCASE ASC`,
    )
    .all() as CategoryRow[];

  return rows.map(toCategory);
}

export function listCategoriesWithUsage(): CategoryWithUsage[] {
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.name, c.parent_id, c.sort_order,
              (SELECT COUNT(*) FROM products p
               WHERE p.category_id = c.id
                  OR p.category_id IN (
                       SELECT child.id FROM categories child
                       WHERE child.parent_id = c.id
                     )
                  OR (p.category_id IS NULL
                      AND lower(p.category) = lower(c.name))
              ) AS product_count
       FROM categories c
       LEFT JOIN categories parent ON parent.id = c.parent_id
       ORDER BY COALESCE(parent.name, c.name) COLLATE NOCASE ASC,
                c.parent_id IS NOT NULL ASC,
                c.name COLLATE NOCASE ASC`,
    )
    .all() as Array<CategoryRow & { product_count: number }>;

  return rows.map((row) => ({
    ...toCategory(row),
    productCount: row.product_count,
  }));
}

export function getCategory(id: number): Category | null {
  const row = getDb()
    .prepare(
      "SELECT id, name, parent_id, sort_order FROM categories WHERE id = ?",
    )
    .get(id) as CategoryRow | undefined;

  return row ? toCategory(row) : null;
}

/** "Parent / Child" for a subcategory, otherwise just the category name. */
export function getCategoryPath(id: number): string | null {
  const row = getDb()
    .prepare(
      `SELECT c.name, p.name AS parent_name
       FROM categories c
       LEFT JOIN categories p ON p.id = c.parent_id
       WHERE c.id = ?`,
    )
    .get(id) as { name: string; parent_name: string | null } | undefined;

  if (!row) {
    return null;
  }

  return row.parent_name ? `${row.parent_name} / ${row.name}` : row.name;
}

function hasChildren(id: number): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS present FROM categories WHERE parent_id = ? LIMIT 1")
    .get(id) as { present: number } | undefined;

  return Boolean(row);
}

function assertParent(parentId: number | null, childId?: number) {
  if (parentId === null) {
    return;
  }

  if (childId !== undefined && parentId === childId) {
    throw new Error("A category cannot be its own parent.");
  }

  const parent = getCategory(parentId);

  if (!parent) {
    throw new Error("That parent category no longer exists.");
  }

  if (parent.parentId !== null) {
    throw new Error("Subcategories can only be one level deep.");
  }
}

export function createCategory(
  name: string,
  parentId: number | null = null,
): Category {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("A category name is required.");
  }

  const existing = getDb()
    .prepare("SELECT id FROM categories WHERE lower(name) = lower(?)")
    .get(trimmed) as { id: number } | undefined;

  if (existing) {
    throw new Error(`"${trimmed}" already exists.`);
  }

  assertParent(parentId);

  const result = getDb()
    .prepare("INSERT INTO categories (name, parent_id) VALUES (?, ?)")
    .run(trimmed, parentId);

  const created = getCategory(Number(result.lastInsertRowid));

  if (!created) {
    throw new Error("Could not create the category.");
  }

  return created;
}

/**
 * Renames a category and optionally moves it under a parent. Products follow
 * because they point at the category id.
 */
export function updateCategory(
  id: number,
  input: { name: string; parentId: number | null },
): void {
  const trimmed = input.name.trim();

  if (!trimmed) {
    throw new Error("A category name is required.");
  }

  withTransaction((database) => {
    const current = database
      .prepare("SELECT id FROM categories WHERE id = ?")
      .get(id) as { id: number } | undefined;

    if (!current) {
      throw new Error("That category no longer exists.");
    }

    const conflict = database
      .prepare(
        "SELECT id FROM categories WHERE lower(name) = lower(?) AND id != ?",
      )
      .get(trimmed, id) as { id: number } | undefined;

    if (conflict) {
      throw new Error(`"${trimmed}" already exists.`);
    }

    if (input.parentId !== null && hasChildren(id)) {
      throw new Error(
        "Move or delete its subcategories before making this a subcategory.",
      );
    }

    assertParent(input.parentId, id);

    database
      .prepare("UPDATE categories SET name = ?, parent_id = ? WHERE id = ?")
      .run(trimmed, input.parentId, id);

    // Keep the legacy text column in sync for older rows and exports.
    database
      .prepare(
        `UPDATE products SET category = ?, updated_at = datetime('now')
         WHERE category_id = ?`,
      )
      .run(trimmed, id);
  });
}

export function deleteCategory(id: number): void {
  withTransaction((database) => {
    const current = database
      .prepare("SELECT name FROM categories WHERE id = ?")
      .get(id) as { name: string } | undefined;

    if (!current) {
      return;
    }

    if (hasChildren(id)) {
      throw new Error("Delete its subcategories first.");
    }

    const row = database
      .prepare(
        `SELECT COUNT(*) AS count FROM products
         WHERE category_id = ?
            OR (category_id IS NULL AND lower(category) = lower(?))`,
      )
      .get(id, current.name) as { count: number };

    if (row.count > 0) {
      throw new Error(
        `"${current.name}" is used by ${row.count} product${
          row.count === 1 ? "" : "s"
        }. Move or delete those products first.`,
      );
    }

    database.prepare("DELETE FROM categories WHERE id = ?").run(id);
  });
}
