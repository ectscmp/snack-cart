import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { migrate } from "./schema";

const databasePath =
  process.env.DATABASE_PATH ?? join(process.cwd(), "data", "app.db");

/**
 * Cache the connection on `globalThis` so Next.js hot reloading does not open a
 * new SQLite handle on every edit.
 */
const globalForDb = globalThis as unknown as {
  sqlite?: DatabaseSync;
};

function connect() {
  if (process.env.RAILWAY_ENVIRONMENT && !databasePath.startsWith("/data")) {
    console.warn(
      `[db] WARNING: RAILWAY_ENVIRONMENT is set but DATABASE_PATH is "${databasePath}". ` +
        "Mount a Railway volume at /data and set DATABASE_PATH=/data/app.db, or the " +
        "database will be wiped on every redeploy.",
    );
  }

  mkdirSync(dirname(databasePath), { recursive: true });

  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  migrate(database);

  return database;
}

export function getDb(): DatabaseSync {
  if (!globalForDb.sqlite) {
    globalForDb.sqlite = connect();
  }

  return globalForDb.sqlite;
}

/**
 * Run a synchronous SQLite transaction. `BEGIN IMMEDIATE` takes the write lock
 * up front, which keeps stock checks and decrements atomic.
 */
export function withTransaction<T>(work: (database: DatabaseSync) => T): T {
  const database = getDb();

  database.exec("BEGIN IMMEDIATE");

  try {
    const result = work(database);
    database.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      database.exec("ROLLBACK");
    } catch {
      // The transaction may already be rolled back by SQLite.
    }
    throw error;
  }
}
