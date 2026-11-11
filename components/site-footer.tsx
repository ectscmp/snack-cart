import Link from "next/link";
import { ShoppingBasket } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShoppingBasket className="size-3.5" />
          </span>
          <span className="font-medium text-foreground">Snack Cart</span>
          <span className="hidden sm:inline">· Delivered by THM students</span>
        </div>

        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/menu" className="transition-colors hover:text-foreground">
            Menu
          </Link>
          <Link href="/orders" className="transition-colors hover:text-foreground">
            Orders
          </Link>
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
        </nav>

        <p className="text-xs">Pay in person when your order is delivered.</p>
      </div>
    </footer>
  );
}
