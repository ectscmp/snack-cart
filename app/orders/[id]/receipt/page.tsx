import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PrintButton } from "@/components/snack/print-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { getOrder, getSettings } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Order receipt",
  description: "Printable receipt for a snack order.",
};

export default function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 print:max-w-none print:px-0 print:py-0">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Receipt params={params} />
      </Suspense>
    </main>
  );
}

async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  await connection();

  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    notFound();
  }

  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const order = getOrder(orderId);

  if (!order) {
    notFound();
  }

  if (order.customerId !== user.id && !isStaff(user)) {
    notFound();
  }

  const settings = getSettings();
  const itemCount = order.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link
          href={`/orders/${order.id}`}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 inline size-4" />
          Back to order
        </Link>
        <PrintButton label="Print receipt" />
      </div>

      <article className="space-y-6 rounded-xl border bg-white p-8 text-black print:rounded-none print:border-0 print:p-0 dark:bg-white">
        <header className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-neutral-500">
              {settings.schoolName}
            </p>
            <h1 className="text-2xl font-semibold">Order receipt</h1>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">Order #{order.id}</p>
            <p className="text-neutral-600">
              {formatDateTime(order.placedAt, settings.timezone)}
            </p>
          </div>
        </header>

        <section className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Customer
            </p>
            <p className="font-medium">{order.customerName}</p>
            <p className="text-neutral-600">{order.customerEmail}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Deliver to
            </p>
            <p className="font-medium">Room {order.deliveryRoom}</p>
            <p className="text-neutral-600">{order.className ?? "No class"}</p>
          </div>
        </section>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-200">
                <td className="py-2">{item.productName}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">
                  {formatCents(item.unitPriceCents)}
                </td>
                <td className="py-2 text-right">
                  {formatCents(item.lineTotalCents)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 font-semibold" colSpan={3}>
                Total ({itemCount} {itemCount === 1 ? "item" : "items"})
              </td>
              <td className="pt-3 text-right font-semibold">
                {formatCents(order.subtotalCents)}
              </td>
            </tr>
          </tfoot>
        </table>

        <section className="rounded-lg bg-neutral-100 px-3 py-2 text-sm print:bg-transparent print:px-0">
          <div className="flex justify-between">
            <span className="text-neutral-600">Payment</span>
            <span className="font-semibold">
              {order.paymentStatus === "paid" ? "Paid" : "Due at delivery"}
            </span>
          </div>
          {order.note ? (
            <p className="mt-2 text-neutral-600">Note: {order.note}</p>
          ) : null}
        </section>

        <footer className="border-t pt-3 text-xs text-neutral-500">
          Thank you for ordering from {settings.schoolName}.
        </footer>
      </article>
    </div>
  );
}

function formatDateTime(value: string, timeZone: string): string {
  const date = new Date(`${value.replace(" ", "T")}Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
