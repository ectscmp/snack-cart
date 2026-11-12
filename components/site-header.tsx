import { Suspense } from "react";
import Link from "next/link";
import { ShoppingBasket } from "lucide-react";

import { AuthMenu } from "@/components/auth/auth-menu";
import { NavLinks } from "@/components/snack/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingBasket className="size-4" />
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight">
            Snack Cart
          </span>
        </Link>

        <div className="hidden md:block">
          <Suspense
            fallback={
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16" />
              </div>
            }
          >
            <NavLinks />
          </Suspense>
        </div>

        <div className="flex items-center gap-1.5">
          <Suspense fallback={<Skeleton className="h-9 w-24 rounded-lg" />}>
            <AuthMenu />
          </Suspense>
          <ThemeToggle />
        </div>
      </div>

      <div className="border-t md:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2">
          <Suspense fallback={<Skeleton className="h-8 w-16" />}>
            <NavLinks />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
