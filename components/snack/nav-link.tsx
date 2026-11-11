"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export function NavLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-muted text-foreground",
        className,
      )}
    >
      {label}
    </Link>
  );
}
