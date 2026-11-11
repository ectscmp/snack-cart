import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus, PaymentStatus } from "@/lib/db";

const statusStyles: Record<OrderStatus, { label: string; className: string }> = {
  awaiting_payment: {
    label: "Awaiting payment",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  pending: {
    label: "Queued",
    className: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  preparing: {
    label: "Preparing",
    className: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  out_for_delivery: {
    label: "Out for delivery",
    className: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  delivered: {
    label: "Delivered",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const style = statusStyles[status];

  return (
    <Badge variant="outline" className={cn(style.className, className)}>
      {style.label}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "paid") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        Paid
      </Badge>
    );
  }

  if (status === "refunded") {
    return <Badge variant="outline">Refunded</Badge>;
  }

  return <Badge variant="outline">Unpaid</Badge>;
}

export function statusLabel(status: OrderStatus): string {
  return statusStyles[status].label;
}
