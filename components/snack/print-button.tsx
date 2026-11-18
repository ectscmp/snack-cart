"use client";

import { Printer } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";

export function PrintButton({
  label = "Print",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className={cn("print:hidden", className)}
    >
      <Printer className="size-4" />
      {label}
    </Button>
  );
}
