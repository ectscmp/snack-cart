import { findClassByEntraGroups } from "./classes";
import { getDb, withTransaction } from "./connection";
import type { AppUser, UserRole } from "./types";

type UserRow = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  class_id: number | null;
  room: string | null;
  created_at: string;
  class_name: string | null;
  class_room: string | null;
  roles?: string | null;
};

const ROLES: UserRole[] = ["customer", "staff", "admin"];

function parseRoles(value: string | null | undefined): UserRole[] {
  if (!value) {
    return ["customer"];
  }

  const roles = value
    .split(",")
    .map((role) => role.trim())
    .filter((role): role is UserRole => ROLES.includes(role as UserRole));

  return roles.length > 0 ? Array.from(new Set(roles)) : ["customer"];
}

function toAppUser(row: UserRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image,
    classId: row.class_id,
    className: row.class_name,
    classRoom: row.class_room,
    room: row.room,
    roles: parseRoles(row.roles),
    createdAt: row.created_at,
  };
}

const userSelect = `
  SELECT
    u.id,
    u.email,
    u.name,
    u.image,
    u.class_id,
    u.room,
    u.created_at,
    c.name AS class_name,
    c.room AS class_room,
    GROUP_CONCAT(r.role) AS roles
  FROM users u
  LEFT JOIN classes c ON c.id = u.class_id
  LEFT JOIN user_roles r ON r.user_id = u.id
`;

export function getUser(id: string): AppUser | null {
  const row = getDb()
    .prepare(`${userSelect} WHERE u.id = ? GROUP BY u.id`)
    .get(id) as UserRow | undefined;

  return row ? toAppUser(row) : null;
}

export function getUserByEmail(email: string): AppUser | null {
  const row = getDb()
    .prepare(`${userSelect} WHERE lower(u.email) = lower(?) GROUP BY u.id`)
    .get(email) as UserRow | undefined;

  return row ? toAppUser(row) : null;
}

export function listUsers(query?: string): AppUser[] {
  const trimmed = query?.trim();
  const rows = trimmed
    ? (getDb()
        .prepare(
          `${userSelect}
           WHERE u.name LIKE ? OR u.email LIKE ?
           GROUP BY u.id
           ORDER BY u.name COLLATE NOCASE ASC`,
        )
        .all(`%${trimmed}%`, `%${trimmed}%`) as UserRow[])
    : (getDb()
        .prepare(`${userSelect} GROUP BY u.id ORDER BY u.name COLLATE NOCASE ASC`)
        .all() as UserRow[]);

  return rows.map(toAppUser);
}

/**
 * Creates or refreshes the local profile for a signed-in Microsoft account.
 * The Entra object id is the stable key; email and display name can change.
 */
export function ensureUser(input: {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}): AppUser {
  const database = getDb();

  database
    .prepare(
      `INSERT INTO users (id, email, name, image)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         name = excluded.name,
         image = excluded.image,
         last_seen_at = datetime('now'),
         updated_at = datetime('now')`,
    )
    .run(input.id, input.email, input.name, input.image ?? null);

  // Everyone can buy snacks. Staff/admin are additive.
  database
    .prepare(
      "INSERT OR IGNORE INTO user_roles (user_id, role, source) VALUES (?, 'customer', 'manual')",
    )
    .run(input.id);

  // Bootstrap the first administrators without needing an existing admin.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.includes(input.email.trim().toLowerCase())) {
    database
      .prepare(
        "INSERT OR IGNORE INTO user_roles (user_id, role, source) VALUES (?, 'admin', 'manual')",
      )
      .run(input.id);
  }

  const user = getUser(input.id);

  if (!user) {
    throw new Error("Could not load the signed-in user.");
  }

  return user;
}

export function setUserClass(userId: string, classId: number | null): void {
  getDb()
    .prepare("UPDATE users SET class_id = ?, updated_at = datetime('now') WHERE id = ?")
    .run(classId, userId);
}

/**
 * Applies the class mapped to one of the user's Entra security groups. Runs on
 * every sign-in, so group membership is the source of truth. When no group
 * matches, the existing class is left alone — teachers and staff usually are
 * not in a class group and may have been assigned by an admin.
 */
export function syncUserClassFromGroups(
  userId: string,
  entraGroupIds: string[],
): number | null {
  const classRecord = findClassByEntraGroups(entraGroupIds);

  if (!classRecord) {
    return null;
  }

  const row = getDb()
    .prepare("SELECT class_id FROM users WHERE id = ?")
    .get(userId) as { class_id: number | null } | undefined;

  if (!row) {
    return null;
  }

  if (row.class_id !== classRecord.id) {
    setUserClass(userId, classRecord.id);
  }

  return classRecord.id;
}

export function setUserRoom(userId: string, room: string | null): void {
  getDb()
    .prepare("UPDATE users SET room = ?, updated_at = datetime('now') WHERE id = ?")
    .run(room, userId);
}

export function setUserRoles(userId: string, roles: UserRole[]): void {
  const nextRoles = Array.from(new Set<UserRole>(["customer", ...roles]));

  withTransaction((database) => {
    // Only manual grants are replaced. Roles synced from Entra groups are left
    // in place; group membership owns those.
    database
      .prepare(
        "DELETE FROM user_roles WHERE user_id = ? AND source = 'manual'",
      )
      .run(userId);

    const insert = database.prepare(
      "INSERT OR IGNORE INTO user_roles (user_id, role, source) VALUES (?, ?, 'manual')",
    );

    for (const role of nextRoles) {
      insert.run(userId, role);
    }
  });
}

/**
 * Grants or revokes the `admin`/`staff` roles from Entra group membership.
 * Runs on every sign-in. `adminGroupId`/`staffGroupId` accept a comma-, space-,
 * or semicolon-separated list so one role can be driven by several groups.
 * Only rows with `source = 'entra'` are touched, so a role granted by hand in
 * Admin → Users (or by ADMIN_EMAILS) always survives.
 */
export function syncUserRolesFromGroups(
  userId: string,
  entraGroupIds: string[],
  groups: { adminGroupId: string | null; staffGroupId: string | null },
): UserRole[] {
  const membership = new Set(entraGroupIds.map((id) => id.toLowerCase()));

  const matches = (value: string | null): boolean =>
    (value ?? "")
      .split(/[\s,;]+/)
      .map((id) => id.trim().toLowerCase())
      .filter(Boolean)
      .some((id) => membership.has(id));

  const desired = new Set<UserRole>();

  if (matches(groups.adminGroupId)) {
    desired.add("admin");
  }

  if (matches(groups.staffGroupId)) {
    desired.add("staff");
  }

  withTransaction((database) => {
    database
      .prepare(
        "DELETE FROM user_roles WHERE user_id = ? AND source = 'entra'",
      )
      .run(userId);

    const insert = database.prepare(
      "INSERT OR IGNORE INTO user_roles (user_id, role, source) VALUES (?, ?, 'entra')",
    );

    for (const role of desired) {
      insert.run(userId, role);
    }
  });

  return Array.from(desired);
}

export function hasRole(user: AppUser, role: UserRole): boolean {
  return user.roles.includes(role);
}

export function isStaff(user: AppUser): boolean {
  return user.roles.includes("staff") || user.roles.includes("admin");
}

export function isAdmin(user: AppUser): boolean {
  return user.roles.includes("admin");
}
