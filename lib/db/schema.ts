import type { DatabaseSync } from "node:sqlite";

/**
 * Idempotent schema setup. Every statement is safe to run on an existing
 * database, and columns added after the first release are handled by
 * `ensureColumn` so older `data/app.db` files keep working.
 */
export function migrate(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      grade_level TEXT,
      room TEXT NOT NULL,
      teacher_name TEXT,
      entra_group_id TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      image TEXT,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      room TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('customer', 'staff', 'admin')),
      source TEXT NOT NULL DEFAULT 'manual'
        CHECK (source IN ('manual', 'entra')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, role)
    );

    CREATE TABLE IF NOT EXISTS ordering_windows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      start_minute INTEGER NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
      end_minute INTEGER NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
      label TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      valid_from TEXT,
      valid_to TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS categories_name_lower_idx
      ON categories (lower(name));

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
      category TEXT NOT NULL DEFAULT 'Snacks',
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      image_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS carts (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      cart_id TEXT NOT NULL REFERENCES carts(user_id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (cart_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      class_name TEXT,
      delivery_room TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'awaiting_payment'
        CHECK (status IN ('awaiting_payment', 'pending', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
      payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
      subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
      note TEXT,
      placed_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      delivered_at TEXT,
      delivered_by TEXT REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
      quantity INTEGER NOT NULL CHECK (quantity > 0)
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL
        CHECK (reason IN ('initial', 'restock', 'order', 'cancel', 'adjustment')),
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      note TEXT,
      actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      school_name TEXT NOT NULL DEFAULT 'Snack Cart',
      timezone TEXT NOT NULL DEFAULT 'America/New_York',
      ordering_enabled INTEGER NOT NULL DEFAULT 1,
      max_items_per_order INTEGER NOT NULL DEFAULT 10,
      max_open_orders INTEGER NOT NULL DEFAULT 1,
      delivery_note TEXT,
      admin_group_id TEXT,
      staff_group_id TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO settings (id) VALUES (1);

    -- Start the category list from whatever products already exist.
    INSERT OR IGNORE INTO categories (name)
      SELECT DISTINCT trim(category) FROM products
      WHERE category IS NOT NULL AND trim(category) <> '';
    INSERT OR IGNORE INTO categories (name) VALUES ('Snacks');

    -- Remove the starter's demo table now that the todo feature is gone.
    DROP TABLE IF EXISTS todos;

    CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
    CREATE INDEX IF NOT EXISTS users_class_idx ON users (class_id);
    CREATE INDEX IF NOT EXISTS ordering_windows_class_idx ON ordering_windows (class_id, day_of_week);
    CREATE INDEX IF NOT EXISTS products_active_idx ON products (active);
    CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id);
    CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
    CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);
    CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events (order_id);
    CREATE INDEX IF NOT EXISTS cart_items_cart_idx ON cart_items (cart_id);
    CREATE INDEX IF NOT EXISTS inventory_movements_product_idx ON inventory_movements (product_id);
  `);

  // Columns added after the starter's original `users` table.
  ensureColumn(database, "users", "class_id", "INTEGER REFERENCES classes(id) ON DELETE SET NULL");
  ensureColumn(database, "users", "room", "TEXT");
  ensureColumn(database, "users", "updated_at", "TEXT NOT NULL DEFAULT (datetime('now'))");

  // Entra security group that maps to a class. Created after `ensureColumn`
  // so the index is safe to run against databases from before this feature.
  ensureColumn(database, "classes", "entra_group_id", "TEXT");
  database.exec(`
    DROP INDEX IF EXISTS classes_entra_group_idx;
    CREATE UNIQUE INDEX IF NOT EXISTS classes_entra_group_lower_idx
      ON classes (lower(entra_group_id))
      WHERE entra_group_id IS NOT NULL;
  `);

  // Roles granted by Entra groups are tracked separately so they can be
  // withdrawn at sign-in without touching roles an admin set by hand.
  ensureColumn(database, "user_roles", "source", "TEXT NOT NULL DEFAULT 'manual'");

  // Group-driven admin/staff roles.
  ensureColumn(database, "settings", "admin_group_id", "TEXT");
  ensureColumn(database, "settings", "staff_group_id", "TEXT");

  // Optional subcategories (one level) and product → category links.
  ensureColumn(
    database,
    "categories",
    "parent_id",
    "INTEGER REFERENCES categories(id) ON DELETE RESTRICT",
  );
  ensureColumn(
    database,
    "products",
    "category_id",
    "INTEGER REFERENCES categories(id) ON DELETE SET NULL",
  );

  // Safe to index now that `parent_id` exists on both new and migrated tables.
  database.exec(`
    CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories (parent_id);
  `);

  // Point existing products at the category row with the same name.
  database.exec(`
    UPDATE products
    SET category_id = (
      SELECT id FROM categories WHERE lower(name) = lower(products.category) LIMIT 1
    )
    WHERE category_id IS NULL AND category IS NOT NULL AND category <> '';
  `);

  database
    .prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (1)")
    .run();
}

function ensureColumn(
  database: DatabaseSync,
  table: string,
  column: string,
  definition: string,
) {
  const columns = database
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;

  if (!columns.some((entry) => entry.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }
}
