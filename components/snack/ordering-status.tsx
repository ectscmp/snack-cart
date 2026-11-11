import Link from "next/link";
import {
  CircleAlert,
  CircleCheck,
  Clock,
  PauseCircle,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getOrderingStatus } from "@/lib/db";
import { formatWindow } from "@/lib/time";

type Tone = "open" | "warn" | "neutral";

const toneStyles: Record<Tone, string> = {
  open: "bg-pine/10 text-pine",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  neutral: "bg-muted text-muted-foreground",
};

function StatusCard({
  tone = "neutral",
  icon: Icon,
  title,
  description,
  action,
}: {
  tone?: Tone;
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string; variant?: "default" | "outline" };
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            toneStyles[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          {action ? (
            <Button
              asChild
              size="sm"
              variant={action.variant ?? "default"}
              className="mt-4"
            >
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export async function OrderingStatus() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <StatusCard
        icon={UserRound}
        title="Sign in to order"
        description="Use your school Microsoft account to see your class ordering window."
        action={{ href: "/sign-in", label: "Sign in" }}
      />
    );
  }

  const status = getOrderingStatus(user);

  if (status.open) {
    return (
      <StatusCard
        tone="open"
        icon={CircleCheck}
        title="Ordering is open"
        description={
          status.reason === "staff"
            ? "Staff can place orders outside the normal window."
            : status.window
              ? `${status.window.label ?? "Your class window"} · ${formatWindow(
                  status.window.dayOfWeek,
                  status.window.startMinute,
                  status.window.endMinute,
                )}`
              : "Your class can order right now."
        }
        action={{ href: "/menu", label: "Browse snacks" }}
      />
    );
  }

  if (status.reason === "disabled") {
    return (
      <StatusCard
        tone="warn"
        icon={PauseCircle}
        title="Ordering is paused"
        description="An administrator has paused ordering for the whole school."
        action={{ href: "/menu", label: "Preview the menu", variant: "outline" }}
      />
    );
  }

  if (status.reason === "no-class") {
    return (
      <StatusCard
        tone="warn"
        icon={CircleAlert}
        title="No class assigned"
        description="Ask an administrator to add you to your class before ordering."
      />
    );
  }

  return (
    <StatusCard
      icon={Clock}
      title="Ordering is closed"
      description={
        status.nextWindow
          ? `Your next window is ${formatWindow(
              status.nextWindow.dayOfWeek,
              status.nextWindow.startMinute,
              status.nextWindow.endMinute,
            )}.`
          : "There is no upcoming ordering window for your class."
      }
      action={{ href: "/menu", label: "Preview the menu", variant: "outline" }}
    />
  );
}
