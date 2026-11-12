"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBasket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CartFabClient({ count }: { count: number }) {
  const pathname = usePathname();

  if (pathname === "/cart" || pathname.startsWith("/cart/")) {
    return null;
  }

  return (
    <Link href="/cart" className="fixed bottom-4 right-4 z-50 print:hidden">
      <Button
        size="lg"
        className="h-12 gap-2 rounded-full shadow-lg shadow-primary/20"
      >
        <ShoppingBasket className="size-5" />
        <span className="hidden sm:inline">Cart</span>
        {count > 0 ? (
          <Badge variant="secondary" className="ml-0.5 min-w-5 justify-center">
            {count}
          </Badge>
        ) : null}
      </Button>
    </Link>
  );
}
