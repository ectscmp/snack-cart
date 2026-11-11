"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import {
  createClass,
  createWindow,
  deleteWindow,
  findClassByEntraGroupId,
  setUserClass,
  setUserRoles,
  updateClass,
  updateSettings,
  updateWindow,
} from "@/lib/db";
import { parseTimeToMinutes } from "@/lib/time";
import type { ActionState } from "@/lib/action-state";
import type { UserRole } from "@/lib/db";

const classIdSchema = z.coerce.number().int().positive();
const windowIdSchema = z.coerce.number().int().positive();
const userIdSchema = z.string().trim().min(1);

const entraGroupIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One or more GUIDs separated by commas, spaces, or semicolons. */
function isValidGroupList(value: string): boolean {
  const ids = value.split(/[\s,;]+/).filter(Boolean);

  return ids.length > 0 && ids.every((id) => entraGroupIdPattern.test(id));
}

const entraGroupIdSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || isValidGroupList(value),
    "Use one or more Entra group object IDs (GUIDs), or leave it blank.",
  )
  .optional();

const classSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  gradeLevel: z.string().trim().max(40).optional(),
  room: z.string().trim().min(1, "Room is required.").max(40),
  teacherName: z.string().trim().max(120).optional(),
  entraGroupId: entraGroupIdSchema,
});

export async function saveClassAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = classSchema.safeParse({
    name: formData.get("name"),
    gradeLevel: formData.get("gradeLevel") ?? undefined,
    room: formData.get("room"),
    teacherName: formData.get("teacherName") ?? undefined,
    entraGroupId: formData.get("entraGroupId") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const id = formData.get("classId");
  let classId: number | undefined;

  if (id) {
    const parsedId = classIdSchema.safeParse(id);

    if (!parsedId.success) {
      return { status: "error", message: "Invalid class." };
    }

    classId = parsedId.data;
  }

  const input = {
    name: parsed.data.name,
    gradeLevel: parsed.data.gradeLevel || null,
    room: parsed.data.room,
    teacherName: parsed.data.teacherName || null,
    entraGroupId: parsed.data.entraGroupId || null,
    active: formData.get("active") === "on",
  };

  if (input.entraGroupId) {
    const conflict = findClassByEntraGroupId(input.entraGroupId, classId);

    if (conflict) {
      return {
        status: "error",
        message: `That Entra group is already assigned to ${conflict.name}.`,
      };
    }
  }

  if (classId !== undefined) {
    updateClass(classId, input);
    refresh();
    return { status: "success", message: "Class updated." };
  }

  createClass(input);
  refresh();
  return { status: "success", message: "Class created." };
}

const windowSchema = z.object({
  classId: z.coerce.number().int().positive(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  start: z.string(),
  end: z.string(),
  label: z.string().trim().max(80).optional(),
});

export async function saveWindowAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = windowSchema.safeParse({
    classId: formData.get("classId"),
    dayOfWeek: formData.get("dayOfWeek"),
    start: formData.get("start"),
    end: formData.get("end"),
    label: formData.get("label") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const startMinute = parseTimeToMinutes(parsed.data.start);
  const endMinute = parseTimeToMinutes(parsed.data.end);

  if (startMinute === null || endMinute === null) {
    return { status: "error", message: "Enter valid start and end times." };
  }

  if (endMinute <= startMinute) {
    return { status: "error", message: "End time must be after the start time." };
  }

  const input = {
    classId: parsed.data.classId,
    dayOfWeek: parsed.data.dayOfWeek,
    startMinute,
    endMinute,
    label: parsed.data.label || null,
    active: formData.get("active") === "on",
  };

  const id = formData.get("windowId");

  if (id) {
    const windowId = windowIdSchema.safeParse(id);

    if (!windowId.success) {
      return { status: "error", message: "Invalid window." };
    }

    updateWindow(windowId.data, input);
    refresh();
    return { status: "success", message: "Window updated." };
  }

  createWindow(input);
  refresh();
  return { status: "success", message: "Window added." };
}

export async function deleteWindowAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const windowId = windowIdSchema.safeParse(formData.get("windowId"));

  if (!windowId.success) {
    return { status: "error", message: "Invalid window." };
  }

  deleteWindow(windowId.data);
  refresh();
  return { status: "success", message: "Window removed." };
}

const roleSchema = z.enum(["customer", "staff", "admin"]);

export async function saveUserAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdmin();
  const userId = userIdSchema.safeParse(formData.get("userId"));

  if (!userId.success) {
    return { status: "error", message: "Missing user." };
  }

  const rawClass = String(formData.get("classId") ?? "").trim();
  const classId = rawClass ? Number(rawClass) : null;

  if (rawClass && (!Number.isInteger(classId) || (classId ?? 0) <= 0)) {
    return { status: "error", message: "Invalid class." };
  }

  const roles = formData
    .getAll("roles")
    .map((role) => roleSchema.safeParse(role))
    .filter((result) => result.success)
    .map((result) => result.data as UserRole);

  // An admin removing their own admin row locks them out of this page, with no
  // way back in except a direct database edit.
  if (userId.data === actor.id && !roles.includes("admin")) {
    return {
      status: "error",
      message:
        "You can't remove your own admin access. Ask another admin to do it.",
    };
  }

  setUserClass(userId.data, classId);
  setUserRoles(userId.data, roles);
  refresh();
  return { status: "success", message: "User updated." };
}

export async function saveSettingsAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const schoolName = String(formData.get("schoolName") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (!schoolName || !timezone) {
    return { status: "error", message: "School name and timezone are required." };
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    return { status: "error", message: "That timezone is not recognized." };
  }

  const adminGroupId = String(formData.get("adminGroupId") ?? "").trim();
  const staffGroupId = String(formData.get("staffGroupId") ?? "").trim();

  for (const [label, value] of [
    ["Admin group", adminGroupId],
    ["Staff group", staffGroupId],
  ] as const) {
    if (value && !isValidGroupList(value)) {
      return {
        status: "error",
        message: `${label} must be one or more Entra group object IDs (GUIDs).`,
      };
    }
  }

  updateSettings({
    schoolName,
    timezone,
    orderingEnabled: formData.get("orderingEnabled") === "on",
    maxItemsPerOrder: Math.max(1, Number(formData.get("maxItemsPerOrder") ?? 10)),
    maxOpenOrders: Math.max(1, Number(formData.get("maxOpenOrders") ?? 1)),
    deliveryNote: String(formData.get("deliveryNote") ?? "").trim() || null,
    adminGroupId: adminGroupId || null,
    staffGroupId: staffGroupId || null,
  });

  refresh();
  return { status: "success", message: "Settings saved." };
}
