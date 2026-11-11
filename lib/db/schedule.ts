import { getDb } from "./connection";
import { getSettings } from "./settings";
import { isStaff } from "./users";
import type { AppUser, OrderingStatus, OrderingWindow } from "./types";
import { getZonedParts, type ZonedParts } from "@/lib/time";

type WindowRow = {
  id: number;
  class_id: number;
  class_name: string;
  day_of_week: number;
  start_minute: number;
  end_minute: number;
  label: string | null;
  active: number;
  valid_from: string | null;
  valid_to: string | null;
};

function toWindow(row: WindowRow): OrderingWindow {
  return {
    id: row.id,
    classId: row.class_id,
    className: row.class_name,
    dayOfWeek: row.day_of_week,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
    label: row.label,
    active: row.active === 1,
    validFrom: row.valid_from,
    validTo: row.valid_to,
  };
}

export function listWindows(classId?: number): OrderingWindow[] {
  const rows = classId
    ? (getDb()
        .prepare(
          `SELECT w.id, w.class_id, c.name AS class_name, w.day_of_week,
                  w.start_minute, w.end_minute, w.label, w.active,
                  w.valid_from, w.valid_to
           FROM ordering_windows w
           JOIN classes c ON c.id = w.class_id
           WHERE w.class_id = ?
           ORDER BY w.day_of_week, w.start_minute`,
        )
        .all(classId) as WindowRow[])
    : (getDb()
        .prepare(
          `SELECT w.id, w.class_id, c.name AS class_name, w.day_of_week,
                  w.start_minute, w.end_minute, w.label, w.active,
                  w.valid_from, w.valid_to
           FROM ordering_windows w
           JOIN classes c ON c.id = w.class_id
           ORDER BY c.name COLLATE NOCASE, w.day_of_week, w.start_minute`,
        )
        .all() as WindowRow[]);

  return rows.map(toWindow);
}

export function getWindow(id: number): OrderingWindow | null {
  const row = getDb()
    .prepare(
      `SELECT w.id, w.class_id, c.name AS class_name, w.day_of_week,
              w.start_minute, w.end_minute, w.label, w.active,
              w.valid_from, w.valid_to
       FROM ordering_windows w
       JOIN classes c ON c.id = w.class_id
       WHERE w.id = ?`,
    )
    .get(id) as WindowRow | undefined;

  return row ? toWindow(row) : null;
}

export function createWindow(input: {
  classId: number;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  label?: string | null;
  active?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}): OrderingWindow {
  const result = getDb()
    .prepare(
      `INSERT INTO ordering_windows
         (class_id, day_of_week, start_minute, end_minute, label, active, valid_from, valid_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.classId,
      input.dayOfWeek,
      input.startMinute,
      input.endMinute,
      input.label ?? null,
      input.active === false ? 0 : 1,
      input.validFrom ?? null,
      input.validTo ?? null,
    );

  const created = getWindow(Number(result.lastInsertRowid));

  if (!created) {
    throw new Error("Could not create the ordering window.");
  }

  return created;
}

export function updateWindow(
  id: number,
  input: {
    classId: number;
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    label?: string | null;
    active?: boolean;
    validFrom?: string | null;
    validTo?: string | null;
  },
): void {
  getDb()
    .prepare(
      `UPDATE ordering_windows
       SET class_id = ?, day_of_week = ?, start_minute = ?, end_minute = ?,
           label = ?, active = ?, valid_from = ?, valid_to = ?
       WHERE id = ?`,
    )
    .run(
      input.classId,
      input.dayOfWeek,
      input.startMinute,
      input.endMinute,
      input.label ?? null,
      input.active === false ? 0 : 1,
      input.validFrom ?? null,
      input.validTo ?? null,
      id,
    );
}

export function deleteWindow(id: number): void {
  getDb().prepare("DELETE FROM ordering_windows WHERE id = ?").run(id);
}

export function getOrderingStatus(user: AppUser, now = new Date()): OrderingStatus {
  const settings = getSettings();

  if (!settings.orderingEnabled) {
    return { open: false, reason: "disabled", window: null, nextWindow: null };
  }

  // Staff and admins can place test orders outside a window.
  if (isStaff(user)) {
    return { open: true, reason: "staff", window: null, nextWindow: null };
  }

  if (!user.classId) {
    return { open: false, reason: "no-class", window: null, nextWindow: null };
  }

  const parts = getZonedParts(now, settings.timezone);
  const windows = listWindows(user.classId).filter(
    (window) => window.active && isWindowValidOn(window, parts.date),
  );

  const current = windows.find(
    (window) =>
      window.dayOfWeek === parts.dayOfWeek &&
      parts.minutes >= window.startMinute &&
      parts.minutes < window.endMinute,
  );

  if (current) {
    return { open: true, reason: "window", window: current, nextWindow: null };
  }

  return {
    open: false,
    reason: "outside-window",
    window: null,
    nextWindow: findNextWindow(windows, parts),
  };
}

function isWindowValidOn(window: OrderingWindow, date: string): boolean {
  if (window.validFrom && date < window.validFrom) {
    return false;
  }

  if (window.validTo && date > window.validTo) {
    return false;
  }

  return true;
}

function findNextWindow(
  windows: OrderingWindow[],
  parts: ZonedParts,
): OrderingWindow | null {
  for (let offset = 0; offset <= 7; offset += 1) {
    const day = (parts.dayOfWeek + offset) % 7;
    const candidates = windows
      .filter((window) => window.dayOfWeek === day)
      .sort((a, b) => a.startMinute - b.startMinute);

    for (const candidate of candidates) {
      if (offset === 0 && candidate.startMinute <= parts.minutes) {
        continue;
      }

      return candidate;
    }
  }

  return null;
}
