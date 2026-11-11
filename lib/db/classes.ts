import { getDb } from "./connection";
import type { ClassRecord } from "./types";

type ClassRow = {
  id: number;
  name: string;
  grade_level: string | null;
  room: string;
  teacher_name: string | null;
  entra_group_id: string | null;
  active: number;
  created_at: string;
};

const classColumns = `
  id, name, grade_level, room, teacher_name, entra_group_id, active, created_at
`;

function toClass(row: ClassRow): ClassRecord {
  return {
    id: row.id,
    name: row.name,
    gradeLevel: row.grade_level,
    room: row.room,
    teacherName: row.teacher_name,
    entraGroupId: row.entra_group_id,
    active: row.active === 1,
    createdAt: row.created_at,
  };
}

export function listClasses(includeInactive = false): ClassRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT ${classColumns}
       FROM classes
       ${includeInactive ? "" : "WHERE active = 1"}
       ORDER BY name COLLATE NOCASE ASC`,
    )
    .all() as ClassRow[];

  return rows.map(toClass);
}

export function getClass(id: number): ClassRecord | null {
  const row = getDb()
    .prepare(
      `SELECT ${classColumns}
       FROM classes
       WHERE id = ?`,
    )
    .get(id) as ClassRow | undefined;

  return row ? toClass(row) : null;
}

function groupIdsOf(value: string | null): string[] {
  return (value ?? "")
    .split(/[\s,;]+/)
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Finds a class that already claims any of the supplied group IDs. Used by the
 * admin form to stop two classes from matching the same Entra group.
 */
export function findClassByEntraGroupId(
  entraGroupId: string,
  excludeClassId?: number,
): ClassRecord | null {
  const wanted = new Set(groupIdsOf(entraGroupId));

  if (wanted.size === 0) {
    return null;
  }

  const rows = getDb()
    .prepare(
      `SELECT ${classColumns}
       FROM classes
       WHERE entra_group_id IS NOT NULL
         AND (? IS NULL OR id != ?)`,
    )
    .all(excludeClassId ?? null, excludeClassId ?? null) as ClassRow[];

  const match = rows.find((row) =>
    groupIdsOf(row.entra_group_id).some((id) => wanted.has(id)),
  );

  return match ? toClass(match) : null;
}

/**
 * Picks the active class whose Entra group the user belongs to. A class may
 * list several group IDs (comma-separated); if the user matches more than one
 * class, the first class by name wins so the result is stable.
 */
export function findClassByEntraGroups(
  entraGroupIds: string[],
): ClassRecord | null {
  if (entraGroupIds.length === 0) {
    return null;
  }

  const membership = new Set(
    entraGroupIds.map((id) => id.trim().toLowerCase()),
  );

  const rows = getDb()
    .prepare(
      `SELECT ${classColumns}
       FROM classes
       WHERE active = 1 AND entra_group_id IS NOT NULL
       ORDER BY name COLLATE NOCASE ASC`,
    )
    .all() as ClassRow[];

  const match = rows.find((row) =>
    groupIdsOf(row.entra_group_id).some((id) => membership.has(id)),
  );

  return match ? toClass(match) : null;
}

export function createClass(input: {
  name: string;
  gradeLevel?: string | null;
  room?: string;
  teacherName?: string | null;
  entraGroupId?: string | null;
  active?: boolean;
}): ClassRecord {
  const result = getDb()
    .prepare(
      `INSERT INTO classes (name, grade_level, room, teacher_name, entra_group_id, active)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name,
      input.gradeLevel ?? null,
      input.room ?? "",
      input.teacherName ?? null,
      input.entraGroupId ?? null,
      input.active === false ? 0 : 1,
    );

  const created = getClass(Number(result.lastInsertRowid));

  if (!created) {
    throw new Error("Could not create the class.");
  }

  return created;
}

export function updateClass(
  id: number,
  input: {
    name: string;
    gradeLevel?: string | null;
    room?: string;
    teacherName?: string | null;
    entraGroupId?: string | null;
    active?: boolean;
  },
): void {
  getDb()
    .prepare(
      `UPDATE classes
       SET name = ?, grade_level = ?, room = ?, teacher_name = ?,
           entra_group_id = ?, active = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      input.name,
      input.gradeLevel ?? null,
      input.room ?? "",
      input.teacherName ?? null,
      input.entraGroupId ?? null,
      input.active === false ? 0 : 1,
      id,
    );
}

export function countClassMembers(classId: number): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM users WHERE class_id = ?")
    .get(classId) as { count: number };

  return row.count;
}
