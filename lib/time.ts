const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type ZonedParts = {
  dayOfWeek: number;
  minutes: number;
  date: string;
};

/**
 * Read the wall-clock day and minute-of-day in the school's timezone.
 * `hourCycle: "h23"` avoids the 24:00 edge case some locales produce.
 */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );

  const dayOfWeek = WEEKDAY_INDEX[values.weekday] ?? 0;
  const hour = Number(values.hour ?? 0);
  const minute = Number(values.minute ?? 0);

  return {
    dayOfWeek,
    minutes: hour * 60 + minute,
    date: `${values.year}-${values.month}-${values.day}`,
  };
}

export function weekdayLabel(dayOfWeek: number): string {
  return WEEKDAY_LABELS[dayOfWeek] ?? "Sun";
}

export function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.min(1440, minutes));
  const hour24 = Math.floor(safe / 60);
  const minute = safe % 60;
  const hour12 = hour24 % 12 || 12;
  const suffix = hour24 >= 12 ? "PM" : "AM";

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatWindow(dayOfWeek: number, startMinute: number, endMinute: number) {
  return `${weekdayLabel(dayOfWeek)} ${formatMinutes(startMinute)}–${formatMinutes(endMinute)}`;
}

export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour > 23 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
}

export function minutesToTimeInput(minutes: number): string {
  const safe = Math.max(0, Math.min(1439, minutes));

  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function weekdayOptions() {
  return WEEKDAY_LABELS.map((label, value) => ({ label, value }));
}
