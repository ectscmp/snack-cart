import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";

import { PrintButton } from "@/components/snack/print-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth";
import { getClassPickList, getSettings } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Class pick list",
  description: "Items to gather for one class.",
};

export default function PickListPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 print:max-w-none print:px-0 print:py-0">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <PickList params={params} />
      </Suspense>
    </main>
  );
}

async function PickList({ params }: { params: Promise<{ classId: string }> }) {
  await connection();

  await requireStaff();

  const { classId: rawClassId } = await params;
  const classId = Number(rawClassId);

  if (!Number.isInteger(classId) || classId <= 0) {
    notFound();
  }

  const pickList = getClassPickList(classId);

  if (!pickList) {
    return (
      <div className="space-y-4 print:hidden">
        <Link
          href="/staff/pick-lists"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 inline size-4" />
          All pick lists
        </Link>
        <div className="rounded-xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
          This class has no open orders right now.
        </div>
      </div>
    );
  }

  const settings = getSettings();
  const printedAt = new Intl.DateTimeFormat("en-US", {
    timeZone: settings.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link
          href="/staff/pick-lists"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 inline size-4" />
          All pick lists
        </Link>
        <PrintButton label="Print pick list" />
      </div>

      <article className="space-y-6 rounded-xl border bg-white p-8 text-black print:rounded-none print:border-0 print:p-0 dark:bg-white">
        <header className="flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-neutral-500">
              {settings.schoolName}
            </p>
            <h1 className="text-2xl font-semibold">{pickList.className}</h1>
            <p className="flex items-center gap-1 text-sm text-neutral-600">
              <MapPin className="size-3.5" />
              {pickList.room ? `Room ${pickList.room}` : "No room set"}
            </p>
          </div>
          <div className="text-right text-sm text-neutral-600">
            <p className="font-semibold text-black">Pick list</p>
            <p>{printedAt}</p>
          </div>
        </header>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Gather this
          </h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {pickList.items.map((item) => (
                <tr
                  key={item.productName}
                  className="border-b border-neutral-200"
                >
                  <td className="py-2 font-medium">{item.productName}</td>
                  <td className="py-2 text-right text-lg font-semibold tabular-nums">
                    {item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-3 text-sm text-neutral-600">
                  {pickList.orderCount} order
                  {pickList.orderCount === 1 ? "" : "s"} · {pickList.itemCount}{" "}
                  item{pickList.itemCount === 1 ? "" : "s"}
                </td>
                <td className="pt-3 text-right font-semibold">
                  {formatCents(pickList.totalCents)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Hand out
          </h2>
          <div className="space-y-3">
            {pickList.orders.map((order) => (
              <div
                key={order.id}
                className="break-inside-avoid rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-xs text-neutral-500">
                      Order #{order.id} · Room {order.deliveryRoom}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-neutral-300 text-neutral-700"
                    >
                      {order.paymentStatus === "paid" ? "Paid" : "Collect"}
                    </Badge>
                    <span className="font-semibold tabular-nums">
                      {formatCents(order.subtotalCents)}
                    </span>
                  </div>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <span>
                        {item.quantity} × {item.productName}
                      </span>
                      <span className="tabular-nums text-neutral-600">
                        {formatCents(item.lineTotalCents)}
                      </span>
                    </li>
                  ))}
                </ul>
                {order.note ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    Note: {order.note}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t pt-3 text-xs text-neutral-500">
          Collect payment for orders marked “Collect” when you deliver.
        </footer>
      </article>
    </div>
  );
}
