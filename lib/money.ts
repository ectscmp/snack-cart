export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function parsePriceToCents(value: string): number | null {
  const trimmed = value.trim().replace(/^\$/, "");

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null;
  }

  const [whole, fraction = ""] = trimmed.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));

  return Number.isFinite(cents) ? cents : null;
}
